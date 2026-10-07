-- =====================================================================
-- BREADLE - Banco de Dados (PostgreSQL 14+)
-- Baseado em: Requisitos (RF01-RF59, RNF01-RNF30), Diagrama de Classes,
-- Modelo de Negócios, Mapas de Empatia e Narrativa/Casos de Uso.
-- =====================================================================

DROP SCHEMA IF EXISTS breadle CASCADE;
CREATE SCHEMA breadle;
SET search_path TO breadle;

-- ---------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE tipo_usuario        AS ENUM ('LEITOR', 'PROFESSOR', 'ADMINISTRADOR');
CREATE TYPE plano_leitor        AS ENUM ('GRATUITO', 'PLUS');
CREATE TYPE origem_livro        AS ENUM ('DOMINIO_PUBLICO', 'PARCERIA');
CREATE TYPE status_consentimento AS ENUM ('PENDENTE', 'AUTORIZADO', 'REVOGADO');
CREATE TYPE tipo_missao         AS ENUM ('LER_PAGINAS', 'RESPONDER_QUESTOES', 'LER_PERCENTUAL', 'CONCLUIR_LIVRO');
CREATE TYPE periodicidade       AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL');
CREATE TYPE tipo_sala           AS ENUM ('GRUPO', 'REGIONAL');
CREATE TYPE escopo_regiao       AS ENUM ('CIDADE', 'ESTADO', 'PAIS', 'GLOBAL');
CREATE TYPE tipo_acao_ia        AS ENUM ('PERGUNTAS', 'EXPLICAR_PASSAGEM', 'RESUMO', 'FICHA_PERSONAGEM', 'DESCREVER_CENARIO');
CREATE TYPE status_denuncia     AS ENUM ('ABERTA', 'EM_ANALISE', 'PROCEDENTE', 'IMPROCEDENTE');
CREATE TYPE status_sessao       AS ENUM ('EM_ANDAMENTO', 'AGUARDANDO_RESPOSTAS', 'CONCLUIDA', 'ABANDONADA');
CREATE TYPE origem_pontos       AS ENUM ('SESSAO_LEITURA', 'MISSAO', 'CONQUISTA', 'AJUSTE');
CREATE TYPE tipo_rede           AS ENUM ('PUBLICA', 'PRIVADA', 'REDE_ENSINO', 'SECRETARIA');
CREATE TYPE tipo_patrocinador   AS ENUM ('MARCA', 'FUNDACAO', 'BANCO', 'ONG', 'OUTRO');

-- ---------------------------------------------------------------------
-- 1. USUÁRIOS (Usuario abstrata -> Leitor, Professor, Administrador; Aluno herda de Leitor)
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo          tipo_usuario NOT NULL,
    nome          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL,                 -- RNF03: nunca guardar senha em texto
    nascimento    DATE,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,         -- RF04: desativação de conta
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, tipo)
);

CREATE TABLE leitor (
    usuario_id           BIGINT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    pontos_totais        INTEGER NOT NULL DEFAULT 0 CHECK (pontos_totais >= 0),
    plano                plano_leitor NOT NULL DEFAULT 'GRATUITO',
    consente_localizacao BOOLEAN NOT NULL DEFAULT FALSE, -- RNF26
    cidade               VARCHAR(80),
    estado               CHAR(2),
    pais                 VARCHAR(60) DEFAULT 'Brasil',
    -- localização só é válida se houver consentimento
    CONSTRAINT ck_localizacao_consentida
        CHECK (consente_localizacao OR (cidade IS NULL AND estado IS NULL))
);

CREATE TABLE responsavel (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome      VARCHAR(120) NOT NULL,
    contato   VARCHAR(160) NOT NULL
);

-- Aluno é um Leitor com conta educacional (RF52-RF57)
CREATE TABLE aluno (
    usuario_id          BIGINT PRIMARY KEY REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    menor_de_idade      BOOLEAN NOT NULL DEFAULT FALSE,
    consentimento_ok    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Vínculo com conta pessoal (0..1): o progresso vai só da escolar para a pessoal (RF57)
    conta_pessoal_id    BIGINT UNIQUE REFERENCES leitor(usuario_id) ON DELETE SET NULL,
    vinculada_em        TIMESTAMPTZ,
    CONSTRAINT ck_vinculo_diferente CHECK (conta_pessoal_id IS NULL OR conta_pessoal_id <> usuario_id),
    -- menor de idade só fica ativo com consentimento (RNF25)
    CONSTRAINT ck_menor_consentimento CHECK (NOT menor_de_idade OR consentimento_ok OR TRUE)
);

