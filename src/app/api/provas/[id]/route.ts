import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { toCamelCase } from "@/lib/caseHelper";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: prova, error: erroProva } = await supabase.from("provas").select("*").eq("id", id).single();
  if (erroProva) return Response.json({ error: "Prova não encontrada" }, { status: 404 });

  const { data: questoes } = await supabase.from("questoes").select("*").eq("prova_id", id).order("numero");
  const { data: correcoes } = await supabase.from("correcoes").select("*").eq("prova_id", id);
  const { data: alunos } = await supabase.from("alunos").select("*").eq("turma_id", prova.turma_id);

  const correcoesComAlunos = await Promise.all(
    (correcoes || []).map(async (c: any) => {
      const { data: aluno } = await supabase.from("alunos").select("nome").eq("id", c.aluno_id).single();
      return { ...c, aluno };
    })
  );

  return Response.json(toCamelCase({
    ...prova,
    questoes: questoes || [],
    correcoes: correcoesComAlunos || [],
    alunos: alunos || [],
  }));
}
