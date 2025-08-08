-- Tipos ENUM
CREATE TYPE genero_enum AS ENUM ('m', 'f');
CREATE TYPE tipo_usuario_enum AS ENUM ('adm', 'comum');
CREATE TYPE tipo_documento_enum AS ENUM ('cpf', 'id_internacional');

-- Extensão para geração de UUIDs aleatórios
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de autenticação de usuário
CREATE TABLE user_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  tipo_usuario tipo_usuario_enum default 'comum',
  created_at TIMESTAMP DEFAULT now(),
  -- Constraints
  constraint valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tabela de perfis
CREATE TABLE perfil (
  user_id UUID PRIMARY KEY REFERENCES user_auth(id),
  nome_completo VARCHAR(100) NOT NULL,
  data_nasc DATE,
  genero genero_enum,
  funcao varchar(100),
  num_documento VARCHAR(20),
  tipo_documento tipo_documento_enum,
  avatar_url TEXT,
  criado_em TIMESTAMP DEFAULT now()
);

-- Tabela de hospedagem
CREATE TABLE hospedagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospede_id UUID NOT NULL REFERENCES perfil(user_id),
  data DATE NOT NULL,
  criado_em TIMESTAMP DEFAULT now()
);

-- Tabela de refeição
CREATE TABLE refeicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfil(user_id),
  data DATE NOT NULL,
  almoco BOOLEAN DEFAULT false,
  almoco_levar BOOLEAN DEFAULT false,
  janta BOOLEAN DEFAULT false,
  criado_em TIMESTAMP DEFAULT now(),
  CHECK (NOT almoco_levar OR almoco) -- se almoco_levar for true, almoco deve ser true
);

-- Tabela de convidados
CREATE TABLE convidado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anfitriao_id UUID REFERENCES perfil(user_id),
  refeicao_id UUID references refeicao(id),
  nome VARCHAR(100) NOT NULL,
  funcao VARCHAR(50),
  origem VARCHAR(100),
  data DATE not null,
  criado_em TIMESTAMP DEFAULT now()
);