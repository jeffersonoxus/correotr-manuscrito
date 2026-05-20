import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const turmaId = searchParams.get("turmaId");
  let query = supabase.from("provas").select("*").order("created_at", { ascending: false });
  if (turmaId) query = query.eq("turma_id", turmaId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const { titulo, descricao, turmaId, questoes: questoesData } = await req.json();
  if (!titulo || !turmaId) return Response.json({ error: "titulo e turmaId são obrigatórios" }, { status: 400 });

  const provaId = nanoid(10);
  const { error: erroProva } = await supabase.from("provas").insert({ id: provaId, titulo, descricao: descricao || "", turma_id: turmaId });
  if (erroProva) return Response.json({ error: erroProva.message }, { status: 500 });

  if (questoesData && Array.isArray(questoesData)) {
    const questoesToInsert = questoesData.map((q: any, i: number) => ({
      id: nanoid(10),
      prova_id: provaId,
      numero: i + 1,
      enunciado: q.enunciado,
      valor_maximo: q.valorMaximo ?? 10,
      rubrica: q.rubrica ?? "",
      gabarito: q.gabarito ?? "",
      bncc: q.bncc ?? "",
    }));
    const { error: erroQuestoes } = await supabase.from("questoes").insert(questoesToInsert);
    if (erroQuestoes) return Response.json({ error: erroQuestoes.message }, { status: 500 });
  }

  return Response.json({ id: provaId, titulo, descricao, turmaId });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "ID é obrigatório" }, { status: 400 });
  const { error } = await supabase.from("provas").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
