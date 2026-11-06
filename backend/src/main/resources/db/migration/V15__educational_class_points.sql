CREATE TABLE educational_class_points (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    points BIGINT NOT NULL DEFAULT 0 CHECK (points >= 0),
    CONSTRAINT uq_educational_points_class_student UNIQUE (class_id, student_id),
    CONSTRAINT fk_educational_points_class_student
        FOREIGN KEY (class_id, student_id)
        REFERENCES teacher_class_members(class_id, student_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_educational_class_points_class
    ON educational_class_points(class_id);
