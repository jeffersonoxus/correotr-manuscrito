import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { toCamelCase } from "@/lib/caseHelper";
import { nanoid } from "nanoid";

export async function GET() {
  const { data, error } = await supabase.from("turmas").select("*").order("created_at");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(toCamelCase(data));
}

export async function POST(req: NextRequest) {
  const { nome } = await req.json();
  if (!nome) return Response.json({ error: "Nome é obrigatório" }, { status: 400 });
  const id = nanoid(10);
  const { error } = await supabase.from("turmas").insert({ id, nome });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id, nome });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "ID é obrigatório" }, { status: 400 });
  const { error } = await supabase.from("turmas").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
