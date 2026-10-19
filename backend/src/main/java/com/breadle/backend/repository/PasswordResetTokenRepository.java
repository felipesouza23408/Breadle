package com.breadle.backend.repository;

import com.breadle.backend.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    void deleteByUserId(Long userId);

    boolean existsByUserIdAndCreatedAtAfter(Long userId, Instant createdAt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT token FROM PasswordResetToken token
        WHERE token.tokenHash = :tokenHash
          AND token.usedAt IS NULL
          AND token.expiresAt > :now
        """)
    Optional<PasswordResetToken> findValidForUpdate(
        @Param("tokenHash") String tokenHash,
        @Param("now") Instant now
    );
}
