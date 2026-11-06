package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingSessionRepository extends JpaRepository<ReadingSession, Long> {
    long countByUserIdAndStatus(Long userId, String status);
    List<ReadingSession> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from ReadingSession session where session.id = :sessionId")
    Optional<ReadingSession> findByIdForUpdate(@Param("sessionId") Long sessionId);
}
