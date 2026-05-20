import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { toCamelCase } from "@/lib/caseHelper";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const turmaId = searchParams.get("turmaId");
  let query = supabase.from("alunos").select("*").order("created_at");
  if (turmaId) query = query.eq("turma_id", turmaId);
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(toCamelCase(data));
}

export async function POST(req: NextRequest) {
  const { turmaId, nome } = await req.json();
  if (!turmaId || !nome) return Response.json({ error: "turmaId e nome são obrigatórios" }, { status: 400 });
  const id = nanoid(10);
  const { error } = await supabase.from("alunos").insert({ id, turma_id: turmaId, nome });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id, turma_id: turmaId, nome });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "ID é obrigatório" }, { status: 400 });
  const { error } = await supabase.from("alunos").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
