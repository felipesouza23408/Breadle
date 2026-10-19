CREATE TABLE IF NOT EXISTS reading_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(255),
    owner_id BIGINT NOT NULL,
    challenge_name VARCHAR(80) NOT NULL DEFAULT 'Leitura coletiva',
    challenge_target_pages INTEGER NOT NULL DEFAULT 180,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reading_group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    pages_read INTEGER NOT NULL DEFAULT 0,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES reading_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_groups_owner ON reading_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_reading_groups_active ON reading_groups(active);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON reading_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON reading_group_members(user_id);
