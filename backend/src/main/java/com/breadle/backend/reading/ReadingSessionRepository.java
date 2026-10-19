package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReadingSessionRepository extends JpaRepository<ReadingSession, Long> {
    long countByUserIdAndStatus(Long userId, String status);
    List<ReadingSession> findByUserIdOrderByCreatedAtDesc(Long userId);
}
