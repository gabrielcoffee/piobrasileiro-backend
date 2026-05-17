-- F2a — pré-reserva via Google Forms. Additive, reversible.
-- No migration runner: apply manually.
--   UP:       psql <db> -f this_file   (UP section only)
--   ROLLBACK: run the ROLLBACK section only.
-- Test on Docker DB (localhost:5433) before prod. Keep generate.sql in sync.

-- ===== UP =====
BEGIN;

CREATE TYPE refeicao_pref_enum AS ENUM (
  'apenas_cafe','cafe_almoco','cafe_janta','cafe_almoco_janta','decidir_depois'
);
CREATE TYPE forma_pagamento_enum AS ENUM ('wise','dinheiro');
CREATE TYPE pre_reserva_status_enum AS ENUM ('nao_validada','validada');

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

ALTER TABLE hospede ADD COLUMN idade smallint;

COMMIT;

-- ===== ROLLBACK =====
-- BEGIN;
-- ALTER TABLE hospede DROP COLUMN idade;
-- DROP TABLE pre_reserva;
-- DROP TYPE pre_reserva_status_enum;
-- DROP TYPE forma_pagamento_enum;
-- DROP TYPE refeicao_pref_enum;
-- COMMIT;
