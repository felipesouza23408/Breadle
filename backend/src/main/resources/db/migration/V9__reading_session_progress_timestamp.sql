ALTER TABLE reading_sessions
    ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

UPDATE reading_sessions
SET last_progress_at = COALESCE(finished_at, created_at)
WHERE last_progress_at IS NULL;

ALTER TABLE reading_sessions
    ALTER COLUMN last_progress_at SET NOT NULL;