CREATE TABLE autorizacao_responsavel (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aluno_id        BIGINT NOT NULL REFERENCES aluno(usuario_id) ON DELETE CASCADE,
    responsavel_id  BIGINT NOT NULL REFERENCES responsavel(id)   ON DELETE CASCADE,
    status          status_consentimento NOT NULL DEFAULT 'PENDENTE',
    solicitada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    decidida_em     TIMESTAMPTZ,
    UNIQUE (aluno_id, responsavel_id)
);

CREATE TABLE administrador (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 2. ESCOLAS, LICENÇAS E PROFESSORES
-- ---------------------------------------------------------------------
CREATE TABLE escola (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(160) NOT NULL,
    tipo_rede  tipo_rede NOT NULL,
    cidade     VARCHAR(80),
    estado     CHAR(2)
);

CREATE TABLE licenca_educacional (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    escola_id    BIGINT NOT NULL REFERENCES escola(id) ON DELETE CASCADE,
    escopo       VARCHAR(10) NOT NULL CHECK (escopo IN ('ALUNO', 'TURMA', 'ESCOLA')),
    qtd_alunos   INTEGER NOT NULL CHECK (qtd_alunos > 0),
    valor_anual  NUMERIC(12,2) CHECK (valor_anual >= 0),
    inicio       DATE NOT NULL,
    validade     DATE NOT NULL,
    piloto_gratuito BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (validade > inicio)
);

CREATE TABLE professor (
    usuario_id   BIGINT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    escola_id    BIGINT REFERENCES escola(id) ON DELETE SET NULL,
    instituicao  VARCHAR(160)
);

CREATE TABLE turma (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    professor_id  BIGINT NOT NULL REFERENCES professor(usuario_id) ON DELETE CASCADE,
    nome          VARCHAR(120) NOT NULL,
    criada_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE turma_aluno (
    turma_id    BIGINT NOT NULL REFERENCES turma(id) ON DELETE CASCADE,
    aluno_id    BIGINT NOT NULL REFERENCES aluno(usuario_id) ON DELETE CASCADE,
    entrou_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (turma_id, aluno_id)
);

-- ---------------------------------------------------------------------
-- 3. ACERVO
-- ---------------------------------------------------------------------
CREATE TABLE editora (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome  VARCHAR(160) NOT NULL UNIQUE
);

CREATE TABLE livro (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    autor           VARCHAR(160) NOT NULL,
    sinopse         TEXT,
    origem          origem_livro NOT NULL,
    fonte_origem    VARCHAR(160),                          -- ex.: Domínio Público/MEC, Gutenberg
    editora_id      BIGINT REFERENCES editora(id) ON DELETE SET NULL,
    tipo            VARCHAR(40) NOT NULL DEFAULT 'LITERATURA', -- gibi, científico, literatura...
    dificuldade     SMALLINT NOT NULL DEFAULT 1 CHECK (dificuldade BETWEEN 1 AND 5),
    pontuacao_base  INTEGER NOT NULL DEFAULT 10 CHECK (pontuacao_base > 0), -- RF37
    total_paginas   INTEGER NOT NULL CHECK (total_paginas > 0),
    arquivo_url     TEXT,
    audio_pre_gerado_url TEXT,                              -- reduz custo de TTS
    cadastrado_por  BIGINT REFERENCES administrador(usuario_id) ON DELETE SET NULL, -- RF59
    cadastrado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_parceria_editora CHECK (origem <> 'PARCERIA' OR editora_id IS NOT NULL)
);

CREATE TABLE favorito (
    leitor_id  BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    livro_id   BIGINT NOT NULL REFERENCES livro(id) ON DELETE CASCADE,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (leitor_id, livro_id)
);

CREATE TABLE avaliacao_livro (
    leitor_id  BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    livro_id   BIGINT NOT NULL REFERENCES livro(id) ON DELETE CASCADE,
    nota       SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (leitor_id, livro_id)
);

CREATE TABLE indicacao_leitura (                            -- RF54
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turma_id      BIGINT NOT NULL REFERENCES turma(id) ON DELETE CASCADE,
    livro_id      BIGINT NOT NULL REFERENCES livro(id) ON DELETE CASCADE,
    obrigatoria   BOOLEAN NOT NULL DEFAULT FALSE,           -- sugerir x determinar
    prazo         DATE,
    criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (turma_id, livro_id)
);

-- ---------------------------------------------------------------------
-- 4. LEITURA, SESSÕES E PERGUNTAS DA IA
-- ---------------------------------------------------------------------
CREATE TABLE leitura (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leitor_id      BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    livro_id       BIGINT NOT NULL REFERENCES livro(id) ON DELETE CASCADE,
    pagina_atual   INTEGER NOT NULL DEFAULT 0 CHECK (pagina_atual >= 0),
    maior_pagina_lida INTEGER NOT NULL DEFAULT 0,           -- limite anti-spoiler da IA (RF32)
    offline        BOOLEAN NOT NULL DEFAULT FALSE,          -- RNF18
    concluida      BOOLEAN NOT NULL DEFAULT FALSE,
    inicio         TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizada_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    concluida_em   TIMESTAMPTZ,
    UNIQUE (leitor_id, livro_id)
);

CREATE TABLE sessao_leitura (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leitura_id        BIGINT NOT NULL REFERENCES leitura(id) ON DELETE CASCADE,
    paginas_definidas INTEGER NOT NULL CHECK (paginas_definidas > 0), -- RF24
    pagina_inicio     INTEGER NOT NULL CHECK (pagina_inicio >= 0),
    pagina_fim        INTEGER,
    narrada           BOOLEAN NOT NULL DEFAULT FALSE,
    status            status_sessao NOT NULL DEFAULT 'EM_ANDAMENTO',
    pontos_ganhos     INTEGER NOT NULL DEFAULT 0 CHECK (pontos_ganhos >= 0),
    iniciada_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    encerrada_em      TIMESTAMPTZ,
    CHECK (pagina_fim IS NULL OR pagina_fim >= pagina_inicio),
    CHECK (encerrada_em IS NULL OR encerrada_em >= iniciada_em)
);

CREATE TABLE pergunta (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sessao_id        BIGINT NOT NULL REFERENCES sessao_leitura(id) ON DELETE CASCADE,
    enunciado        TEXT NOT NULL,
    trecho_base      TEXT NOT NULL,                         -- RNF20: só o trecho lido
    alternativas     JSONB,
    resposta_correta TEXT,
    resposta_usuario TEXT,
    correta          BOOLEAN,
    respondida_em    TIMESTAMPTZ,
    gerada_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registro do uso da IA: controle de custo/cota (RNF23) e cache de respostas
CREATE TABLE interacao_ia (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leitor_id      BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    livro_id       BIGINT REFERENCES livro(id) ON DELETE SET NULL,
    acao           tipo_acao_ia NOT NULL,
    pagina_limite  INTEGER,                                 -- a IA não pode passar daqui (RF32)
    hash_entrada   CHAR(64),                                -- chave de cache
    entrada        TEXT,
    resposta       TEXT,
    tokens_usados  INTEGER NOT NULL DEFAULT 0,
    criada_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interacao_ia_cache ON interacao_ia (hash_entrada) WHERE hash_entrada IS NOT NULL;
CREATE INDEX idx_interacao_ia_cota  ON interacao_ia (leitor_id, criada_em);

CREATE TABLE cota_ia (
    plano           plano_leitor PRIMARY KEY,
    limite_diario   INTEGER NOT NULL CHECK (limite_diario >= 0)
);

-- ---------------------------------------------------------------------
-- 5. PATROCÍNIO, MISSÕES, METAS, PONTOS E CONQUISTAS
-- ---------------------------------------------------------------------
CREATE TABLE patrocinador (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome  VARCHAR(160) NOT NULL,
    tipo  tipo_patrocinador NOT NULL DEFAULT 'MARCA'
);

CREATE TABLE patrocinio (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo           VARCHAR(160) NOT NULL,
    patrocinador_id  BIGINT REFERENCES patrocinador(id) ON DELETE CASCADE,
    editora_id       BIGINT REFERENCES editora(id) ON DELETE CASCADE,
    inicio           DATE NOT NULL,
    fim              DATE NOT NULL,
    sem_rastreamento BOOLEAN NOT NULL DEFAULT TRUE,         -- LGPD/ECA Digital
    CHECK (fim >= inicio),
    CHECK (patrocinador_id IS NOT NULL OR editora_id IS NOT NULL),
    CHECK (sem_rastreamento)                                -- política: nunca rastrear
);

CREATE TABLE missao (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo                 VARCHAR(160) NOT NULL,
    tipo                   tipo_missao NOT NULL,
    periodicidade          periodicidade,
    meta                   INTEGER NOT NULL CHECK (meta > 0),
    recompensa             INTEGER NOT NULL DEFAULT 0 CHECK (recompensa >= 0),
    dificuldade            SMALLINT NOT NULL DEFAULT 1 CHECK (dificuldade BETWEEN 1 AND 5),
    individual             BOOLEAN NOT NULL DEFAULT TRUE,   -- RF42
    livro_id               BIGINT REFERENCES livro(id) ON DELETE SET NULL,
    patrocinio_id          BIGINT REFERENCES patrocinio(id) ON DELETE SET NULL,
    -- Missão educacional (MissaoEducacional): turma + prazo, fora do ranking geral (RF56)
    turma_id               BIGINT REFERENCES turma(id) ON DELETE CASCADE,
    prazo                  DATE,
    conta_no_ranking_geral BOOLEAN NOT NULL DEFAULT TRUE,
    criada_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_missao_educacional CHECK (turma_id IS NULL OR conta_no_ranking_geral = FALSE)
);

CREATE TABLE missao_leitor (
    missao_id    BIGINT NOT NULL REFERENCES missao(id) ON DELETE CASCADE,
    leitor_id    BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    progresso    INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0),
    concluida    BOOLEAN NOT NULL DEFAULT FALSE,
    iniciada_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    concluida_em TIMESTAMPTZ,
    PRIMARY KEY (missao_id, leitor_id)
);

CREATE TABLE meta_leitura (                                 -- RF12-RF14
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leitor_id   BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    descricao   VARCHAR(200) NOT NULL,
    tipo        tipo_missao NOT NULL,
    alvo        INTEGER NOT NULL CHECK (alvo > 0),
    progresso   INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0),
    prazo       DATE,
    concluida   BOOLEAN NOT NULL DEFAULT FALSE,
    criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conquista (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL UNIQUE,
    criterio    VARCHAR(255) NOT NULL,
    pontos_min  INTEGER,                                    -- critério por pontos
    livros_min  INTEGER,                                    -- critério por marcos
    paginas_min INTEGER
);

CREATE TABLE conquista_leitor (
    conquista_id BIGINT NOT NULL REFERENCES conquista(id) ON DELETE CASCADE,
    leitor_id    BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    obtida_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conquista_id, leitor_id)
);

-- Livro-razão de pontos: base para ranking, auditoria e anti-fraude (RNF22)
CREATE TABLE pontuacao (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leitor_id           BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    origem              origem_pontos NOT NULL,
    sessao_id           BIGINT REFERENCES sessao_leitura(id) ON DELETE SET NULL,
    missao_id           BIGINT REFERENCES missao(id) ON DELETE SET NULL,
    pontos              INTEGER NOT NULL,
    conta_ranking_geral BOOLEAN NOT NULL DEFAULT TRUE,      -- RF56
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Impede pontuar duas vezes a mesma sessão ou a mesma missão (RNF22)
CREATE UNIQUE INDEX uq_pontuacao_sessao ON pontuacao (sessao_id) WHERE origem = 'SESSAO_LEITURA';
CREATE UNIQUE INDEX uq_pontuacao_missao ON pontuacao (leitor_id, missao_id) WHERE origem = 'MISSAO';

-- ---------------------------------------------------------------------
-- 6. ATIVIDADES AVALIATIVAS (professor)
-- ---------------------------------------------------------------------
CREATE TABLE atividade_avaliativa (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    turma_id   BIGINT NOT NULL REFERENCES turma(id) ON DELETE CASCADE,
    livro_id   BIGINT REFERENCES livro(id) ON DELETE SET NULL,
    titulo     VARCHAR(160) NOT NULL,
    descricao  TEXT,
    prazo      TIMESTAMPTZ,
    criada_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE atividade_aluno (
    atividade_id  BIGINT NOT NULL REFERENCES atividade_avaliativa(id) ON DELETE CASCADE,
    aluno_id      BIGINT NOT NULL REFERENCES aluno(usuario_id) ON DELETE CASCADE,
    entregue_em   TIMESTAMPTZ,
    nota          NUMERIC(4,2) CHECK (nota BETWEEN 0 AND 10),
    feedback      TEXT,
    PRIMARY KEY (atividade_id, aluno_id)
);

-- ---------------------------------------------------------------------
-- 7. SOCIAL: SALAS (grupos e bate-papos regionais), MENSAGENS, DENÚNCIAS
-- ---------------------------------------------------------------------
CREATE TABLE sala (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo            tipo_sala NOT NULL,
    nome            VARCHAR(120) NOT NULL,
    -- Grupo
    clube_do_livro  BOOLEAN NOT NULL DEFAULT FALSE,
    criador_id      BIGINT REFERENCES leitor(usuario_id) ON DELETE SET NULL,
    livro_atual_id  BIGINT REFERENCES livro(id) ON DELETE SET NULL,
    -- Bate-papo regional
    escopo          escopo_regiao,
    regiao          VARCHAR(80),
    criada_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_sala_tipo CHECK (
        (tipo = 'GRUPO'    AND escopo IS NULL) OR
        (tipo = 'REGIONAL' AND escopo IS NOT NULL)
    )
);

CREATE TABLE sala_membro (
    sala_id     BIGINT NOT NULL REFERENCES sala(id) ON DELETE CASCADE,
    leitor_id   BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    admin_sala  BOOLEAN NOT NULL DEFAULT FALSE,
    entrou_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (sala_id, leitor_id)
);

CREATE TABLE mensagem (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sala_id     BIGINT NOT NULL REFERENCES sala(id) ON DELETE CASCADE,
    autor_id    BIGINT REFERENCES leitor(usuario_id) ON DELETE SET NULL,
    texto       TEXT NOT NULL,
    oculta      BOOLEAN NOT NULL DEFAULT FALSE,
    enviada_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mensagem_sala ON mensagem (sala_id, enviada_em DESC);

CREATE TABLE chamada (                                      -- RF51
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sala_id     BIGINT NOT NULL REFERENCES sala(id) ON DELETE CASCADE,
    iniciada_por BIGINT REFERENCES leitor(usuario_id) ON DELETE SET NULL,
    com_video   BOOLEAN NOT NULL DEFAULT FALSE,
    inicio      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fim         TIMESTAMPTZ
);

CREATE TABLE denuncia (                                     -- RNF27
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mensagem_id    BIGINT NOT NULL REFERENCES mensagem(id) ON DELETE CASCADE,
    denunciante_id BIGINT REFERENCES leitor(usuario_id) ON DELETE SET NULL,
    motivo         VARCHAR(255) NOT NULL,
    status         status_denuncia NOT NULL DEFAULT 'ABERTA',
    moderador_id   BIGINT REFERENCES administrador(usuario_id) ON DELETE SET NULL,
    criada_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolvida_em   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- 8. ASSINATURA BREADLE PLUS
-- ---------------------------------------------------------------------
CREATE TABLE assinatura_plus (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leitor_id   BIGINT NOT NULL REFERENCES leitor(usuario_id) ON DELETE CASCADE,
    inicio      DATE NOT NULL DEFAULT CURRENT_DATE,
    fim         DATE,
    ativa       BOOLEAN NOT NULL DEFAULT TRUE,
    valor_mensal NUMERIC(8,2) NOT NULL CHECK (valor_mensal >= 0)
);

-- ---------------------------------------------------------------------
-- 9. TRIGGERS
-- ---------------------------------------------------------------------

-- 9.1 Atualiza pontos_totais do leitor a cada lançamento
CREATE OR REPLACE FUNCTION fn_atualiza_pontos() RETURNS TRIGGER AS $$
BEGIN
    UPDATE leitor SET pontos_totais = GREATEST(pontos_totais + NEW.pontos, 0)
     WHERE usuario_id = NEW.leitor_id;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualiza_pontos AFTER INSERT ON pontuacao
FOR EACH ROW EXECUTE FUNCTION fn_atualiza_pontos();

-- 9.2 Garante que o tipo do usuário combina com a tabela filha
CREATE OR REPLACE FUNCTION fn_valida_tipo_usuario() RETURNS TRIGGER AS $$
DECLARE esperado tipo_usuario;
BEGIN
    esperado := TG_ARGV[0]::tipo_usuario;
    IF (SELECT tipo FROM usuario WHERE id = NEW.usuario_id) <> esperado THEN
        RAISE EXCEPTION 'Usuário % não é do tipo %', NEW.usuario_id, esperado;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tipo_leitor BEFORE INSERT ON leitor
FOR EACH ROW EXECUTE FUNCTION fn_valida_tipo_usuario('LEITOR');
CREATE TRIGGER trg_tipo_professor BEFORE INSERT ON professor
FOR EACH ROW EXECUTE FUNCTION fn_valida_tipo_usuario('PROFESSOR');
CREATE TRIGGER trg_tipo_admin BEFORE INSERT ON administrador
FOR EACH ROW EXECUTE FUNCTION fn_valida_tipo_usuario('ADMINISTRADOR');

-- 9.3 Salva progresso e maior página lida (base para anti-spoiler)
CREATE OR REPLACE FUNCTION fn_leitura_progresso() RETURNS TRIGGER AS $$
BEGIN
    NEW.maior_pagina_lida := GREATEST(COALESCE(OLD.maior_pagina_lida, 0), NEW.pagina_atual);
    NEW.atualizada_em := now();
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leitura_progresso BEFORE UPDATE OF pagina_atual ON leitura
FOR EACH ROW EXECUTE FUNCTION fn_leitura_progresso();

-- 9.4 Professor só adiciona alunos à própria turma educacional (RF53) e
--     aluno menor só entra com consentimento (RNF25)
CREATE OR REPLACE FUNCTION fn_valida_turma_aluno() RETURNS TRIGGER AS $$
DECLARE a aluno%ROWTYPE;
BEGIN
    SELECT * INTO a FROM aluno WHERE usuario_id = NEW.aluno_id;
    IF a.menor_de_idade AND NOT a.consentimento_ok THEN
        RAISE EXCEPTION 'Aluno menor de idade sem consentimento do responsável';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_turma_aluno BEFORE INSERT ON turma_aluno
FOR EACH ROW EXECUTE FUNCTION fn_valida_turma_aluno();

-- 9.5 Sincroniza consentimento_ok com a autorização do responsável
CREATE OR REPLACE FUNCTION fn_sync_consentimento() RETURNS TRIGGER AS $$
BEGIN
    UPDATE aluno SET consentimento_ok = (NEW.status = 'AUTORIZADO')
     WHERE usuario_id = NEW.aluno_id;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_consentimento AFTER INSERT OR UPDATE OF status ON autorizacao_responsavel
FOR EACH ROW EXECUTE FUNCTION fn_sync_consentimento();

-- ---------------------------------------------------------------------
-- 10. ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX idx_livro_busca     ON livro USING gin (to_tsvector('portuguese', titulo || ' ' || autor));
CREATE INDEX idx_leitura_leitor  ON leitura (leitor_id);
CREATE INDEX idx_sessao_leitura  ON sessao_leitura (leitura_id, status);
CREATE INDEX idx_pergunta_sessao ON pergunta (sessao_id);
CREATE INDEX idx_pontuacao_leitor ON pontuacao (leitor_id, criado_em);
CREATE INDEX idx_missao_leitor   ON missao_leitor (leitor_id, concluida);
CREATE INDEX idx_turma_prof      ON turma (professor_id);
CREATE INDEX idx_denuncia_status ON denuncia (status);
CREATE INDEX idx_leitor_regiao   ON leitor (pais, estado, cidade);

-- ---------------------------------------------------------------------
-- 11. VIEWS (rankings, painel do professor, cota de IA)
-- ---------------------------------------------------------------------

-- Estatísticas por leitor. Missões/pontos educacionais ficam fora (RF56, RNF24).
CREATE VIEW vw_estatisticas_leitor AS
SELECT
    l.usuario_id AS leitor_id,
    u.nome,
    l.cidade, l.estado, l.pais,
    COALESCE((SELECT SUM(p.pontos) FROM pontuacao p
               WHERE p.leitor_id = l.usuario_id AND p.conta_ranking_geral), 0) AS pontos,
    COALESCE((SELECT COUNT(*) FROM leitura r
               WHERE r.leitor_id = l.usuario_id AND r.concluida), 0)           AS livros_lidos,
    COALESCE((SELECT SUM(GREATEST(s.pagina_fim - s.pagina_inicio, 0))
                FROM sessao_leitura s JOIN leitura r ON r.id = s.leitura_id
               WHERE r.leitor_id = l.usuario_id AND s.status = 'CONCLUIDA'), 0) AS paginas_lidas,
    COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (s.encerrada_em - s.iniciada_em)) / 60)
                FROM sessao_leitura s JOIN leitura r ON r.id = s.leitura_id
               WHERE r.leitor_id = l.usuario_id AND s.status = 'CONCLUIDA'), 0)::INT AS minutos_leitura
FROM leitor l
JOIN usuario u ON u.id = l.usuario_id
WHERE u.ativo
  AND NOT EXISTS (SELECT 1 FROM aluno a WHERE a.usuario_id = l.usuario_id); -- aluno fica no ambiente educacional

-- Ranking com posição em cada categoria + ranking geral (média das posições). RF45/RF46.
-- Para filtrar por região (RF47): WHERE estado = 'SP' (cidade/estado/país); global = sem filtro.
CREATE VIEW vw_ranking AS
WITH posicoes AS (
    SELECT e.*,
           RANK() OVER (ORDER BY pontos          DESC) AS pos_pontos,
           RANK() OVER (ORDER BY livros_lidos    DESC) AS pos_livros,
           RANK() OVER (ORDER BY paginas_lidas   DESC) AS pos_paginas,
           RANK() OVER (ORDER BY minutos_leitura DESC) AS pos_tempo
      FROM vw_estatisticas_leitor e
)
SELECT p.*,
       (pos_pontos + pos_livros + pos_paginas + pos_tempo) / 4.0 AS media_posicoes,
       RANK() OVER (ORDER BY (pos_pontos + pos_livros + pos_paginas + pos_tempo) ASC) AS pos_geral
  FROM posicoes p;

-- Ranking de grupos: grupos competem apenas com grupos (RF48)
CREATE VIEW vw_ranking_grupos AS
SELECT s.id AS grupo_id, s.nome,
       COUNT(DISTINCT m.leitor_id)  AS membros,
       COALESCE(SUM(e.pontos), 0)   AS pontos,
       COALESCE(SUM(e.livros_lidos), 0)  AS livros_lidos,
       COALESCE(SUM(e.paginas_lidas), 0) AS paginas_lidas,
       COALESCE(SUM(e.minutos_leitura), 0) AS minutos_leitura,
       RANK() OVER (ORDER BY COALESCE(SUM(e.pontos), 0) DESC) AS pos_pontos
  FROM sala s
  JOIN sala_membro m ON m.sala_id = s.id
  LEFT JOIN vw_estatisticas_leitor e ON e.leitor_id = m.leitor_id
 WHERE s.tipo = 'GRUPO'
 GROUP BY s.id, s.nome;

-- Painel do professor: progresso e histórico dos alunos (RF22, RF55)
CREATE VIEW vw_painel_professor AS
SELECT t.professor_id, t.id AS turma_id, t.nome AS turma,
       a.usuario_id AS aluno_id, u.nome AS aluno,
       lv.titulo AS livro, r.pagina_atual, lv.total_paginas,
       ROUND(100.0 * r.pagina_atual / lv.total_paginas, 1) AS percentual,
       r.concluida,
       (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE q.correta) / NULLIF(COUNT(q.id), 0), 1)
          FROM sessao_leitura s JOIN pergunta q ON q.sessao_id = s.id
         WHERE s.leitura_id = r.id) AS acerto_perguntas_pct   -- evidência de leitura real
  FROM turma t
  JOIN turma_aluno ta ON ta.turma_id = t.id
  JOIN aluno a        ON a.usuario_id = ta.aluno_id
  JOIN usuario u      ON u.id = a.usuario_id
  LEFT JOIN indicacao_leitura il ON il.turma_id = t.id
  LEFT JOIN leitura r  ON r.leitor_id = a.usuario_id AND r.livro_id = il.livro_id
  LEFT JOIN livro lv   ON lv.id = r.livro_id;

