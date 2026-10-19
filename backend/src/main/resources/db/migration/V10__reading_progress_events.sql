CREATE TABLE reading_progress_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    pages_read_delta INTEGER NOT NULL CHECK (pages_read_delta > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO reading_progress_events (user_id, session_id, pages_read_delta, created_at)
SELECT user_id, id, pages_read, COALESCE(last_progress_at, finished_at, created_at)
FROM reading_sessions
WHERE pages_read > 0;

CREATE INDEX idx_reading_progress_user_created
    ON reading_progress_events(user_id, created_at);
