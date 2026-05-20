"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, FileText, LogOut, Plus, ClipboardCheck } from "lucide-react";

interface Turma {
  id: string;
  nome: string;
  createdAt: string;
}

interface Prova {
  id: string;
  titulo: string;
  turmaId: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [provas, setProvas] = useState<Prova[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) {
      router.push("/");
      return;
    }
    Promise.all([
      fetch("/api/turmas").then((r) => r.json()).catch(() => []),
      fetch("/api/provas").then((r) => r.json()).catch(() => []),
    ]).then(([turmasData, provasData]) => {
      setTurmas(Array.isArray(turmasData) ? turmasData : []);
      setProvas(Array.isArray(provasData) ? provasData : []);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    router.push("/");
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Corretor de Provas</h1>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 flex items-center gap-1 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Turmas</h2>
              </div>
              <button onClick={() => router.push("/turmas")} className="text-sm text-blue-600 hover:underline">
                Gerenciar
              </button>
            </div>
            {turmas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma turma cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {turmas.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{t.nome}</span>
                    <button
                      onClick={() => router.push(`/turmas/${t.id}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push("/turmas")}
              className="mt-4 w-full text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 flex items-center justify-center gap-1 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" /> Nova Turma
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Provas</h2>
              </div>
              <button onClick={() => router.push("/provas")} className="text-sm text-blue-600 hover:underline">
                Gerenciar
              </button>
            </div>
            {provas.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma prova cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {provas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{p.titulo}</span>
                    <button
                      onClick={() => router.push(`/provas/${p.id}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push("/provas/nova")}
              className="mt-4 w-full text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg py-2 flex items-center justify-center gap-1 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" /> Nova Prova
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
