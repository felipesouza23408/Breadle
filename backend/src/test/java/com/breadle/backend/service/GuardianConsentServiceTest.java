package com.breadle.backend.service;

import com.breadle.backend.entity.GuardianConsentToken;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.GuardianConsentTokenRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuardianConsentServiceTest {
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private GuardianConsentTokenRepository tokenRepository;
    @Mock
    private PasswordResetEmailService emailService;

    private GuardianConsentService service;

    @BeforeEach
    void setUp() {
        service = new GuardianConsentService(usuarioRepository, tokenRepository, emailService);
    }

    @Test
    void initialConsentStoresOnlyTokenHashAndEmailsTheRawToken() {
        Usuario user = pendingUser();

        service.sendInitialConsent(user);

        ArgumentCaptor<GuardianConsentToken> storedToken = ArgumentCaptor.forClass(GuardianConsentToken.class);
        ArgumentCaptor<String> emailedToken = ArgumentCaptor.forClass(String.class);
        verify(tokenRepository).save(storedToken.capture());
        verify(emailService).sendGuardianConsentLink(org.mockito.ArgumentMatchers.eq(user), emailedToken.capture());
        assertNotEquals(emailedToken.getValue(), storedToken.getValue().getTokenHash());
        assertEquals(17L, storedToken.getValue().getUserId());
        assertTrue(storedToken.getValue().getExpiresAt().isAfter(Instant.now().plus(23, java.time.temporal.ChronoUnit.HOURS)));
    }

    @Test
    void invalidAndExpiredTokensAreRejected() {
        when(tokenRepository.findValidForUpdate(anyString(), any(Instant.class))).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.confirm("invalid-token"));
        assertThrows(IllegalArgumentException.class, () -> service.confirm("expired-token"));

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void validConsentEnablesAccountAndConsumesToken() {
        Usuario user = pendingUser();
        GuardianConsentToken token = new GuardianConsentToken();
        token.setUserId(user.getId());
        when(tokenRepository.findValidForUpdate(anyString(), any(Instant.class))).thenReturn(Optional.of(token));
        when(usuarioRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(tokenRepository.findAllByUserIdAndUsedAtIsNull(user.getId())).thenReturn(List.of());

        service.confirm("one-time-token");

        assertEquals(false, user.getConsentimentoResponsavelPendente());
        assertEquals(true, user.getAtivo());
        org.junit.jupiter.api.Assertions.assertNotNull(token.getUsedAt());
        verify(usuarioRepository).save(user);
        verify(tokenRepository).save(token);
    }

    private Usuario pendingUser() {
        Usuario user = new Usuario();
        user.setId(17L);
        user.setEmail("student@example.com");
        user.setEmailResponsavel("guardian@example.com");
        user.setConsentimentoResponsavelPendente(true);
        user.setAtivo(false);
        return user;
    }
}
