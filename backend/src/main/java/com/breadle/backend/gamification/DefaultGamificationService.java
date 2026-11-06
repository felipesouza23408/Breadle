package com.breadle.backend.gamification;

import com.breadle.backend.education.TeacherClass;
import com.breadle.backend.education.TeacherClassMemberRepository;
import com.breadle.backend.education.TeacherClassRepository;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultGamificationService implements GamificationService {

    private final UsuarioRepository usuarioRepository;
    private final TeacherClassRepository teacherClassRepository;
    private final TeacherClassMemberRepository memberRepository;
    private final EducationalClassPointsRepository educationalPointsRepository;

    public DefaultGamificationService(UsuarioRepository usuarioRepository,
                                      TeacherClassRepository teacherClassRepository,
                                      TeacherClassMemberRepository memberRepository,
                                      EducationalClassPointsRepository educationalPointsRepository) {
        this.usuarioRepository = usuarioRepository;
        this.teacherClassRepository = teacherClassRepository;
        this.memberRepository = memberRepository;
        this.educationalPointsRepository = educationalPointsRepository;
    }

    @Override
    public int calculateReadingPoints(int pagesRead, int baseBookPoints, boolean completed) {
        int basic = pagesRead * baseBookPoints;
        int bonus = completed ? (baseBookPoints * 2) : 0;
        return normalizeScore(basic + bonus);
    }

    @Override
    public int calculateMissionProgress(int currentProgress, int target) {
        if (target <= 0) {
            return 0;
        }
        return normalizeScore((currentProgress * 100) / target);
    }

    @Override
    @Transactional
    public long grantEducationalPoints(Long classId, Long studentId, int points) {
        if (classId == null || studentId == null || points <= 0) {
            throw new IllegalArgumentException("Turma, aluno e pontuação positiva são obrigatórios.");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
            || authentication.getName() == null) {
            throw new AccessDeniedException("Autenticação necessária para conceder pontos educacionais.");
        }
        Usuario requester = usuarioRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new AccessDeniedException("Usuário autenticado não encontrado."));
        if (requester.getTipo() != TipoUsuario.PROFESSOR) {
            throw new AccessDeniedException("Somente o professor responsável pode conceder pontos educacionais.");
        }

        TeacherClass teacherClass = teacherClassRepository.findById(classId)
            .orElseThrow(() -> new IllegalArgumentException("Turma não encontrada."));
        if (!requester.getId().equals(teacherClass.getTeacherId())) {
            throw new AccessDeniedException("Você não pode conceder pontos nesta turma.");
        }

        Usuario student = usuarioRepository.findById(studentId)
            .orElseThrow(() -> new IllegalArgumentException("Aluno não encontrado."));
        if (student.getTipo() != TipoUsuario.LEITOR
            || !memberRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw new IllegalArgumentException("O aluno não pertence a esta turma.");
        }

        educationalPointsRepository.addPoints(classId, studentId, points);
        return educationalPointsRepository.findByClassIdAndStudentId(classId, studentId)
            .map(EducationalClassPoints::getPoints)
            .orElseThrow(() -> new IllegalStateException("Saldo educacional não foi persistido."));
    }
}
