package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface ReadingSessionPageRepository extends JpaRepository<ReadingSessionPage, Long> {
    Optional<ReadingSessionPage> findBySessionIdAndPageNumber(Long sessionId, Integer pageNumber);

    long countBySessionId(Long sessionId);

    List<ReadingSessionPage> findBySessionIdOrderByPageNumber(Long sessionId);

    @Query("select max(page.pageNumber) from ReadingSessionPage page where page.sessionId = :sessionId")
    Integer findHighestPageNumber(@Param("sessionId") Long sessionId);
}
