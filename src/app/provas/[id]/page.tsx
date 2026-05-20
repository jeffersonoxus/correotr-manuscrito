"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle, XCircle, AlertCircle, Brain, BookOpen } from "lucide-react";

interface Questao {
  id: string;
  numero: number;
  enunciado: string;
  valorMaximo: number;
  rubrica: string;
  gabarito: string;
  bncc: string;
}

interface Aluno {
  id: string;
  nome: string;
}

interface Correcao {
  id: string;
  alunoId: string;
  status: string;
  totalNota: number;
  aluno: Aluno | null;
}

export default function ProvaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [prova, setProva] = useState<any>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [correcoes, setCorrecoes] = useState<Correcao[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);

  const carregar = async () => {
    if (!localStorage.getItem("auth_token")) return router.push("/");
    const res = await fetch(`/api/provas/${params.id}`);
    const data = await res.json();
    setProva(data);
    setQuestoes(data.questoes || []);
    setCorrecoes(data.correcoes || []);

    if (data.turmaId) {
      const resAlunos = await fetch(`/api/alunos?turmaId=${data.turmaId}`);
      setAlunos(await resAlunos.json());
    }
  };

  useEffect(() => {
    carregar();
  }, [params.id, router]);

  const toggleAluno = (id: string) => {
    setSelectedAlunos((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const iniciarCorrecao = () => {
    if (selectedAlunos.length === 0) return;
    const alunosParam = selectedAlunos.join(",");
    router.push(`/corrigir/${params.id}?alunos=${alunosParam}`);
  };

  const getAlunoNome = (id: string) => alunos.find((a) => a.id === id)?.nome || "---";

  if (!prova) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/provas")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{prova.titulo}</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {prova.descricao && (
          <p className="text-gray-600 bg-white rounded-xl shadow-sm border p-4">{prova.descricao}</p>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-lg mb-4">Questões</h2>
          <div className="space-y-3">
            {questoes.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-blue-600">Questão {q.numero}</span>
                  <span className="text-xs text-gray-500">{q.valorMaximo} pts</span>
                </div>
                <p className="text-sm text-gray-700">{q.enunciado}</p>
                {q.bncc && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                    <BookOpen className="w-3 h-3" /> BNCC: {q.bncc}
                  </div>
                )}
                {q.gabarito && (() => {
                  try {
                    const gab = JSON.parse(q.gabarito);
                    if (gab.respostasEsperadas?.length > 0) {
                      return (
                        <details className="mt-2">
                          <summary className="text-xs text-green-600 cursor-pointer hover:underline flex items-center gap-1">
                            <Brain className="w-3 h-3" /> {gab.respostasEsperadas.length} estratégia(s) de resposta esperada
                          </summary>
                          <div className="mt-2 space-y-2">
                            {gab.respostasEsperadas.map((r: string, ri: number) => (
                              <div key={ri} className="bg-green-50 border border-green-200 rounded p-2">
                                <p className="text-xs font-medium text-green-700">Estratégia {ri + 1}</p>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap mt-1">{r}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    }
                  } catch {}
                  return null;
                })()}
                {q.rubrica && (
                  <p className="text-xs text-gray-500 mt-2">Rubrica: {q.rubrica}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-lg mb-4">Corrigir Prova</h2>
          <p className="text-sm text-gray-500 mb-3">Selecione um ou mais alunos para corrigir:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {alunos.map((a) => {
              const jaCorrigido = correcoes.some((c) => c.alunoId === a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => !jaCorrigido && toggleAluno(a.id)}
                  disabled={jaCorrigido}
                  className={`p-3 rounded-lg border text-sm text-left transition ${
                    jaCorrigido
                      ? "bg-green-50 border-green-200 text-green-600 cursor-default"
                      : selectedAlunos.includes(a.id)
                        ? "bg-blue-100 border-blue-400 text-blue-700"
                        : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <span className="block">{a.nome}</span>
                  {jaCorrigido && <span className="text-xs text-green-500">✓ Corrigido</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={iniciarCorrecao}
            disabled={selectedAlunos.length === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 hover:bg-blue-700"
          >
            <Camera className="w-5 h-5" />
            Corrigir {selectedAlunos.length > 0 && `(${selectedAlunos.length} alunos)`}
          </button>
        </div>

        {correcoes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-semibold text-lg mb-4">Correções Realizadas</h2>
            <div className="space-y-2">
              {correcoes.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{getAlunoNome(c.alunoId)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{c.totalNota?.toFixed(1)} pts</span>
                    {c.status === "concluido" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
