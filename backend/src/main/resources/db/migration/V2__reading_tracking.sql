CREATE TABLE IF NOT EXISTS reading_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    pages_defined INTEGER NOT NULL,
    pages_read INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    excerpt_hash VARCHAR(255) NULL,
    already_awarded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reading_reward_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    reward_type VARCHAR(50) NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    reference_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_status ON reading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_reading_reward_session ON reading_reward_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_reading_reward_user ON reading_reward_ledger(user_id);
