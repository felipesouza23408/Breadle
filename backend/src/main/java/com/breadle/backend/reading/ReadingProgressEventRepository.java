package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ReadingProgressEventRepository extends JpaRepository<ReadingProgressEvent, Long> {
    List<ReadingProgressEvent> findByUserIdAndCreatedAtGreaterThanEqual(Long userId, Instant createdAt);
}
