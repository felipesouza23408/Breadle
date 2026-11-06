package com.breadle.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface AssessmentQuestionRepository extends JpaRepository<AssessmentQuestion, Long> {
    List<AssessmentQuestion> findByAssessmentIdOrderByQuestionOrder(Long assessmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select question from AssessmentQuestion question where question.id = :questionId")
    Optional<AssessmentQuestion> findByIdForUpdate(@Param("questionId") Long questionId);
}
