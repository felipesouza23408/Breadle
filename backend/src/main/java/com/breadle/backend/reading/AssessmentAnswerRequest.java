package com.breadle.backend.reading;

public record AssessmentAnswerRequest(
        String answer,
        Integer selectedOption) {
}
