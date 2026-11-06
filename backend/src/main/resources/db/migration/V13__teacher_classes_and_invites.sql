CREATE TABLE teacher_classes (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    invitation_code_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teacher_class_members (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teacher_class_student UNIQUE (class_id, student_id)
);

CREATE INDEX idx_teacher_classes_teacher ON teacher_classes(teacher_id);
CREATE INDEX idx_teacher_class_members_student ON teacher_class_members(student_id);
