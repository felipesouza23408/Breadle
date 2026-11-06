package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface ReadingAssessmentRepository extends JpaRepository<ReadingAssessment, Long> {
    Optional<ReadingAssessment> findBySessionId(Long sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select assessment from ReadingAssessment assessment where assessment.sessionId = :sessionId")
    Optional<ReadingAssessment> findBySessionIdForUpdate(@Param("sessionId") Long sessionId);
}
