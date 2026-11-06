package com.breadle.backend.education;

import com.breadle.backend.entity.Leitura;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.gamification.EducationalClassPoints;
import com.breadle.backend.gamification.EducationalClassPointsRepository;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@SpringBootTest
@Transactional
class EducationDashboardRepositoryIntegrationTest {

    @Autowired
    private EducationService educationService;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private TeacherClassRepository teacherClassRepository;
    @Autowired
    private TeacherClassMemberRepository memberRepository;
    @Autowired
    private EducationalClassPointsRepository educationalPointsRepository;
    @Autowired
    private LeituraRepository leituraRepository;

    @Test
    void teacherDashboardPagesOnlyItsStudentsAndAggregatesTheirProgress() {
        Usuario teacherA = saveUser(TipoUsuario.PROFESSOR, "teacher-a");
        Usuario teacherB = saveUser(TipoUsuario.PROFESSOR, "teacher-b");
        Usuario studentA1 = saveUser(TipoUsuario.LEITOR, "student-a1");
        Usuario studentA2 = saveUser(TipoUsuario.LEITOR, "student-a2");
        Usuario studentB = saveUser(TipoUsuario.LEITOR, "student-b");
        TeacherClass classA = saveClass(teacherA, "class-a");
        TeacherClass classB = saveClass(teacherB, "class-b");
        join(classA, studentA1);
        join(classA, studentA2);
        join(classB, studentB);
        educationalPointsRepository.save(new EducationalClassPoints(null, classA.getId(), studentA1.getId(), 10));
        educationalPointsRepository.save(new EducationalClassPoints(null, classA.getId(), studentA2.getId(), 20));
        educationalPointsRepository.save(new EducationalClassPoints(null, classB.getId(), studentB.getId(), 1000));
        Leitura completedReading = new Leitura();
        completedReading.setLeitorId(studentA1.getId());
        completedReading.setLivroId(1L);
        completedReading.setConcluida(true);
        leituraRepository.save(completedReading);

        TeacherDashboardResponse firstPage = educationService.buildTeacherDashboard(teacherA, 0, 1);
        TeacherDashboardResponse secondPage = educationService.buildTeacherDashboard(teacherA, 1, 1);

        assertEquals(2, firstPage.getTotalAlunos());
        assertEquals(1, firstPage.getAlunosAtivos());
        assertEquals(1, firstPage.getLivrosConcluidos());
        assertEquals(15, firstPage.getMediaPontosEducacionais());
        assertEquals(0, firstPage.getPage());
        assertEquals(1, firstPage.getSize());
        assertEquals(true, firstPage.isHasNext());
        assertEquals("student-a2", firstPage.getTopAlunos().getFirst().getNome());
        assertEquals(1, secondPage.getPage());
        assertFalse(secondPage.isHasNext());
        assertEquals("student-a1", secondPage.getTopAlunos().getFirst().getNome());
        assertEquals(1, secondPage.getTopAlunos().getFirst().getLivrosConcluidos());
    }

    @Test
    void administratorDashboardIncludesAllReadersWhileTeacherRemainsScoped() {
        Usuario teacherA = saveUser(TipoUsuario.PROFESSOR, "scope-teacher-a");
        Usuario teacherB = saveUser(TipoUsuario.PROFESSOR, "scope-teacher-b");
        Usuario studentA = saveUser(TipoUsuario.LEITOR, "scope-student-a");
        Usuario studentB = saveUser(TipoUsuario.LEITOR, "scope-student-b");
        Usuario unassignedStudent = saveUser(TipoUsuario.LEITOR, "scope-student-unassigned");
        studentA.setPontosTotais(5);
        studentB.setPontosTotais(15);
        unassignedStudent.setPontosTotais(30);
        usuarioRepository.saveAll(List.of(studentA, studentB, unassignedStudent));

        TeacherClass classA = saveClass(teacherA, "scope-class-a");
        TeacherClass classB = saveClass(teacherB, "scope-class-b");
        join(classA, studentA);
        join(classB, studentB);

        Leitura completedReading = new Leitura();
        completedReading.setLeitorId(studentA.getId());
        completedReading.setLivroId(1L);
        completedReading.setConcluida(true);
        leituraRepository.save(completedReading);

        Leitura unassignedCompletedReading = new Leitura();
        unassignedCompletedReading.setLeitorId(unassignedStudent.getId());
        unassignedCompletedReading.setLivroId(2L);
        unassignedCompletedReading.setConcluida(true);
        leituraRepository.save(unassignedCompletedReading);

        TeacherDashboardResponse teacherResponse = educationService.buildTeacherDashboard(teacherA, 0, 20);
        Usuario administrator = saveUser(TipoUsuario.ADMINISTRADOR, "scope-admin");
        TeacherDashboardResponse adminFirstPage = educationService.buildTeacherDashboard(administrator, 0, 2);
        TeacherDashboardResponse adminSecondPage = educationService.buildTeacherDashboard(administrator, 1, 2);

        assertEquals(1, teacherResponse.getTotalAlunos());
        assertEquals(List.of("scope-student-a"),
            teacherResponse.getTopAlunos().stream().map(StudentProgressDto::getNome).toList());
        assertEquals(3, adminFirstPage.getTotalAlunos());
        assertEquals(2, adminFirstPage.getAlunosAtivos());
        assertEquals(2, adminFirstPage.getLivrosConcluidos());
        assertEquals(17, adminFirstPage.getMediaPontosEducacionais());
        assertEquals(List.of("scope-student-unassigned", "scope-student-b"),
            adminFirstPage.getTopAlunos().stream().map(StudentProgressDto::getNome).toList());
        assertEquals(true, adminFirstPage.isHasNext());
        assertEquals(List.of("scope-student-a"),
            adminSecondPage.getTopAlunos().stream().map(StudentProgressDto::getNome).toList());
        assertFalse(adminSecondPage.isHasNext());
    }

    private Usuario saveUser(TipoUsuario type, String suffix) {
        Usuario user = new Usuario();
        user.setTipo(type);
        user.setNome(suffix);
        user.setEmail(suffix + "@example.test");
        user.setSenhaHash("hashed-password");
        return usuarioRepository.save(user);
    }

    private TeacherClass saveClass(Usuario teacher, String suffix) {
        TeacherClass teacherClass = new TeacherClass();
        teacherClass.setTeacherId(teacher.getId());
        teacherClass.setName(suffix);
        teacherClass.setInvitationCodeHash(suffix + "-unique-hash");
        return teacherClassRepository.save(teacherClass);
    }

    private void join(TeacherClass teacherClass, Usuario student) {
        TeacherClassMember member = new TeacherClassMember();
        member.setClassId(teacherClass.getId());
        member.setStudentId(student.getId());
        memberRepository.save(member);
    }
}
