import { NextRequest } from "next/server";

// Dynamic import of pdfjs-dist legacy build for Node.js
async function getPdfjs() {
  const mod = await import("pdfjs-dist/legacy/build/pdf.mjs") as any;
  mod.default.GlobalWorkerOptions.workerSrc = "";
  return mod.default;
}

export const maxDuration = 60;
export const runtime = "nodejs";

const EXTRACT_PROMPT = `Analise esta prova de matemática em PDF e extraia as informações no formato JSON abaixo.

Para cada questão, você DEVE:
1. Identificar o enunciado completo
2. Sugerir um valor máximo de pontos (baseado na complexidade)
3. Listar 1 a 3 estratégias de RESPOSTA ESPERADA (passo a passo, considerando diferentes formas de resolver)
4. Identificar a(s) habilidade(s) da BNCC de Matemática do Ensino Médio que se aplicam (ex: EM13MAT310, EM13MAT311, EM13MAT301, etc.)
5. Escrever uma rubrica de correção detalhada (critérios)

Responda EXATAMENTE neste formato JSON, sem explicações adicionais:

\`\`\`json
{
  "titulo": "título sugerido para a prova",
  "descricao": "breve descrição do conteúdo",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "texto completo da questão 1",
      "valorMaximoSugerido": 10,
      "respostasEsperadas": [
        "Estratégia 1: explicação passo a passo...",
        "Estratégia 2: forma alternativa de resolver..."
      ],
      "bncc": ["EM13MAT310"],
      "rubrica": "Critérios de correção detalhados com pontuação"
    }
  ]
}
\`\`\`

REGRAS IMPORTANTES:
- Cada questão pode ter MÚLTIPLAS estratégias de resposta
- Habilidades BNCC devem ser específicas da Matemática do Ensino Médio
- A rubrica deve detalhar como distribuir os pontos
- valorMaximoSugerido deve ser entre 2 e 20, dependendo da complexidade`;

const TEXT_EXTRACT_PROMPT = `Extraia o texto completo desta prova de matemática, preservando enunciados, valores e formatação. Transcreva exatamente como está no documento.`;

function parseJsonFromText(text: string) {
  let clean = text.trim();
  const jsonMatch = clean.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (jsonMatch) clean = jsonMatch[1].trim();
  return JSON.parse(clean);
}

function validateQuestoes(parsed: any) {
  if (!parsed.questoes || !Array.isArray(parsed.questoes) || parsed.questoes.length === 0) {
    throw new Error("Nenhuma questão identificada");
  }
  return parsed.questoes.map((q: any, idx: number) => ({
    numero: q.numero || idx + 1,
    enunciado: q.enunciado || "",
    valorMaximo: q.valorMaximoSugerido || 10,
    respostasEsperadas: q.respostasEsperadas || [],
    bncc: q.bncc || [],
    rubrica: q.rubrica || "",
  }));
}

async function extractWithGemini(base64: string): Promise<{ questoes: any[]; titulo: string; descricao: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key não configurada");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (tentativa > 0) await new Promise(r => setTimeout(r, 30000));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: EXTRACT_PROMPT },
            { inlineData: { mimeType: "application/pdf", data: base64 } },
          ],
        }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini não retornou conteúdo");
      const parsed = parseJsonFromText(text);
      return { questoes: validateQuestoes(parsed), titulo: parsed.titulo || "Prova sem título", descricao: parsed.descricao || "" };
    }

    const errText = await res.text();
    console.error(`Gemini erro (tentativa ${tentativa + 1}/2):`, res.status, errText);
    if (res.status !== 429 && res.status !== 503 && res.status < 500) {
      throw new Error(`Erro Gemini: ${res.status} - ${errText}`);
    }
    if (res.status === 429) throw new Error("GEMINI_RATE_LIMIT");
  }
  throw new Error("GEMINI_RATE_LIMIT");
}

async function extractTextWithPdfParse(buffer: Buffer): Promise<string> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(text);
    page.cleanup();
  }
  doc.destroy();
  return pages.join("\n\n");
}

async function analyzeWithGroq(text: string): Promise<{ questoes: any[]; titulo: string; descricao: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key não configurada");

  const prompt = `${EXTRACT_PROMPT}\n\nTEXTO DA PROVA:\n"""\n${text}\n"""`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Groq erro:", res.status, errText);
    throw new Error(`Groq: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq: resposta vazia");
  const parsed = parseJsonFromText(content);
  return { questoes: validateQuestoes(parsed), titulo: parsed.titulo || "Prova extraída", descricao: parsed.descricao || "" };
}

async function analyzeWithDeepSeek(text: string): Promise<{ questoes: any[]; titulo: string; descricao: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API key não configurada");

  const prompt = `${EXTRACT_PROMPT}\n\nTEXTO DA PROVA:\n"""\n${text}\n"""`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("DeepSeek erro:", res.status, errText);
    throw new Error(`DeepSeek: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek: resposta vazia");
  const parsed = parseJsonFromText(content);
  return { questoes: validateQuestoes(parsed), titulo: parsed.titulo || "Prova extraída", descricao: parsed.descricao || "" };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Gemini API key não configurada" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return Response.json({ error: "Nenhum PDF enviado" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "PDF deve ter no máximo 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // TENTATIVA 1: Gemini (visão direta no PDF)
    try {
      const result = await extractWithGemini(base64);
      return Response.json({ success: true, ...result, provider: "Gemini" });
    } catch (geminiError: any) {
      if (geminiError.message !== "GEMINI_RATE_LIMIT") {
        throw geminiError;
      }
      console.warn("⚠️ Gemini rate limit, tentando fallback...");
    }

    // TENTATIVA 2: Extrair texto do PDF e enviar para Groq
    let fallbackErrors: string[] = [];
    try {
      const pdfText = await extractTextWithPdfParse(buffer);
      if (pdfText.trim().length < 20) throw new Error(`Pouco texto extraído do PDF (${pdfText.trim().length} caracteres)`);
      console.log("📄 Texto extraído do PDF:", pdfText.substring(0, 200));
      const result = await analyzeWithGroq(pdfText);
      return Response.json({ success: true, ...result, provider: "Groq (fallback)" });
    } catch (groqError: any) {
      fallbackErrors.push(`Groq: ${groqError.message}`);
      console.warn("⚠️ Groq falhou:", groqError.message);
    }

    // TENTATIVA 3: DeepSeek como último recurso
    try {
      const pdfText = await extractTextWithPdfParse(buffer);
      if (pdfText.trim().length < 20) throw new Error(`Pouco texto extraído do PDF (${pdfText.trim().length} caracteres)`);
      const result = await analyzeWithDeepSeek(pdfText);
      return Response.json({ success: true, ...result, provider: "DeepSeek (fallback final)" });
    } catch (deepseekError: any) {
      fallbackErrors.push(`DeepSeek: ${deepseekError.message}`);
      console.error("❌ DeepSeek falhou:", deepseekError.message);
    }

    return Response.json({
      error: `Todos os serviços falharam. Gemini: limite excedido. ${fallbackErrors.join(". ")}`
    }, { status: 503 });
  } catch (error: any) {
    console.error("Erro upload-pdf:", error);
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      return Response.json({ error: "A requisição ao Gemini excedeu o tempo limite. Tente com um PDF menor ou tente novamente." }, { status: 504 });
    }
    const message = error?.message || "Erro interno do servidor";
    return Response.json({ error: message }, { status: 500 });
  }
}
