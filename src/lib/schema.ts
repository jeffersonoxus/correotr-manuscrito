export interface Turma {
  id: string
  nome: string
  created_at: string
}

export interface Aluno {
  id: string
  turma_id: string
  nome: string
  created_at: string
}

export interface Prova {
  id: string
  titulo: string
  descricao: string
  turma_id: string
  created_at: string
}

export interface Questao {
  id: string
  prova_id: string
  numero: number
  enunciado: string
  valor_maximo: number
  rubrica: string
  gabarito: string
  bncc: string
  created_at: string
}

export interface Correcao {
  id: string
  prova_id: string
  aluno_id: string
  status: string
  total_nota: number
  created_at: string
}

export interface Resposta {
  id: string
  correcao_id: string
  questao_id: string
  imagem_path: string
  texto_extraido: string
  nota: number
  comentario: string
}
