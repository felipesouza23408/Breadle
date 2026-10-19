CREATE TABLE ai_usage_daily (
    user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (user_id, usage_date)
);
