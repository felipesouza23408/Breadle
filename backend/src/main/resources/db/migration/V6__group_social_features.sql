CREATE TABLE IF NOT EXISTS group_challenges (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    title VARCHAR(80) NOT NULL,
    description VARCHAR(255),
    target_pages INTEGER NOT NULL DEFAULT 180,
    starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_challenges_group FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_activities (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'ENCOURAGEMENT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_activities_group FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_activities_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_chat_messages (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_chat_group FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_chat_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_challenges_group ON group_challenges(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_group ON group_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_group ON group_chat_messages(group_id);
