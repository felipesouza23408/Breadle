package com.breadle.backend.reading;

import java.time.Instant;

public record ReadingSessionSummary(
        Long id,
        Long bookId,
        String title,
        String author,
        String coverUrl,
        Integer totalPages,
        Integer pagesDefined,
        Integer pagesRead,
        String status,
        Integer pointsAwarded,
        Instant createdAt,
        Instant finishedAt
) {
}
