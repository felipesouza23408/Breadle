package com.breadle.backend.education;

import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.common.ConflictException;
import com.breadle.backend.common.ResourceNotFoundException;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EducationService {

    private final UsuarioRepository usuarioRepository;
    private final TeacherClassRepository teacherClassRepository;
    private final TeacherClassMemberRepository memberRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public EducationService(UsuarioRepository usuarioRepository,
                            TeacherClassRepository teacherClassRepository,
                            TeacherClassMemberRepository memberRepository) {
        this.usuarioRepository = usuarioRepository;
        this.teacherClassRepository = teacherClassRepository;
        this.memberRepository = memberRepository;
    }

    public TeacherDashboardResponse buildTeacherDashboard(Usuario requester, int page, int size) {
        if (requester.getTipo() != TipoUsuario.PROFESSOR
            && requester.getTipo() != TipoUsuario.ADMINISTRADOR) {
            throw new IllegalArgumentException("Apenas professores e administradores podem acessar o painel docente.");
        }

        if (page < 0 || size < 1 || size > 50) {
            throw new IllegalArgumentException("Página deve ser zero ou maior e tamanho deve estar entre 1 e 50.");
        }

        boolean administrator = requester.getTipo() == TipoUsuario.ADMINISTRADOR;
        List<Long> classIds = List.of();
        TeacherDashboardAggregate aggregate;
        Page<TeacherStudentProgressProjection> studentsPage;
        if (administrator) {
            aggregate = usuarioRepository.aggregateAllReaderProgress();
            studentsPage = usuarioRepository.findAllReaderProgress(PageRequest.of(page, size));
        } else {
            List<TeacherClass> classes =
                teacherClassRepository.findByTeacherIdOrderByIdDesc(requester.getId());
            if (classes.isEmpty()) {
                return new TeacherDashboardResponse(0, 0, 0, 0, List.of(), page, size, false);
            }
            classIds = classes.stream().map(TeacherClass::getId).toList();
            aggregate = memberRepository.aggregateDashboardForClasses(classIds);
            studentsPage = usuarioRepository.findTeacherStudentProgress(classIds, PageRequest.of(page, size));
        }

        List<StudentProgressDto> students = studentsPage.getContent().stream()
            .map(student -> {
                long points = student.getPontosEducacionais();
                int weeklyProgress = (int) Math.min(100, Math.round((points / 300f) * 100));
                return new StudentProgressDto(
                    student.getUserId(),
                    student.getNome(),
                    student.getEmail(),
                    points,
                    student.getLivrosConcluidos(),
                    weeklyProgress
                );
            })
            .toList();

        long totalStudents = aggregate.getTotalAlunos();
        long totalPoints = aggregate.getTotalPontosEducacionais();
        long averagePoints = totalStudents == 0 ? 0 : administrator
            ? Math.round(totalPoints / (float) totalStudents)
            : totalPoints / totalStudents;
        return new TeacherDashboardResponse(
            Math.toIntExact(totalStudents),
            Math.toIntExact(aggregate.getAlunosAtivos()),
            aggregate.getLivrosConcluidos(),
            averagePoints,
            students,
            page,
            size,
            studentsPage.hasNext()
        );
    }

    public CreatedTeacherClassDto createClass(Usuario teacher, String requestedName) {
        requireTeacher(teacher);
        String name = requestedName == null ? "" : requestedName.trim();
        if (name.isBlank() || name.length() > 80) {
            throw new IllegalArgumentException("Informe um nome de turma com até 80 caracteres.");
        }

        String invitationCode;
        String invitationCodeHash;
        do {
            byte[] randomCode = new byte[16];
            secureRandom.nextBytes(randomCode);
            invitationCode = Base64.getUrlEncoder().withoutPadding().encodeToString(randomCode);
            invitationCodeHash = hashInvitationCode(invitationCode);
        } while (teacherClassRepository.existsByInvitationCodeHash(invitationCodeHash));

        TeacherClass teacherClass = new TeacherClass();
        teacherClass.setTeacherId(teacher.getId());
        teacherClass.setName(name);
        teacherClass.setInvitationCodeHash(invitationCodeHash);
        teacherClass = teacherClassRepository.save(teacherClass);
        return new CreatedTeacherClassDto(
            teacherClass.getId(),
            teacherClass.getName(),
            invitationCode,
            teacherClass.getCreatedAt()
        );
    }

    public List<TeacherClassDto> listClasses(Usuario teacher) {
        requireTeacher(teacher);
        List<TeacherClass> classes = teacherClassRepository.findByTeacherIdOrderByIdDesc(teacher.getId());
        if (classes.isEmpty()) {
            return List.of();
        }
        List<Long> classIds = classes.stream().map(TeacherClass::getId).toList();
        Map<Long, Long> memberCounts = memberRepository.findByClassIdIn(classIds).stream()
            .collect(Collectors.groupingBy(TeacherClassMember::getClassId, Collectors.counting()));
        return classes.stream()
            .map(teacherClass -> new TeacherClassDto(
                teacherClass.getId(),
                teacherClass.getName(),
                Math.toIntExact(memberCounts.getOrDefault(teacherClass.getId(), 0L)),
                teacherClass.getCreatedAt()
            ))
            .toList();
    }

    public JoinTeacherClassResponse joinClass(Usuario student, String submittedCode) {
        if (student.getTipo() != TipoUsuario.LEITOR) {
            throw new IllegalArgumentException("Somente leitores podem entrar em uma turma.");
        }
        String code = submittedCode == null ? "" : submittedCode.trim();
        if (code.isBlank() || code.length() > 64) {
            throw new IllegalArgumentException("Código de convite inválido.");
        }
        TeacherClass teacherClass = teacherClassRepository.findByInvitationCodeHash(hashInvitationCode(code))
            .orElseThrow(() -> new ResourceNotFoundException("Código de convite inválido ou inexistente."));
        if (memberRepository.existsByClassIdAndStudentId(teacherClass.getId(), student.getId())) {
            throw new ConflictException("Você já faz parte desta turma.");
        }

        TeacherClassMember member = new TeacherClassMember();
        member.setClassId(teacherClass.getId());
        member.setStudentId(student.getId());
        try {
            memberRepository.save(member);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Você já faz parte desta turma.");
        }
        return new JoinTeacherClassResponse(teacherClass.getName());
    }

    static String hashInvitationCode(String code) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 não está disponível.", exception);
        }
    }

    private void requireTeacher(Usuario user) {
        if (user.getTipo() != TipoUsuario.PROFESSOR) {
            throw new IllegalArgumentException("Somente professores podem gerenciar turmas.");
        }
    }

}
