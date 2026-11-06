package com.breadle.backend.repository;

import com.breadle.backend.entity.GuardianConsentToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GuardianConsentTokenRepository extends JpaRepository<GuardianConsentToken, Long> {
    long countByUserIdAndCreatedAtAfter(Long userId, Instant createdAt);

    boolean existsByUserIdAndCreatedAtAfter(Long userId, Instant createdAt);

    List<GuardianConsentToken> findAllByUserIdAndUsedAtIsNull(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT token FROM GuardianConsentToken token
        WHERE token.tokenHash = :tokenHash
          AND token.usedAt IS NULL
          AND token.expiresAt > :now
        """)
    Optional<GuardianConsentToken> findValidForUpdate(
        @Param("tokenHash") String tokenHash,
        @Param("now") Instant now
    );
}
