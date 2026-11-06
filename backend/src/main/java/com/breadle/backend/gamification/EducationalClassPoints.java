package com.breadle.backend.gamification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "educational_class_points")
public class EducationalClassPoints {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "class_id", nullable = false)
    private Long classId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "points", nullable = false)
    private long points;

    protected EducationalClassPoints() {
    }

    public EducationalClassPoints(Long id, Long classId, Long studentId, long points) {
        this.id = id;
        this.classId = classId;
        this.studentId = studentId;
        this.points = points;
    }

    public Long getId() {
        return id;
    }

    public Long getClassId() {
        return classId;
    }

    public Long getStudentId() {
        return studentId;
    }

    public long getPoints() {
        return points;
    }
}
