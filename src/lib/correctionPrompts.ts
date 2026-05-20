export const EXTRACT_TEXT_PROMPT = `
Transcreva EXATAMENTE todo o texto escrito nesta imagem, linha por linha.

REGRAS:
- Não explique.
- Não interprete.
- Não corrije ortografia ou erros matemáticos.
- Preserve erros do aluno.
- Não adicione palavras.
- Não remova linhas.
- Para símbolos matemáticos: use ^ para potência, / para fração, sqrt() para raiz.

Se alguma palavra ou símbolo não puder ser lido, escreva:
[ilegível]
`;

export function CORRECTION_PROMPT(
  alunoNome: string,
  questaoNumero: number,
  enunciado: string,
  valorMaximo: number,
  rubrica: string,
  gabarito: string,
  bncc: string,
  textoExtraido: string
) {
  return `
Você é um professor de matemática avaliando a resposta de um aluno.

ALUNO: ${alunoNome}
QUESTÃO Nº: ${questaoNumero}
ENUNCIADO: ${enunciado}
VALOR MÁXIMO: ${valorMaximo} pontos
HABILIDADE BNCC: ${bncc || "Não especificada"}

RUBRICA DE CORREÇÃO:
${rubrica || "O professor não forneceu rubrica específica. Use seu julgamento para avaliar a resposta."}

RESPOSTA(S) ESPERADA(S) (gabarito):
${gabarito || "Não fornecido"}

TEXTO EXTRAÍDO DA RESPOSTA DO ALUNO:
"""
${textoExtraido}
"""

Analise:
1. Compare a resposta do aluno com a(s) resposta(s) esperada(s)
2. Avalie o raciocínio matemático (não apenas o resultado final)
3. Considere a resolução passo a passo
4. Avalie o uso correto das fórmulas e operações
5. Considere estratégias alternativas de resolução

Responda APENAS neste formato, sem explicações adicionais:

NOTA: (número entre 0 e ${valorMaximo}, use . para decimal)

COMENTARIO: (breve explicação do que o aluno acertou/errou, comparando com a resposta esperada)
`;
}