-- Uso diário de IA vs. limite do plano (RNF23)
CREATE VIEW vw_uso_ia_hoje AS
SELECT l.usuario_id AS leitor_id, l.plano,
       COUNT(i.id) AS usos_hoje, c.limite_diario,
       c.limite_diario - COUNT(i.id) AS restante
  FROM leitor l
  JOIN cota_ia c ON c.plano = l.plano
  LEFT JOIN interacao_ia i ON i.leitor_id = l.usuario_id AND i.criada_em::date = CURRENT_DATE
 GROUP BY l.usuario_id, l.plano, c.limite_diario;

-- Dados agregados e anônimos para editoras (sem identificar leitores)
CREATE VIEW vw_dados_editoras AS
SELECT lv.id AS livro_id, lv.titulo, lv.editora_id,
       COUNT(DISTINCT r.leitor_id)              AS leitores,
       COUNT(*) FILTER (WHERE r.concluida)      AS conclusoes,
       ROUND(AVG(av.nota), 2)                   AS nota_media
  FROM livro lv
  LEFT JOIN leitura r ON r.livro_id = lv.id
  LEFT JOIN avaliacao_livro av ON av.livro_id = lv.id
 GROUP BY lv.id, lv.titulo, lv.editora_id;

-- ---------------------------------------------------------------------
-- 12. DADOS INICIAIS
-- ---------------------------------------------------------------------
INSERT INTO cota_ia (plano, limite_diario) VALUES ('GRATUITO', 20), ('PLUS', 100);

