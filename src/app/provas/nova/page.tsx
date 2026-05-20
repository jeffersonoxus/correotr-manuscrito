"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText, Brain, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Turma {
  id: string;
  nome: string;
}

interface RespostaEsperada {
  texto: string;
  aberto: boolean;
}

interface QuestaoForm {
  numero: number;
  enunciado: string;
  valorMaximo: number;
  rubrica: string;
  respostasEsperadas: RespostaEsperada[];
  bncc: string[];
}

type ModoCriacao = "manual" | "upload";

export default function NovaProvaPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [modo, setModo] = useState<ModoCriacao>("manual");
  const [questoes, setQuestoes] = useState<QuestaoForm[]>([
    { numero: 1, enunciado: "", valorMaximo: 10, rubrica: "", respostasEsperadas: [{ texto: "", aberto: true }], bncc: [""] },
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) return router.push("/");
    fetch("/api/turmas").then((r) => r.json()).then((data) => {
      setTurmas(data);
      if (data.length === 1) setTurmaId(data[0].id);
    });
  }, [router]);

  const handleFileUpload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setUploadError("Apenas arquivos PDF são aceitos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("O PDF deve ter no máximo 10MB");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadStatus("Enviando PDF...");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setUploadStatus("IA analisando a prova...");
      const res = await fetch("/api/provas/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar PDF");
      }

      setUploadStatus("Pronto! Revisando...");
      setTitulo(data.titulo || file.name.replace(".pdf", ""));
      setDescricao(data.descricao || "");

      const questoesConvertidas: QuestaoForm[] = (data.questoes || []).map((q: any) => ({
        numero: q.numero,
        enunciado: q.enunciado,
        valorMaximo: q.valorMaximo,
        rubrica: q.rubrica || "",
        respostasEsperadas: (q.respostasEsperadas || []).map((r: string) => ({ texto: r, aberto: false })),
        bncc: Array.isArray(q.bncc) && q.bncc.length > 0 ? q.bncc : [""],
      }));

      setQuestoes(questoesConvertidas);
    } catch (err: any) {
      setUploadError(err.message || "Erro ao processar PDF");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const adicionarQuestao = () => {
    setQuestoes([...questoes, {
      numero: questoes.length + 1,
      enunciado: "",
      valorMaximo: 10,
      rubrica: "",
      respostasEsperadas: [{ texto: "", aberto: true }],
      bncc: [""],
    }]);
  };

  const removerQuestao = (idx: number) => {
    setQuestoes(questoes.filter((_, i) => i !== idx));
  };

  const atualizar = (idx: number, campo: keyof QuestaoForm, valor: any) => {
    const nova = [...questoes];
    (nova[idx] as any)[campo] = valor;
    setQuestoes(nova);
  };

  const adicionarResposta = (idx: number) => {
    const nova = [...questoes];
    nova[idx].respostasEsperadas.push({ texto: "", aberto: true });
    setQuestoes(nova);
  };

  const removerResposta = (qIdx: number, rIdx: number) => {
    const nova = [...questoes];
    nova[qIdx].respostasEsperadas = nova[qIdx].respostasEsperadas.filter((_, i) => i !== rIdx);
    setQuestoes(nova);
  };

  const atualizarResposta = (qIdx: number, rIdx: number, texto: string) => {
    const nova = [...questoes];
    nova[qIdx].respostasEsperadas[rIdx].texto = texto;
    setQuestoes(nova);
  };

  const toggleResposta = (qIdx: number, rIdx: number) => {
    const nova = [...questoes];
    nova[qIdx].respostasEsperadas[rIdx].aberto = !nova[qIdx].respostasEsperadas[rIdx].aberto;
    setQuestoes(nova);
  };

  const atualizarBncc = (idx: number, valor: string, bnccIdx: number) => {
    const nova = [...questoes];
    nova[idx].bncc[bnccIdx] = valor;
    setQuestoes(nova);
  };

  const adicionarBncc = (idx: number) => {
    const nova = [...questoes];
    nova[idx].bncc.push("");
    setQuestoes(nova);
  };

  const removerBncc = (qIdx: number, bIdx: number) => {
    const nova = [...questoes];
    nova[qIdx].bncc = nova[qIdx].bncc.filter((_, i) => i !== bIdx);
    setQuestoes(nova);
  };

  const salvar = async () => {
    if (!titulo.trim() || !turmaId) return;
    setSalvando(true);
    setUploadError("");
    const questoesPayload = questoes
      .filter((q) => q.enunciado.trim())
      .map((q, idx) => ({
        enunciado: q.enunciado,
        valorMaximo: q.valorMaximo,
        rubrica: q.rubrica,
        gabarito: JSON.stringify({
          respostasEsperadas: q.respostasEsperadas.filter((r) => r.texto.trim()).map((r) => r.texto),
        }),
        bncc: q.bncc.filter((b) => b.trim()).join(", "),
      }));

    try {
      const res = await fetch("/api/provas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, turmaId, questoes: questoesPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar prova");
      router.push(`/provas/${data.id}`);
    } catch (err: any) {
      setUploadError(err.message || "Erro ao salvar prova");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/provas")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Nova Prova</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Abas */}
        <div className="flex gap-2 bg-white rounded-xl shadow-sm border p-1">
          <button
            onClick={() => setModo("upload")}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
              modo === "upload" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Upload className="w-4 h-4" /> Upload PDF (IA)
          </button>
          <button
            onClick={() => setModo("manual")}
            className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
              modo === "manual" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Plus className="w-4 h-4" /> Manual
          </button>
        </div>

        {/* Upload PDF */}
        {modo === "upload" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {!uploading && questoes.every((q) => q.enunciado === "") ? (
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center cursor-pointer hover:bg-blue-50 transition"
              >
                <FileText className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                <p className="text-lg font-medium text-gray-700">Clique ou arraste o PDF da prova aqui</p>
                <p className="text-sm text-gray-500 mt-1">A IA vai extrair questões, respostas esperadas, BNCC e rubricas</p>
                <p className="text-xs text-gray-400 mt-2">PDF até 10MB</p>
              </div>
            ) : uploading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-gray-700 font-medium">{uploadStatus}</p>
                <p className="text-sm text-gray-500 mt-1">Isso pode levar até 30 segundos</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">PDF processado com sucesso</span>
                </div>
                <button
                  onClick={() => {
                    setQuestoes([{ numero: 1, enunciado: "", valorMaximo: 10, rubrica: "", respostasEsperadas: [{ texto: "", aberto: true }], bncc: [""] }]);
                    setTitulo("");
                    setDescricao("");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Enviar outro PDF
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{uploadError}</p>
              </div>
            )}
          </div>
        )}

        {/* Dados da Prova */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título da Prova</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full border rounded-lg p-2.5"
              placeholder="Ex: Prova 1 - Equações do 2º Grau"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border rounded-lg p-2.5"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full border rounded-lg p-2.5"
            >
              <option value="">Selecione...</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Questões */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Questões</h2>
            <button onClick={adicionarQuestao} className="text-blue-600 flex items-center gap-1 text-sm hover:underline">
              <Plus className="w-4 h-4" /> Adicionar Questão
            </button>
          </div>

          <div className="space-y-6">
            {questoes.map((q, idx) => (
              <div key={idx} className="border rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-blue-700">Questão {idx + 1}</span>
                  {questoes.length > 1 && (
                    <button onClick={() => removerQuestao(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <textarea
                    value={q.enunciado}
                    onChange={(e) => atualizar(idx, "enunciado", e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-sm"
                    rows={3}
                    placeholder="Enunciado da questão"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Valor máximo</label>
                      <input
                        type="number"
                        value={q.valorMaximo}
                        onChange={(e) => atualizar(idx, "valorMaximo", Number(e.target.value))}
                        className="w-full border rounded-lg p-2 text-sm"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Rubrica de correção</label>
                      <input
                        type="text"
                        value={q.rubrica}
                        onChange={(e) => atualizar(idx, "rubrica", e.target.value)}
                        className="w-full border rounded-lg p-2 text-sm"
                        placeholder="Ex: 2pts fórmula, 3pts substituição..."
                      />
                    </div>
                  </div>

                  {/* Respostas Esperadas (IA) */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Respostas Esperadas (sugeridas pela IA)
                      </label>
                      <button
                        onClick={() => adicionarResposta(idx)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Estratégia
                      </button>
                    </div>
                    {q.respostasEsperadas.map((r, rIdx) => (
                      <div key={rIdx} className="mb-2">
                        <div className="flex items-start gap-1">
                          <button
                            onClick={() => toggleResposta(idx, rIdx)}
                            className="mt-2 text-gray-400 hover:text-gray-600"
                          >
                            {r.aberto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs text-gray-400">Estratégia {rIdx + 1}</span>
                              {q.respostasEsperadas.length > 1 && (
                                <button onClick={() => removerResposta(idx, rIdx)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <textarea
                              value={r.texto}
                              onChange={(e) => atualizarResposta(idx, rIdx, e.target.value)}
                              className={`w-full border rounded-lg p-2 text-xs font-mono ${
                                r.aberto ? "" : "h-8 overflow-hidden"
                              }`}
                              rows={r.aberto ? 4 : 1}
                              placeholder="Passo a passo da resolução esperada..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BNCC */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-500">Habilidades BNCC</label>
                      <button
                        onClick={() => adicionarBncc(idx)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>
                    {q.bncc.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-1 mb-1">
                        <input
                          type="text"
                          value={b}
                          onChange={(e) => atualizarBncc(idx, e.target.value, bIdx)}
                          className="flex-1 border rounded-lg p-1.5 text-xs"
                          placeholder="Ex: EM13MAT310"
                        />
                        {q.bncc.length > 1 && (
                          <button onClick={() => removerBncc(idx, bIdx)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={salvar}
          disabled={!titulo.trim() || !turmaId || salvando}
          className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-700 text-lg"
        >
          {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {salvando ? "Salvando..." : "Salvar Prova"}
        </button>
      </main>
    </div>
  );
}
