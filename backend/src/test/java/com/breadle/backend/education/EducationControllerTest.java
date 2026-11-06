package com.breadle.backend.education;

import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EducationControllerTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void teacherDashboardRejectsInvalidPageAndSize() {
        EducationService service = mock(EducationService.class);
        UsuarioRepository users = mock(UsuarioRepository.class);
        Usuario teacher = new Usuario();
        teacher.setTipo(TipoUsuario.PROFESSOR);
        when(users.findByEmail("teacher@example.com")).thenReturn(Optional.of(teacher));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("teacher@example.com", "ignored"));

        EducationController controller = new EducationController(service, users);

        assertEquals(HttpStatus.BAD_REQUEST, controller.teacherDashboard(-1, 20).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.teacherDashboard(0, 0).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.teacherDashboard(0, 51).getStatusCode());
        verifyNoInteractions(service);
    }

    @Test
    void teacherDashboardAllowsTeachersAndAdministrators() {
        EducationService service = mock(EducationService.class);
        UsuarioRepository users = mock(UsuarioRepository.class);
        EducationController controller = new EducationController(service, users);

        for (TipoUsuario role : new TipoUsuario[] {TipoUsuario.PROFESSOR, TipoUsuario.ADMINISTRADOR}) {
            Usuario user = new Usuario();
            user.setTipo(role);
            String email = role.name().toLowerCase() + "@example.com";
            when(users.findByEmail(email)).thenReturn(Optional.of(user));
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, "ignored"));

            assertEquals(HttpStatus.OK, controller.teacherDashboard(0, 20).getStatusCode());
            verify(service).buildTeacherDashboard(user, 0, 20);
        }
    }

    @Test
    void teacherDashboardRejectsReaders() {
        EducationService service = mock(EducationService.class);
        UsuarioRepository users = mock(UsuarioRepository.class);
        Usuario reader = new Usuario();
        reader.setTipo(TipoUsuario.LEITOR);
        when(users.findByEmail("reader@example.com")).thenReturn(Optional.of(reader));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("reader@example.com", "ignored"));

        EducationController controller = new EducationController(service, users);

        assertEquals(HttpStatus.FORBIDDEN, controller.teacherDashboard(0, 20).getStatusCode());
        verifyNoInteractions(service);
    }
}
