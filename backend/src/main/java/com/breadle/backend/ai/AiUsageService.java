package com.breadle.backend.ai;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.function.Supplier;

@Service
public class AiUsageService {

    private static final String USAGE_COUNT_SQL =
            "SELECT request_count FROM ai_usage_daily WHERE user_id = ? AND usage_date = ?";
    private static final String RESERVE_USAGE_SQL = """
            INSERT INTO ai_usage_daily (user_id, usage_date, request_count)
            VALUES (?, ?, 1)
            ON CONFLICT (user_id, usage_date)
            DO UPDATE SET request_count = ai_usage_daily.request_count + 1
            WHERE ai_usage_daily.request_count < ?
            RETURNING request_count
            """;

    private final JdbcTemplate jdbcTemplate;
    private final UsuarioRepository usuarioRepository;
    private final int dailyLimit;

    public AiUsageService(
            JdbcTemplate jdbcTemplate,
            UsuarioRepository usuarioRepository,
            @Value("${breadle.ai.daily-limit:20}") int dailyLimit) {
        if (dailyLimit < 1) {
            throw new IllegalArgumentException("O limite diário de uso da IA deve ser maior que zero.");
        }
        this.jdbcTemplate = jdbcTemplate;
        this.usuarioRepository = usuarioRepository;
        this.dailyLimit = dailyLimit;
    }

    public AiResponse execute(Supplier<String> operation) {
        Long userId = currentUserId();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int usedToday;
        try {
            usedToday = jdbcTemplate.queryForObject(
                    RESERVE_USAGE_SQL,
                    Integer.class,
                    userId,
                    today,
                    dailyLimit);
        } catch (EmptyResultDataAccessException ex) {
            throw new AiQuotaExceededException();
        }

        return response(operation.get(), usedToday, today);
    }

    public AiResponse getUsage() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int usedToday;
        try {
            usedToday = jdbcTemplate.queryForObject(
                    USAGE_COUNT_SQL,
                    Integer.class,
                    currentUserId(),
                    today);
        } catch (EmptyResultDataAccessException ex) {
            usedToday = 0;
        }
        return response(null, usedToday, today);
    }

    private AiResponse response(String result, int usedToday, LocalDate usageDate) {
        Instant resetsAt = usageDate.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return new AiResponse(result, usedToday, dailyLimit, Math.max(0, dailyLimit - usedToday), resetsAt);
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Usuário não autenticado.");
        }

        Usuario usuario = usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Usuário autenticado não encontrado."));
        return usuario.getId();
    }
}
