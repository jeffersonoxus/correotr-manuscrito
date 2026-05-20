"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Users } from "lucide-react";

interface Turma {
  id: string;
  nome: string;
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const router = useRouter();

  const carregar = () => {
    fetch("/api/turmas")
      .then((r) => r.json())
      .then((data) => setTurmas(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) return router.push("/");
    carregar();
  }, [router]);

  const criar = async () => {
    if (!novoNome.trim()) return;
    await fetch("/api/turmas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome }),
    });
    setNovoNome("");
    carregar();
  };

  const deletar = async (id: string) => {
    if (!confirm("Excluir esta turma?")) return;
    await fetch("/api/turmas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    carregar();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">Turmas</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold mb-3">Nova Turma</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: 3º Ano A - Matemática"
              className="flex-1 border rounded-lg p-2.5"
              onKeyDown={(e) => e.key === "Enter" && criar()}
            />
            <button onClick={criar} className="bg-blue-600 text-white px-4 rounded-lg flex items-center gap-1 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Criar
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {turmas.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
              <div>
                <span className="font-medium">{t.nome}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/turmas/${t.id}`)}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                >
                  Alunos
                </button>
                <button onClick={() => deletar(t.id)} className="text-red-500 hover:text-red-700 p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {turmas.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhuma turma cadastrada.</p>
          )}
        </div>
      </main>
    </div>
  );
}
