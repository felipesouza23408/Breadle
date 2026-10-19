package com.breadle.backend.ai;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiUsageServiceTest {

    private JdbcTemplate jdbcTemplate;
    private UsuarioRepository usuarioRepository;
    private AiUsageService service;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        usuarioRepository = mock(UsuarioRepository.class);
        service = new AiUsageService(jdbcTemplate, usuarioRepository, 20);

        Usuario user = new Usuario();
        user.setId(11L);
        user.setEmail("reader@example.com");
        when(usuarioRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("reader@example.com", "unused"));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void reservesUsageBeforeReturningTheAiResponse() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(), any(), any()))
                .thenReturn(4);

        AiResponse response = service.execute(() -> "Trecho explicado.");

        assertEquals("Trecho explicado.", response.result());
        assertEquals(4, response.usedToday());
        assertEquals(16, response.remainingToday());
        verify(jdbcTemplate).queryForObject(anyString(), eq(Integer.class), any(), any(), eq(20));
    }

    @Test
    void rejectsTheRequestWhenTheDailyLimitIsReached() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(), any(), any()))
                .thenThrow(new EmptyResultDataAccessException(1));
        AtomicBoolean operationInvoked = new AtomicBoolean();

        assertThrows(AiQuotaExceededException.class, () -> service.execute(() -> {
            operationInvoked.set(true);
            return "Não deve ser gerado.";
        }));

        assertFalse(operationInvoked.get());
    }
}
