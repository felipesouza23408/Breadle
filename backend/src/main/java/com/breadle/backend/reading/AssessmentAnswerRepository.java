package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssessmentAnswerRepository extends JpaRepository<AssessmentAnswer, Long> {
    Optional<AssessmentAnswer> findByQuestionId(Long questionId);
}
