ALTER TABLE livros
    ADD COLUMN IF NOT EXISTS dificuldade SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS fonte_origem VARCHAR(160),
    ADD COLUMN IF NOT EXISTS capa_url TEXT,
    ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
    ADD COLUMN IF NOT EXISTS cadastrado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE livros
    ADD CONSTRAINT ck_livros_dificuldade CHECK (dificuldade BETWEEN 1 AND 5),
    ADD CONSTRAINT ck_livros_origem CHECK (origem IN ('DOMINIO_PUBLICO', 'PARCERIA')),
    ADD CONSTRAINT ck_livros_paginas CHECK (total_paginas > 0),
    ADD CONSTRAINT ck_livros_pontuacao CHECK (pontuacao_base > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_livros_titulo_autor
    ON livros (lower(titulo), lower(autor));