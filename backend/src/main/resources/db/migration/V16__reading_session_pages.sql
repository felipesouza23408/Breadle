ALTER TABLE reading_sessions
    ADD COLUMN page_tracking_started BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE reading_session_pages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_reading_session_page UNIQUE (session_id, page_number)
);

CREATE INDEX idx_reading_session_pages_session
    ON reading_session_pages(session_id);
