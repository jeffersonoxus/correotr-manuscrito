-- Migration: criar tabelas do corretor-manuscrito no Supabase

CREATE TABLE IF NOT EXISTS turmas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alunos (
  id TEXT PRIMARY KEY,
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questoes (
  id TEXT PRIMARY KEY,
  prova_id TEXT NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  enunciado TEXT NOT NULL,
  valor_maximo REAL NOT NULL DEFAULT 10,
  rubrica TEXT DEFAULT '',
  gabarito TEXT DEFAULT '',
  bncc TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS correcoes (
  id TEXT PRIMARY KEY,
  prova_id TEXT NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente',
  total_nota REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS respostas (
  id TEXT PRIMARY KEY,
  correcao_id TEXT NOT NULL REFERENCES correcoes(id) ON DELETE CASCADE,
  questao_id TEXT NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  imagem_path TEXT DEFAULT '',
  texto_extraido TEXT DEFAULT '',
  nota REAL DEFAULT 0,
  comentario TEXT DEFAULT ''
);
