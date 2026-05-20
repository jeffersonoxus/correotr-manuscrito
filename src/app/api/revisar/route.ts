import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PUT(req: NextRequest) {
  try {
    const { respostaId, nota, comentario } = await req.json();
    if (!respostaId) return Response.json({ error: "respostaId é obrigatório" }, { status: 400 });

    const updateData: Record<string, any> = {};
    if (nota !== undefined) updateData.nota = nota;
    if (comentario !== undefined) updateData.comentario = comentario;

    const { error: erroResposta } = await supabase.from("respostas").update(updateData).eq("id", respostaId);
    if (erroResposta) throw new Error(erroResposta.message);

    const { data: resposta } = await supabase.from("respostas").select("correcao_id").eq("id", respostaId).single();
    if (resposta) {
      const { data: respostas } = await supabase.from("respostas").select("nota").eq("correcao_id", resposta.correcao_id);
      const totalNota = (respostas || []).reduce((sum: number, r: any) => sum + (r.nota || 0), 0);
      await supabase.from("correcoes").update({ total_nota: totalNota }).eq("id", resposta.correcao_id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro ao revisar:", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
