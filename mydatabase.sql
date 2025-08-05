-- Tipos ENUM
CREATE TYPE genero_enum AS ENUM ('M', 'F');
CREATE TYPE tipo_usuario_enum AS ENUM ('Administrador', 'Comum', 'Hospede');
CREATE TYPE funcao_enum AS ENUM ('Padre', 'Mãe');

-- Extensão para geração de UUIDs aleatórios
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de autenticação de usuário
CREATE TABLE user_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de perfis
CREATE TABLE perfil (
  user_id UUID PRIMARY KEY REFERENCES user_auth(id),
  nome_completo VARCHAR(100) NOT NULL,
  data_nasc DATE,
  genero genero_enum,
  tipo_usuario tipo_usuario_enum,
  funcao funcao_enum,
  num_documento VARCHAR(20),
  tipo_documento VARCHAR(20),
  avatar_url TEXT,
  criado_em TIMESTAMP DEFAULT now()
);

-- Tabela de convidados
CREATE TABLE convidado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  funcao VARCHAR(50),
  origem VARCHAR(100),
  anfitriao_id UUID REFERENCES perfil(user_id),
  data DATE,
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
