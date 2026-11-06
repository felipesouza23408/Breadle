package com.breadle.backend.reading;

public record AssessmentAnswerDto(
        Long questionId,
        boolean correct,
        String feedback) {
}
