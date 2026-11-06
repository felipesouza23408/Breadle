ALTER TABLE usuarios
    ADD COLUMN consentimento_responsavel_pendente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN email_responsavel VARCHAR(160);

CREATE TABLE guardian_consent_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guardian_consent_tokens_user_created
    ON guardian_consent_tokens(user_id, created_at DESC);
