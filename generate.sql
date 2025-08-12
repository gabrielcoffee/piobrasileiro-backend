-- Tipos ENUM
CREATE TYPE genero_enum AS ENUM ('m', 'f');
CREATE TYPE tipo_usuario_enum AS ENUM ('admin', 'comum');
CREATE TYPE tipo_documento_enum AS ENUM ('cpf', 'id_internacional');
CREATE TYPE status_hospedagem_enum AS ENUM ('prevista', 'ativa', 'encerrada');
CREATE TYPE refeicao_tipo_enum AS ENUM ('usuario', 'hospede', 'convidado');

-- Extensão para geração de UUIDs aleatórios
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de autenticação de usuário
CREATE TABLE user_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  tipo_usuario tipo_usuario_enum default 'comum',
  active boolean default true,
  created_at TIMESTAMP DEFAULT now(),
  -- Constraints
  constraint valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tabela de perfis
CREATE TABLE perfil (
  user_id UUID PRIMARY KEY REFERENCES user_auth(id) ON DELETE CASCADE,
  nome_completo VARCHAR(100) NOT NULL,
  data_nasc DATE,
  genero genero_enum,
  funcao varchar(100),
  num_documento VARCHAR(20),
  tipo_documento tipo_documento_enum,
  avatar_url TEXT,
  criado_em TIMESTAMP DEFAULT now()
);

CREATE TABLE solicitacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome varchar(100) not null,
    num_telefone varchar(20) not null,
    email varchar(200) not null,
    data_chegada DATE NOT NULL,
    data_saida DATE NOT NULL,
    num_pessoas int not null,
    visualizada boolean default false,
    criado_em TIMESTAMP DEFAULT now()
);

CREATE TABLE quarto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero varchar(10) not null
);


CREATE TABLE hospede (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome varchar(100) not null,
    genero genero_enum not null,
    tipo_documento tipo_documento_enum not null,
    num_documento varchar(20) not null,
    funcao varchar(100),
    origem varchar(100),
    criado_em TIMESTAMP DEFAULT now()
);

-- Tabela de hospedagem
CREATE TABLE hospedagem (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anfitriao_id UUID not null references perfil(user_id) ON DELETE CASCADE,
    hospede_id UUID NOT NULL REFERENCES hospede(id) ON DELETE CASCADE,
    data_chegada DATE NOT NULL,
    data_saida DATE NOT NULL,
    quarto_id UUID NOT NULL REFERENCES quarto(id) ON DELETE CASCADE,
    status_hospedagem status_hospedagem_enum default 'prevista',
    criado_em TIMESTAMP DEFAULT now()
);

-- Tabela de convidados
CREATE TABLE convidado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anfitriao_id UUID REFERENCES perfil(user_id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    funcao VARCHAR(50),
    origem VARCHAR(100),
    data DATE not null,
    criado_em TIMESTAMP DEFAULT now()
);

-- Tabela de refeição
CREATE TABLE refeicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Tipo de pessoa que vai comer a refeicao
    tipo_pessoa refeicao_tipo_enum NOT NULL,
    usuario_id UUID NOT NULL REFERENCES perfil(user_id) ON DELETE CASCADE,
    hospede_id UUID REFERENCES hospede(id) ON DELETE CASCADE,
    convidado_id UUID REFERENCES convidado(id) ON DELETE CASCADE,

    data DATE NOT NULL,
    almoco_colegio BOOLEAN DEFAULT false,
    almoco_levar BOOLEAN DEFAULT false,
    janta_colegio BOOLEAN DEFAULT false,
    observacoes VARCHAR(255),
    criado_em TIMESTAMP DEFAULT now(),

    -- Constraints baseadas no tipo de pessoa
    CHECK (
        (tipo_pessoa = 'usuario' AND usuario_id IS NOT NULL AND hospede_id IS NULL AND convidado_id IS NULL) OR
        (tipo_pessoa = 'hospede' AND usuario_id IS NULL AND hospede_id IS NOT NULL AND convidado_id IS NULL) OR
        (tipo_pessoa = 'convidado' AND usuario_id IS NULL AND hospede_id IS NULL AND convidado_id IS NOT NULL)
    )
);

-- Function to get the room availability for a given week
-- First, create the occupied rooms table
CREATE TABLE quarto_ocupado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarto_id UUID REFERENCES quarto(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    hospedagem_id UUID REFERENCES hospedagem(id) ON DELETE CASCADE,
    UNIQUE(quarto_id, data)
);

-- Function to manage occupied room dates
CREATE OR REPLACE FUNCTION manage_quarto_ocupado()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new reservation)
    IF TG_OP = 'INSERT' THEN
        -- Only insert if status is 'prevista' or 'ativa'
        IF NEW.status_hospedagem IN ('prevista', 'ativa') THEN
            INSERT INTO quarto_ocupado (quarto_id, data, hospedagem_id)
            SELECT NEW.quarto_id, 
                   date_series.data,
                   NEW.id
            FROM generate_series(NEW.data_chegada, NEW.data_saida - interval '1 day', interval '1 day') AS date_series(data)
            ON CONFLICT (quarto_id, data) DO NOTHING;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE (reservation changed)
    IF TG_OP = 'UPDATE' THEN
        -- First, remove old occupied dates for this reservation
        DELETE FROM quarto_ocupado WHERE hospedagem_id = OLD.id;
        
        -- Then add new occupied dates if status is still active
        IF NEW.status_hospedagem IN ('prevista', 'ativa') THEN
            INSERT INTO quarto_ocupado (quarto_id, data, hospedagem_id)
            SELECT NEW.quarto_id, 
                   date_series.data,
                   NEW.id
            FROM generate_series(NEW.data_chegada, NEW.data_saida - interval '1 day', interval '1 day') AS date_series(data)
            ON CONFLICT (quarto_id, data) DO NOTHING;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE (reservation cancelled)
    IF TG_OP = 'DELETE' THEN
        DELETE FROM quarto_ocupado WHERE hospedagem_id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER hospedagem_ocupado_trigger
    AFTER INSERT OR UPDATE OR DELETE ON hospedagem
    FOR EACH ROW
    EXECUTE FUNCTION manage_quarto_ocupado();


-- Constraints
ALTER TABLE refeicao ADD CONSTRAINT unique_user_date UNIQUE(usuario_id, data);