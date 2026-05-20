"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, ArrowLeft, User, FileText } from "lucide-react";

interface Aluno {
  id: string;
  turmaId: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
}

export default function TurmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [turma, setTurma] = useState<Turma | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [importText, setImportText] = useState("");

  const carregar = () => {
    fetch(`/api/alunos?turmaId=${params.id}`)
      .then((r) => r.json())
      .then(setAlunos);
    fetch("/api/turmas")
      .then((r) => r.json())
      .then((all) => setTurma(all.find((t: Turma) => t.id === params.id) || null));
  };

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) return router.push("/");
    carregar();
  }, [params.id, router]);

  const criar = async () => {
    if (!novoNome.trim()) return;
    await fetch("/api/alunos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turmaId: params.id, nome: novoNome }),
    });
    setNovoNome("");
    carregar();
  };

  const importar = async () => {
    const nomes = importText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    for (const nome of nomes) {
      await fetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId: params.id, nome }),
      });
    }
    setImportText("");
    carregar();
  };

  const deletar = async (id: string) => {
    if (!confirm("Excluir este aluno?")) return;
    await fetch("/api/alunos", {
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
          <button onClick={() => router.push("/turmas")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <User className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">{turma?.nome || "Carregando..."}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold mb-3">Adicionar Aluno</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do aluno"
              className="flex-1 border rounded-lg p-2.5"
              onKeyDown={(e) => e.key === "Enter" && criar()}
            />
            <button onClick={criar} className="bg-blue-600 text-white px-4 rounded-lg flex items-center gap-1 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          <details className="text-sm">
            <summary className="text-blue-600 cursor-pointer hover:underline">Importar lista (um nome por linha)</summary>
            <div className="mt-2 space-y-2">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full border rounded-lg p-2.5 h-24 text-sm"
                placeholder="Maria Silva&#10;João Santos&#10;Ana Oliveira"
              />
              <button onClick={importar} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                Importar
              </button>
            </div>
          </details>
        </div>

        <div className="space-y-2">
          {alunos.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
              <span className="font-medium">{a.nome}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/provas?alunoId=${a.id}`)}
                  className="text-sm bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Provas
                </button>
                <button onClick={() => deletar(a.id)} className="text-red-500 hover:text-red-700 p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {alunos.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhum aluno nesta turma.</p>
          )}
        </div>
      </main>
    </div>
  );
}
