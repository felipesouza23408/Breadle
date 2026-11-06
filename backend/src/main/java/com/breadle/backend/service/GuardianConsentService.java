package com.breadle.backend.service;

import com.breadle.backend.entity.GuardianConsentToken;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.GuardianConsentTokenRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;

@Service
public class GuardianConsentService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GuardianConsentService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int MAX_REQUESTS_PER_HOUR = 3;
    private static final String INVALID_TOKEN_MESSAGE =
        "Este link de confirmação é inválido ou expirou. Solicite um novo link para continuar.";

    private final UsuarioRepository usuarioRepository;
    private final GuardianConsentTokenRepository tokenRepository;
    private final PasswordResetEmailService emailService;

    public GuardianConsentService(
        UsuarioRepository usuarioRepository,
        GuardianConsentTokenRepository tokenRepository,
        PasswordResetEmailService emailService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void sendInitialConsent(Usuario usuario) {
        issueToken(usuario);
    }

    @Transactional
    public void resend(String email) {
        if (email == null || email.isBlank()) {
            return;
        }

        Optional<Usuario> pendingUser = usuarioRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
            .filter(user -> Boolean.TRUE.equals(user.getConsentimentoResponsavelPendente()));
        if (pendingUser.isEmpty()) {
            return;
        }

        Usuario usuario = pendingUser.get();
        Instant now = Instant.now();
        if (tokenRepository.countByUserIdAndCreatedAtAfter(usuario.getId(), now.minus(1, ChronoUnit.HOURS))
                >= MAX_REQUESTS_PER_HOUR
            || tokenRepository.existsByUserIdAndCreatedAtAfter(
                usuario.getId(),
                now.minus(1, ChronoUnit.MINUTES)
            )) {
            return;
        }

        try {
            issueToken(usuario);
        } catch (EmailDeliveryException exception) {
            log.warn("O envio do e-mail de consentimento solicitado não foi concluído.");
        }
    }

    @Transactional
    public void confirm(String rawToken) {
        if (rawToken == null || rawToken.isBlank() || rawToken.length() > 128) {
            throw new IllegalArgumentException(INVALID_TOKEN_MESSAGE);
        }

        Instant now = Instant.now();
        GuardianConsentToken token = tokenRepository.findValidForUpdate(hashToken(rawToken), now)
            .orElseThrow(() -> new IllegalArgumentException(INVALID_TOKEN_MESSAGE));
        Usuario usuario = usuarioRepository.findById(token.getUserId())
            .filter(user -> Boolean.TRUE.equals(user.getConsentimentoResponsavelPendente()))
            .orElseThrow(() -> new IllegalArgumentException(INVALID_TOKEN_MESSAGE));

        usuario.setConsentimentoResponsavelPendente(false);
        usuario.setAtivo(true);
        usuarioRepository.save(usuario);

        token.setUsedAt(now);
        tokenRepository.save(token);
        invalidateOutstandingTokens(usuario.getId(), now);
    }

    private void issueToken(Usuario usuario) {
        Instant now = Instant.now();
        invalidateOutstandingTokens(usuario.getId(), now);

        String rawToken = generateToken();
        GuardianConsentToken token = new GuardianConsentToken();
        token.setUserId(usuario.getId());
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(now.plus(24, ChronoUnit.HOURS));
        tokenRepository.save(token);
        emailService.sendGuardianConsentLink(usuario, rawToken);
    }

    private void invalidateOutstandingTokens(Long userId, Instant now) {
        tokenRepository.findAllByUserIdAndUsedAtIsNull(userId).forEach(token -> token.setUsedAt(now));
        tokenRepository.flush();
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 não está disponível nesta instalação do Java.", exception);
        }
    }
}
