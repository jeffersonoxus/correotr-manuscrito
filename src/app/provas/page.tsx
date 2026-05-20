"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ArrowLeft, FileText, Users } from "lucide-react";

interface Prova {
  id: string;
  titulo: string;
  descricao: string;
  turmaId: string;
  createdAt: string;
}

interface Turma {
  id: string;
  nome: string;
}

export default function ProvasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
      <ProvasContent />
    </Suspense>
  );
}

function ProvasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [provas, setProvas] = useState<Prova[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) return router.push("/");
    Promise.all([
      fetch("/api/provas").then((r) => r.json()).catch(() => []),
      fetch("/api/turmas").then((r) => r.json()).catch(() => []),
    ]).then(([p, t]) => {
      setProvas(Array.isArray(p) ? p : []);
      setTurmas(Array.isArray(t) ? t : []);
    });
  }, [router]);

  const getTurmaNome = (turmaId: string) => turmas.find((t) => t.id === turmaId)?.nome || "---";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <FileText className="w-6 h-6 text-green-600" />
          <h1 className="text-xl font-bold">Provas</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => router.push("/provas/nova")}
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-1 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Nova Prova
          </button>
        </div>

        <div className="space-y-3">
          {provas.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{p.titulo}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3" /> {getTurmaNome(p.turmaId)}
                  </p>
                  {p.descricao && <p className="text-sm text-gray-600 mt-1">{p.descricao}</p>}
                </div>
                <button
                  onClick={() => router.push(`/provas/${p.id}`)}
                  className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-100"
                >
                  Abrir
                </button>
              </div>
            </div>
          ))}
          {provas.length === 0 && (
            <p className="text-center text-gray-500 py-8">Nenhuma prova cadastrada.</p>
          )}
        </div>
      </main>
    </div>
  );
}
