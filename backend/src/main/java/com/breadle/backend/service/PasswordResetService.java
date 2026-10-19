package com.breadle.backend.service;

import com.breadle.backend.dto.ForgotPasswordRequest;
import com.breadle.backend.dto.ResetPasswordRequest;
import com.breadle.backend.entity.PasswordResetToken;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.PasswordResetTokenRepository;
import com.breadle.backend.repository.UsuarioRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Locale;

@Service
public class PasswordResetService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PasswordResetService.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailService emailService;

    public PasswordResetService(
        UsuarioRepository usuarioRepository,
        PasswordResetTokenRepository tokenRepository,
        PasswordEncoder passwordEncoder,
        PasswordResetEmailService emailService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Transactional
    public void requestReset(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        usuarioRepository.findByEmail(email).ifPresent(usuario -> {
            if (!Boolean.TRUE.equals(usuario.getAtivo())
                || tokenRepository.existsByUserIdAndCreatedAtAfter(usuario.getId(), Instant.now().minus(1, ChronoUnit.MINUTES))) {
                return;
            }

            String rawToken = generateToken();
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUserId(usuario.getId());
            resetToken.setTokenHash(hashToken(rawToken));
            resetToken.setExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));

            tokenRepository.deleteByUserId(usuario.getId());
            tokenRepository.save(resetToken);
            try {
                emailService.sendResetLink(usuario, rawToken);
            } catch (EmailDeliveryException exception) {
                log.error("Falha no envio do e-mail de redefinição para uma conta Breadle.", exception);
                throw exception;
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = tokenRepository.findValidForUpdate(
                hashToken(request.token()),
                Instant.now()
            )
            .orElseThrow(() -> new IllegalArgumentException("Este link é inválido ou expirou. Solicite uma nova redefinição."));

        Usuario usuario = usuarioRepository.findById(resetToken.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("Este link é inválido ou expirou. Solicite uma nova redefinição."));

        usuario.setSenhaHash(passwordEncoder.encode(request.senha()));
        usuarioRepository.save(usuario);
        resetToken.setUsedAt(Instant.now());
        tokenRepository.save(resetToken);
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
