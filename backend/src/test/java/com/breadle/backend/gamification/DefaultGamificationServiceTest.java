package com.breadle.backend.gamification;

import com.breadle.backend.education.TeacherClass;
import com.breadle.backend.education.TeacherClassMemberRepository;
import com.breadle.backend.education.TeacherClassRepository;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DefaultGamificationServiceTest {

    private UsuarioRepository usuarioRepository;
    private TeacherClassRepository teacherClassRepository;
    private TeacherClassMemberRepository memberRepository;
    private EducationalClassPointsRepository educationalPointsRepository;
    private DefaultGamificationService service;
    private Usuario student;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        teacherClassRepository = mock(TeacherClassRepository.class);
        memberRepository = mock(TeacherClassMemberRepository.class);
        educationalPointsRepository = mock(EducationalClassPointsRepository.class);
        service = new DefaultGamificationService(
            usuarioRepository, teacherClassRepository, memberRepository, educationalPointsRepository);

        Usuario teacher = user(10L, TipoUsuario.PROFESSOR, "teacher@example.com", 0);
        student = user(20L, TipoUsuario.LEITOR, "student@example.com", 45);
        TeacherClass teacherClass = new TeacherClass();
        teacherClass.setId(100L);
        teacherClass.setTeacherId(teacher.getId());

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(teacher.getEmail(), "", List.of()));
        when(usuarioRepository.findByEmail(teacher.getEmail())).thenReturn(Optional.of(teacher));
        when(usuarioRepository.findById(student.getId())).thenReturn(Optional.of(student));
        when(teacherClassRepository.findById(100L)).thenReturn(Optional.of(teacherClass));
        when(memberRepository.existsByClassIdAndStudentId(100L, student.getId())).thenReturn(true);
        when(educationalPointsRepository.findByClassIdAndStudentId(100L, student.getId()))
            .thenReturn(Optional.of(new EducationalClassPoints(1L, 100L, student.getId(), 12)));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void personalBalanceStaysIndependentFromEducationalPoints() {
        long educationalBalance = service.grantEducationalPoints(100L, 20L, 12);

        assertEquals(12, educationalBalance);
        assertEquals(45, student.getPontosTotais());
        verify(educationalPointsRepository).addPoints(100L, 20L, 12);
        verify(usuarioRepository, never()).save(org.mockito.ArgumentMatchers.any(Usuario.class));
        verify(usuarioRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any(Usuario.class));
    }

    @Test
    void nonMemberCannotReceiveEducationalPoints() {
        when(memberRepository.existsByClassIdAndStudentId(100L, 20L)).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> service.grantEducationalPoints(100L, 20L, 12));

        verify(educationalPointsRepository, never()).addPoints(100L, 20L, 12);
    }

    @Test
    void teacherCannotGrantPointsInAnotherTeachersClass() {
        TeacherClass otherTeachersClass = new TeacherClass();
        otherTeachersClass.setId(100L);
        otherTeachersClass.setTeacherId(11L);
        when(teacherClassRepository.findById(100L)).thenReturn(Optional.of(otherTeachersClass));

        assertThrows(AccessDeniedException.class, () -> service.grantEducationalPoints(100L, 20L, 12));

        verify(educationalPointsRepository, never()).addPoints(100L, 20L, 12);
        verify(memberRepository, never()).existsByClassIdAndStudentId(100L, 20L);
    }

    private Usuario user(Long id, TipoUsuario type, String email, int personalPoints) {
        Usuario user = new Usuario();
        user.setId(id);
        user.setTipo(type);
        user.setNome(email);
        user.setEmail(email);
        user.setPontosTotais(personalPoints);
        return user;
    }
}
