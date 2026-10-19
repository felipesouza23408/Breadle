package com.breadle.backend.service;

import com.breadle.backend.dto.ForgotPasswordRequest;
import com.breadle.backend.dto.ResetPasswordRequest;
import com.breadle.backend.entity.PasswordResetToken;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.PasswordResetTokenRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordResetTokenRepository tokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private PasswordResetEmailService emailService;

    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(usuarioRepository, tokenRepository, passwordEncoder, emailService);
    }

    @Test
    void unknownEmailDoesNotCreateTokenOrSendEmail() {
        when(usuarioRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        service.requestReset(new ForgotPasswordRequest(" Missing@Example.com "));

        verify(tokenRepository, never()).save(any());
        verify(emailService, never()).sendResetLink(any(), anyString());
    }

    @Test
    void recentRequestIsThrottled() {
        Usuario user = new Usuario();
        user.setId(17L);
        when(usuarioRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.existsByUserIdAndCreatedAtAfter(org.mockito.ArgumentMatchers.eq(17L), any(Instant.class)))
            .thenReturn(true);

        service.requestReset(new ForgotPasswordRequest("reader@example.com"));

        verify(tokenRepository, never()).save(any());
        verify(emailService, never()).sendResetLink(any(), anyString());
    }

    @Test
    void resetTokenIsStoredHashedAndChangesPasswordOnce() {
        Usuario user = new Usuario();
        user.setId(17L);
        user.setEmail("reader@example.com");
        user.setNome("Leitora");
        when(usuarioRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NovaSenha9")).thenReturn("encoded-password");

        service.requestReset(new ForgotPasswordRequest("reader@example.com"));

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        PasswordResetToken storedToken = tokenCaptor.getValue();
        ArgumentCaptor<String> rawTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendResetLink(org.mockito.ArgumentMatchers.eq(user), rawTokenCaptor.capture());
        String rawToken = rawTokenCaptor.getValue();
        assertNotEquals(rawToken, storedToken.getTokenHash());
        verify(tokenRepository).deleteByUserId(17L);

        when(tokenRepository.findValidForUpdate(anyString(), any(Instant.class))).thenReturn(Optional.of(storedToken));
        when(usuarioRepository.findById(17L)).thenReturn(Optional.of(user));

        service.resetPassword(new ResetPasswordRequest(rawToken, "NovaSenha9"));

        verify(passwordEncoder).encode("NovaSenha9");
        verify(usuarioRepository).save(user);
        verify(tokenRepository, times(2)).save(storedToken);
    }

    @Test
    void invalidOrExpiredTokenIsRejected() {
        when(tokenRepository.findValidForUpdate(anyString(), any(Instant.class))).thenReturn(Optional.empty());

        assertThrows(
            IllegalArgumentException.class,
            () -> service.resetPassword(new ResetPasswordRequest("invalid-token", "NovaSenha9"))
        );
    }
}
