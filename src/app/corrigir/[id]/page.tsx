"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Camera, Loader2, CheckCircle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Upload, AlertCircle } from "lucide-react";

interface Questao {
  id: string;
  numero: number;
  enunciado: string;
  valorMaximo: number;
  rubrica: string;
}

interface Aluno {
  id: string;
  nome: string;
}

interface Captura {
  questaoId: string;
  questaoNumero: number;
  imageBase64: string | null;
  textoExtraido: string;
  textoManual: string;
}

interface AlunoCapturas {
  alunoId: string;
  alunoNome: string;
  capturas: Captura[];
  status: "pendente" | "capturando" | "concluido" | "processando";
}

export default function CorrigirPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
      <CorrigirPage />
    </Suspense>
  );
}

function CorrigirPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [alunosData, setAlunosData] = useState<Aluno[]>([]);
  const [alunos, setAlunos] = useState<AlunoCapturas[]>([]);
  const [alunoIdx, setAlunoIdx] = useState(0);
  const [questaoIdx, setQuestaoIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);
  const [modoTexto, setModoTexto] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const carregarDados = async () => {
    if (!localStorage.getItem("auth_token")) return router.push("/");

    const alunosIds = searchParams.get("alunos")?.split(",") || [];

    const res = await fetch(`/api/provas/${params.id}`);
    const data = await res.json();
    setQuestoes(data.questoes || []);

    const resAlunos = await fetch(`/api/alunos?turmaId=${data.turmaId}`);
    const todosAlunos: Aluno[] = await resAlunos.json();
    const selectedAlunos = todosAlunos.filter((a) => alunosIds.includes(a.id));
    setAlunosData(todosAlunos);

    const inicialAlunos: AlunoCapturas[] = selectedAlunos.map((a) => ({
      alunoId: a.id,
      alunoNome: a.nome,
      capturas: (data.questoes || []).map((q: Questao) => ({
        questaoId: q.id,
        questaoNumero: q.numero,
        imageBase64: null,
        textoExtraido: "",
        textoManual: "",
      })),
      status: "pendente" as const,
    }));

    setAlunos(inicialAlunos);
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
    return () => {
      pararCamera();
    };
  }, [params.id, searchParams]);

  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setModoTexto(true);
    }
  };

  const pararCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);

    const captura = alunos[alunoIdx].capturas[questaoIdx];
    const novosAlunos = [...alunos];
    novosAlunos[alunoIdx].capturas[questaoIdx] = { ...captura, imageBase64: base64 };
    setAlunos(novosAlunos);

    pararCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const captura = alunos[alunoIdx].capturas[questaoIdx];
      const novosAlunos = [...alunos];
      novosAlunos[alunoIdx].capturas[questaoIdx] = { ...captura, imageBase64: base64 };
      setAlunos(novosAlunos);
    };
    reader.readAsDataURL(file);
  };

  const getCapturaAtual = () => alunos[alunoIdx]?.capturas[questaoIdx];

  const proximoPasso = () => {
    const totalQuestoes = questoes.length;
    const totalAlunos = alunos.length;

    if (questaoIdx < totalQuestoes - 1) {
      setQuestaoIdx(questaoIdx + 1);
    } else if (alunoIdx < totalAlunos - 1) {
      setAlunoIdx(alunoIdx + 1);
      setQuestaoIdx(0);
    }
  };

  const passoAnterior = () => {
    if (questaoIdx > 0) {
      setQuestaoIdx(questaoIdx - 1);
    } else if (alunoIdx > 0) {
      setAlunoIdx(alunoIdx - 1);
      setQuestaoIdx(questoes.length - 1);
    }
  };

  const isUltimoPasso = alunoIdx === alunos.length - 1 && questaoIdx === questoes.length - 1;

  const enviarCorrecao = async () => {
    setSubmitting(true);
    setResultados([]);
    const resultadosFinais: any[] = [];

    for (let a = 0; a < alunos.length; a++) {
      const aluno = alunos[a];
      setProcessingStatus(`Processando ${aluno.alunoNome}...`);

      const questoesPayload = aluno.capturas.map((c) => ({
        questaoId: c.questaoId,
        imageBase64: c.imageBase64 || undefined,
        textoManual: c.textoManual || undefined,
        imagemPath: "",
      }));

      try {
        const res = await fetch("/api/correcao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provaId: params.id,
            alunoId: aluno.alunoId,
            questoes: questoesPayload,
          }),
        });

        const data = await res.json();
        resultadosFinais.push({ alunoNome: aluno.alunoNome, ...data });
      } catch {
        resultadosFinais.push({ alunoNome: aluno.alunoNome, error: "Erro ao processar" });
      }
    }

    setResultados(resultadosFinais);
    setSubmitting(false);
    setProcessingStatus("");
  };

  const totalCapturado = () => {
    let count = 0;
    for (const a of alunos) {
      for (const c of a.capturas) {
        if (c.imageBase64 || c.textoManual) count++;
      }
    }
    return count;
  };

  const totalEsperado = alunos.length * questoes.length;

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  if (resultados.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-center">✅ Correções Concluídas</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {resultados.map((r, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-2">{r.alunoNome}</h3>
                {r.error ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" /> {r.error}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">{r.totalNota?.toFixed(1)} pts</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push(`/provas/${params.id}`)}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Voltar para Prova
          </button>
        </main>
      </div>
    );
  }

  const questaoAtual = questoes[questaoIdx];
  const capturaAtual = getCapturaAtual();

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white shadow-sm border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => { pararCamera(); router.back(); }} className="text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold">
              {alunos[alunoIdx]?.alunoNome}
            </h1>
            <p className="text-xs text-gray-500">
              Questão {questaoIdx + 1} de {questoes.length} — Aluno {alunoIdx + 1} de {alunos.length}
            </p>
          </div>
          <div className="w-5" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Progresso */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progresso: {totalCapturado()}/{totalEsperado} capturadas</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(totalCapturado() / totalEsperado) * 100}%` }}
            />
          </div>
        </div>

        {/* Questao atual */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
              Questão {questaoAtual?.numero} — {questaoAtual?.valorMaximo} pts
            </span>
          </div>
          <p className="text-gray-800 font-medium">{questaoAtual?.enunciado}</p>
          {questaoAtual?.rubrica && (
            <p className="text-xs text-gray-500 mt-2 italic">Rubrica: {questaoAtual.rubrica}</p>
          )}
        </div>

        {/* Camera / Image */}
        {!capturaAtual?.imageBase64 ? (
          <div className="space-y-3">
            {!modoTexto ? (
              <div className="bg-black rounded-xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="p-3 flex gap-2">
                  <button
                    onClick={iniciarCamera}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" /> Abrir Câmera
                  </button>
                  <button
                    onClick={() => setModoTexto(true)}
                    className="px-4 bg-gray-600 text-white rounded-lg text-sm"
                  >
                    Digitar
                  </button>
                </div>
                {!streamRef.current && (
                  <button
                    onClick={capturarFoto}
                    disabled
                    className="w-full bg-gray-400 text-white py-3 rounded-lg font-semibold"
                  >
                    Abra a câmera primeiro
                  </button>
                )}
                {streamRef.current && (
                  <button
                    onClick={capturarFoto}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" /> Capturar Foto
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                >
                  <Upload className="w-4 h-4" /> Ou escolher da galeria
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-4 space-y-2">
                <label className="block text-sm font-medium">Digite a resposta do aluno manualmente:</label>
                <textarea
                  value={capturaAtual?.textoManual || ""}
                  onChange={(e) => {
                    const novos = [...alunos];
                    novos[alunoIdx].capturas[questaoIdx].textoManual = e.target.value;
                    setAlunos(novos);
                  }}
                  className="w-full border rounded-lg p-3 h-32"
                  placeholder="Transcreva aqui a resposta do aluno..."
                />
                <button
                  onClick={() => setModoTexto(false)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Voltar para câmera
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border p-3">
            <img src={capturaAtual.imageBase64} alt="Captura" className="w-full rounded-lg max-h-80 object-contain" />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  const novos = [...alunos];
                  novos[alunoIdx].capturas[questaoIdx].imageBase64 = null;
                  novos[alunoIdx].capturas[questaoIdx].textoExtraido = "";
                  setAlunos(novos);
                  iniciarCamera();
                }}
                className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm"
              >
                Refazer Foto
              </button>
              {capturaAtual.textoManual && (
                <button
                  onClick={() => setModoTexto(true)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg text-sm"
                >
                  Ajustar Texto
                </button>
              )}
            </div>
            {capturaAtual.textoExtraido && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                <p className="font-semibold text-yellow-700 text-xs">Texto extraído:</p>
                <p className="text-gray-600 whitespace-pre-wrap">{capturaAtual.textoExtraido}</p>
              </div>
            )}
          </div>
        )}

        {/* Navegação */}
        <div className="flex gap-2">
          <button
            onClick={passoAnterior}
            disabled={alunoIdx === 0 && questaoIdx === 0}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          {isUltimoPasso ? (
            <button
              onClick={enviarCorrecao}
              disabled={submitting || totalCapturado() === 0}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {processingStatus}</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Corrigir Todas</>
              )}
            </button>
          ) : (
            <button
              onClick={proximoPasso}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-1"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