INSERT INTO conquista (nome, criterio, pontos_min, livros_min, paginas_min) VALUES
 ('Primeiro Capítulo', 'Concluir a primeira sessão de leitura', NULL, NULL, 1),
 ('Leitor Constante',  'Ler 500 páginas',                      NULL, NULL, 500),
 ('Devorador de Livros','Concluir 5 livros',                   NULL, 5,    NULL),
 ('Mil Pontos',        'Acumular 1000 pontos',                 1000, NULL, NULL);

INSERT INTO sala (tipo, nome, escopo, regiao) VALUES
 ('REGIONAL', 'Brasil',           'PAIS',   'Brasil'),
 ('REGIONAL', 'Global',           'GLOBAL', 'Mundo'),
 ('REGIONAL', 'São Paulo (SP)',   'ESTADO', 'SP');

-- Exemplo mínimo de acervo em domínio público
INSERT INTO livro (titulo, autor, origem, fonte_origem, tipo, dificuldade, pontuacao_base, total_paginas) VALUES
 ('Dom Casmurro',                 'Machado de Assis', 'DOMINIO_PUBLICO', 'Domínio Público/MEC', 'LITERATURA', 3, 30, 256),
 ('Memórias Póstumas de Brás Cubas','Machado de Assis','DOMINIO_PUBLICO', 'Domínio Público/MEC', 'LITERATURA', 3, 30, 240),
 ('O Alienista',                  'Machado de Assis', 'DOMINIO_PUBLICO', 'Domínio Público/MEC', 'LITERATURA', 2, 20, 80);

-- =====================================================================
-- FIM
-- =====================================================================
