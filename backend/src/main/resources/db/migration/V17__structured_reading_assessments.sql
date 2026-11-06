CREATE TABLE IF NOT EXISTS reading_assessments (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL UNIQUE REFERENCES reading_sessions(id) ON DELETE CASCADE,
    context_hash CHAR(64) NOT NULL,
    page_numbers TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reading_assessments_session
    ON reading_assessments(session_id);

CREATE TABLE IF NOT EXISTS assessment_questions (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES reading_assessments(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL CHECK (question_order BETWEEN 1 AND 3),
    question_type VARCHAR(32) NOT NULL CHECK (
        question_type IN ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'INFERENCE_EVIDENCE')
    ),
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    prompt VARCHAR(600) NOT NULL,
    options_json TEXT NOT NULL,
    correct_option INTEGER NULL CHECK (correct_option IS NULL OR correct_option BETWEEN 0 AND 3),
    expected_answer VARCHAR(2000) NOT NULL,
    rubric VARCHAR(1200) NOT NULL,
    evidence VARCHAR(1000) NOT NULL,
    CONSTRAINT uq_assessment_question_order UNIQUE (assessment_id, question_order),
    CONSTRAINT ck_assessment_question_choice CHECK (
        (question_type = 'MULTIPLE_CHOICE' AND correct_option IS NOT NULL)
        OR (question_type <> 'MULTIPLE_CHOICE' AND correct_option IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment
    ON assessment_questions(assessment_id);

CREATE TABLE IF NOT EXISTS assessment_answers (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL UNIQUE REFERENCES assessment_questions(id) ON DELETE CASCADE,
    answer_text VARCHAR(2000) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    feedback VARCHAR(1200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_question
    ON assessment_answers(question_id);
