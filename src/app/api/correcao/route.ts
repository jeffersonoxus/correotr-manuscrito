import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

const EXTRACT_TEXT_PROMPT = `Transcreva EXATAMENTE todo o texto escrito nesta imagem, linha por linha. Não explique, não interprete, não corrija erros. Preserve a ortografia e símbolos matemáticos do aluno. Use ^ para potência, / para fração, sqrt() para raiz. Se não conseguir ler algo, escreva [ilegível].`;

function CORRECTION_PROMPT(
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
${rubrica || "O professor não forneceu rubrica específica."}

RESPOSTA(S) ESPERADA(S) (gabarito):
${gabarito || "Não fornecido"}

RESPOSTA DO ALUNO (transcrição da imagem):
"""
${textoExtraido}
"""

Analise comparando a resposta do aluno com a(s) resposta(s) esperada(s). Considere o raciocínio matemático, a resolução passo a passo e estratégias alternativas.

Responda APENAS neste formato, sem explicações adicionais:

NOTA: (número entre 0 e ${valorMaximo}, use . para decimal)

COMENTARIO: (breve explicação comparando com a resposta esperada, o que o aluno acertou/errou)
`;
}

async function extractTextWithGemini(imageBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key não encontrada");

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: EXTRACT_TEXT_PROMPT },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        ],
      }],
      generationConfig: { maxOutputTokens: 4000, temperature: 0 },
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("GEMINI_RATE_LIMIT");
    throw new Error(`Gemini: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: resposta vazia");
  return text;
}

async function analyzeWithGroq(prompt: string): Promise<{ nota: number; comentario: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key não encontrada");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Groq: ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  return parseResult(content);
}

async function analyzeWithDeepSeek(prompt: string): Promise<{ nota: number; comentario: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API key não encontrada");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`DeepSeek: ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  return parseResult(content);
}

function parseResult(content: string): { nota: number; comentario: string } {
  const notaMatch = content.match(/NOTA:\s*([\d.]+)/i);
  const comentarioMatch = content.match(/COMENTARIO:\s*([\s\S]+)/i);

  const nota = notaMatch ? parseFloat(notaMatch[1]) : 0;
  const comentario = comentarioMatch ? comentarioMatch[1].trim() : "Sem comentário";

  return { nota, comentario };
}

export async function POST(req: NextRequest) {
  try {
    const { provaId, alunoId, questoes: questoesData } = await req.json();

    if (!provaId || !alunoId || !questoesData) {
      return Response.json({ error: "provaId, alunoId e questoes são obrigatórios" }, { status: 400 });
    }

    const correcaoId = nanoid(10);
    let totalNota = 0;

    const { error: erroInsert } = await supabase.from("correcoes").insert({
      id: correcaoId,
      prova_id: provaId,
      aluno_id: alunoId,
      status: "em_andamento",
      total_nota: 0,
    });
    if (erroInsert) throw new Error(erroInsert.message);

    const { data: questoesDB } = await supabase.from("questoes").select("*").eq("prova_id", provaId);
    if (!questoesDB) throw new Error("Erro ao buscar questões");

    for (const item of questoesData) {
      const questao = questoesDB.find((q) => q.id === item.questaoId);
      if (!questao) continue;

      let textoExtraido = "";
      let nota = 0;
      let comentario = "Falha na correção automática";

      try {
        if (item.imageBase64) {
          textoExtraido = await extractTextWithGemini(item.imageBase64);
        } else if (item.textoManual) {
          textoExtraido = item.textoManual;
        }

        if (textoExtraido) {
          const prompt = CORRECTION_PROMPT(
            "Aluno",
            questao.numero,
            questao.enunciado,
            questao.valor_maximo,
            questao.rubrica || "",
            questao.gabarito || "",
            questao.bncc || "",
            textoExtraido
          );

          try {
            const result = await analyzeWithGroq(prompt);
            nota = result.nota;
            comentario = result.comentario;
          } catch {
            try {
              const result = await analyzeWithDeepSeek(prompt);
              nota = result.nota;
              comentario = result.comentario;
            } catch {
              comentario = "Extraído, mas falha na correção por IA. Corrija manualmente.";
            }
          }
        } else {
          comentario = "Nenhuma resposta enviada para esta questão";
        }
      } catch (error: any) {
        if (error.message === "GEMINI_RATE_LIMIT") {
          textoExtraido = "[Limite do Gemini excedido. Insira manualmente.]";
          comentario = "Limite de requisições excedido. Insira a nota manualmente.";
        } else {
          comentario = `Erro: ${error.message}. Insira manualmente.`;
        }
      }

      totalNota += nota;

      const { error: erroResposta } = await supabase.from("respostas").insert({
        id: nanoid(10),
        correcao_id: correcaoId,
        questao_id: item.questaoId,
        imagem_path: item.imagemPath || "",
        texto_extraido: textoExtraido,
        nota,
        comentario,
      });
      if (erroResposta) throw new Error(erroResposta.message);
    }

    const { error: erroUpdate } = await supabase.from("correcoes").update({ status: "concluido", total_nota: totalNota }).eq("id", correcaoId);
    if (erroUpdate) throw new Error(erroUpdate.message);

    return Response.json({
      success: true,
      correcaoId,
      totalNota,
    });
  } catch (error) {
    console.error("Erro na correção:", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
