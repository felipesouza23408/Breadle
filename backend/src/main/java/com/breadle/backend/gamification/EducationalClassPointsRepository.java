package com.breadle.backend.gamification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EducationalClassPointsRepository extends JpaRepository<EducationalClassPoints, Long> {

    @Modifying
    @Query(value = """
        INSERT INTO educational_class_points (class_id, student_id, points)
        VALUES (:classId, :studentId, :points)
        ON CONFLICT (class_id, student_id)
        DO UPDATE SET points = educational_class_points.points + EXCLUDED.points
        """, nativeQuery = true)
    void addPoints(@Param("classId") Long classId,
                   @Param("studentId") Long studentId,
                   @Param("points") int points);

    Optional<EducationalClassPoints> findByClassIdAndStudentId(Long classId, Long studentId);

    List<EducationalClassPoints> findByClassIdIn(Collection<Long> classIds);
}
