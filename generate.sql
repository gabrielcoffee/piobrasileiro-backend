-- Pio Brasileiro — database schema (aligned with production).
-- Run on a fresh PostgreSQL database:
--   psql <dbname> < generate.sql
-- Requires a superuser/role allowed to CREATE EXTENSION.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== ENUM types =====
CREATE TYPE genero_enum AS ENUM ('m', 'f');
CREATE TYPE tipo_usuario_enum AS ENUM ('admin', 'comum');
CREATE TYPE tipo_documento_enum AS ENUM ('cpf', 'id_internacional');
CREATE TYPE status_hospedagem_enum AS ENUM ('prevista', 'ativa', 'encerrada');
CREATE TYPE refeicao_tipo_enum AS ENUM ('usuario', 'hospede', 'convidado');
CREATE TYPE refeicao_pref_enum AS ENUM ('apenas_cafe', 'cafe_almoco', 'cafe_janta', 'cafe_almoco_janta', 'decidir_depois');
CREATE TYPE forma_pagamento_enum AS ENUM ('wise', 'dinheiro');
CREATE TYPE pre_reserva_status_enum AS ENUM ('nao_validada', 'validada');

-- ===== Tables =====
CREATE TABLE user_auth (
    id           uuid              DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email        varchar(320)      NOT NULL UNIQUE
        CONSTRAINT valid_email
            CHECK ((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
    password     varchar(255)      NOT NULL,
    tipo_usuario tipo_usuario_enum DEFAULT 'comum'::tipo_usuario_enum,
    active       boolean           DEFAULT true,
    criado_em    timestamp         DEFAULT now()
);

CREATE TABLE perfil (
    user_id           uuid         NOT NULL PRIMARY KEY
        REFERENCES user_auth ON DELETE CASCADE,
    nome_completo     varchar(100) NOT NULL,
    data_nasc         date,
    genero            genero_enum,
    funcao            varchar(100),
    num_documento     varchar(20),
    tipo_documento    tipo_documento_enum,
    avatar_image_data bytea,
    observacoes       varchar(255),
    criado_em         timestamp DEFAULT now()
);

CREATE TABLE solicitacao (
    id                  uuid         DEFAULT gen_random_uuid()     NOT NULL PRIMARY KEY,
    nome                varchar(100)                               NOT NULL,
    telefone            varchar(20)                                NOT NULL,
    email               varchar(200)                               NOT NULL,
    data_chegada        date                                       NOT NULL,
    data_saida          date                                       NOT NULL,
    num_pessoas         integer                                    NOT NULL,
    visualizada         boolean      DEFAULT false,
    criado_em           timestamp    DEFAULT now(),
    nacionalidade       varchar(100) DEFAULT ''::character varying NOT NULL,
    quantidade_adultos  integer      DEFAULT 0                     NOT NULL,
    quantidade_criancas integer      DEFAULT 0                     NOT NULL,
    voce_e_padre        boolean      DEFAULT false                 NOT NULL
);

CREATE TABLE quarto (
    id         uuid    DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    numero     varchar(25)                       NOT NULL,
    capacidade integer                           NOT NULL,
    active     boolean DEFAULT true
);

CREATE TABLE hospede (
    id             uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome           varchar(100)                        NOT NULL,
    genero         genero_enum,
    tipo_documento tipo_documento_enum,
    num_documento  varchar(20),
    funcao         varchar(100),
    origem         varchar(100),
    observacoes    varchar(255),
    idade          smallint,
    criado_em      timestamp DEFAULT now()
);

CREATE TABLE hospedagem (
    id           uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    anfitriao_id uuid                                NOT NULL
        REFERENCES perfil ON DELETE CASCADE,
    hospede_id   uuid                                NOT NULL
        REFERENCES hospede ON DELETE CASCADE,
    data_chegada date                                NOT NULL,
    data_saida   date                                NOT NULL,
    quarto_id    uuid                                NOT NULL
        REFERENCES quarto ON DELETE CASCADE,
    criado_em    timestamp DEFAULT now(),
    almoco       boolean   DEFAULT false,
    janta        boolean   DEFAULT false,
    cafe         boolean   DEFAULT false,
    forma_pagamento forma_pagamento_enum
);

CREATE TABLE convidado (
    id           uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    anfitriao_id uuid
        REFERENCES perfil ON DELETE CASCADE,
    nome         varchar(100)                        NOT NULL,
    funcao       varchar(50),
    origem       varchar(100),
    observacoes  varchar(255),
    criado_em    timestamp DEFAULT now()
);

CREATE TABLE refeicao (
    id             uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tipo_pessoa    refeicao_tipo_enum                  NOT NULL,
    usuario_id     uuid REFERENCES perfil    ON DELETE CASCADE,
    hospede_id     uuid REFERENCES hospede   ON DELETE CASCADE,
    convidado_id   uuid REFERENCES convidado ON DELETE CASCADE,
    data           date                                NOT NULL,
    almoco_colegio boolean   DEFAULT false,
    almoco_levar   boolean   DEFAULT false,
    janta_colegio  boolean   DEFAULT false,
    criado_em      timestamp DEFAULT now(),
    CONSTRAINT unique_user_date UNIQUE (usuario_id, data),
    CONSTRAINT refeicao_check CHECK (
        ((tipo_pessoa = 'usuario'::refeicao_tipo_enum)   AND (usuario_id IS NOT NULL) AND (hospede_id IS NULL)     AND (convidado_id IS NULL)) OR
        ((tipo_pessoa = 'hospede'::refeicao_tipo_enum)   AND (usuario_id IS NULL)     AND (hospede_id IS NOT NULL) AND (convidado_id IS NULL)) OR
        ((tipo_pessoa = 'convidado'::refeicao_tipo_enum) AND (usuario_id IS NULL)     AND (hospede_id IS NULL)     AND (convidado_id IS NOT NULL))
    )
);

CREATE TABLE password_reset (
    id         uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id    uuid REFERENCES user_auth ON DELETE CASCADE,
    token_hash varchar(255)                        NOT NULL,
    expires_at timestamp DEFAULT (now() + '01:00:00'::interval),
    created_at timestamp DEFAULT now()
);

CREATE TABLE datas_refeicao_bloqueadas (
    id        uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    data      date                                NOT NULL
        CONSTRAINT unique_blocked_date UNIQUE,
    criado_em timestamp DEFAULT now()
);

-- Pré-reserva: intake do Google Forms. Vira hospedagem(s) na validação.
CREATE TABLE pre_reserva (
    id                  uuid      DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    solicitacao_id      uuid      REFERENCES solicitacao(id) ON DELETE SET NULL,
    email               varchar(320)                        NOT NULL,
    nome_solicitante    varchar(100)                        NOT NULL,
    data_entrada        date                                NOT NULL,
    data_saida          date                                NOT NULL,
    horario_chegada     time,
    restricao_alimentar text,
    refeicoes           refeicao_pref_enum                  NOT NULL,
    forma_pagamento     forma_pagamento_enum                NOT NULL,
    observacao          text,
    hospedes            jsonb     NOT NULL DEFAULT '[]',
    hospedes_raw        text                                NOT NULL,
    status              pre_reserva_status_enum NOT NULL DEFAULT 'nao_validada',
    validada_em         timestamp,
    criado_em           timestamp DEFAULT now(),
    CONSTRAINT pre_reserva_datas_check CHECK (data_entrada <= data_saida)
);

-- ===== Functions =====
-- Removes a refeicao row when both meal flags are false on insert/update.
-- Usage: fires automatically via refeicao_cleanup_trigger below; not called directly.
CREATE FUNCTION refeicao_cleanup() RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
  -- if both meals are false, remove the row
  IF NEW.almoco_colegio = false AND NEW.janta_colegio = false THEN
    DELETE FROM refeicao
    WHERE usuario_id = NEW.usuario_id
      AND data = NEW.data;
    RETURN NULL; -- prevents the row from being inserted/updated
  END IF;
  RETURN NEW; -- keep the row
END;
$$;

-- ===== Triggers =====
CREATE TRIGGER refeicao_cleanup_trigger
    AFTER INSERT OR UPDATE
    ON refeicao
    FOR EACH ROW
EXECUTE PROCEDURE refeicao_cleanup();
