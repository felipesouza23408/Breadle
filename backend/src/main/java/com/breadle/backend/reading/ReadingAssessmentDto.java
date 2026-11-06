package com.breadle.backend.reading;

import java.time.Instant;
import java.util.List;

public record ReadingAssessmentDto(
        Long id,
        List<Integer> pages,
        Instant createdAt,
        List<AssessmentQuestionDto> questions) {
}
