import { useState } from "react";
import Snowfall from "../components/Snowfall";
import WebcamRecorder from "../components/WebcamRecorder";
import { apiUpload } from "../lib/api";
import type { WishResponse } from "../lib/types";

export default function Home() {
  const [result, setResult] = useState<WishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecorded = async (blob: Blob) => {
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("video", blob, "wish.webm");
    try {
      const res = await apiUpload<WishResponse>("/api/wish", formData);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong, please try again");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 px-4 py-10 text-white">
      <Snowfall count={50} />
      <header className="relative z-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          🎅 Wish in Motion
        </h1>
        <p className="mt-2 text-slate-300">
          Make a move, and let Santa match you with your own holiday flavor!
        </p>
      </header>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {!result && <WebcamRecorder onRecorded={handleRecorded} buttonLabel="Make a Wish" />}

        {error && (
          <div className="rounded-xl bg-red-500/20 px-6 py-3 text-red-200">{error}</div>
        )}

        {result && <ResultCard result={result} onRetry={() => setResult(null)} />}
      </div>
    </div>
  );
}

function ResultCard({ result, onRetry }: { result: WishResponse; onRetry: () => void }) {
  const { flavor, confidence, is_fallback } = result;
  return (
    <div
      className="pop-in flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-4 p-8 text-center shadow-2xl"
      style={{ borderColor: flavor.color_hex, backgroundColor: `${flavor.color_hex}22` }}
    >
      <span className="bob text-7xl">{flavor.emoji}</span>
      <h2 className="text-3xl font-bold" style={{ color: flavor.color_hex }}>
        {flavor.name}
      </h2>
      <p className="text-xl text-slate-100">{flavor.taste}</p>
      {flavor.description && <p className="text-slate-300">{flavor.description}</p>}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>Confidence</span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
        <span>{Math.round(confidence * 100)}%</span>
      </div>
      {is_fallback && (
        <p className="text-xs text-amber-300">
          Santa couldn't quite tell what you were going for, so here's a surprise flavor!
        </p>
      )}
      <button
        onClick={onRetry}
        className="mt-2 rounded-full bg-white/10 px-6 py-2 text-white transition hover:bg-white/20"
      >
        Try Again
      </button>
    </div>
  );
}
