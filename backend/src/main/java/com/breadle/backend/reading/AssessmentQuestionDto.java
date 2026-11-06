package com.breadle.backend.reading;

import java.util.List;

public record AssessmentQuestionDto(
        Long id,
        Integer order,
        String type,
        String difficulty,
        String prompt,
        List<String> options) {
}
