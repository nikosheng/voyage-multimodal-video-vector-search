import { useEffect, useRef, useState } from "react";
import Confetti from "../components/Confetti";
import Snowfall from "../components/Snowfall";
import WebcamRecorder from "../components/WebcamRecorder";
import { apiUpload } from "../lib/api";
import type { WishResponse } from "../lib/types";

const EXIT_DURATION_MS = 550;

export default function Home() {
  const [result, setResult] = useState<WishResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleRecorded = async (blob: Blob) => {
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("video", blob, "wish.webm");
    try {
      const res = await apiUpload<WishResponse>("/api/wish", formData);
      setResult(res);
      setConfettiTrigger((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong, please try again");
    }
  };

  const handleRetry = () => {
    if (isExiting) return;
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setResult(null);
      setIsExiting(false);
    }, EXIT_DURATION_MS);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 px-4 py-10 text-white">
      <Snowfall count={50} />
      <Confetti trigger={confettiTrigger} />
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
      </div>

      {result && (
        <div
          key={confettiTrigger}
          className={`fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm ${
            isExiting ? "overlay-fade-out" : "overlay-fade-in"
          }`}
        >
          <div
            className={`pointer-events-none absolute bottom-[58%] left-1/2 -translate-x-1/2 text-7xl sm:bottom-[60%] sm:left-[32%] ${
              isExiting ? "sleigh-exit" : "sleigh-deliver"
            }`}
          >
            🛷🎅
            {!isExiting && (
              <div className="speech-pop absolute -top-9 left-1/2 w-max -translate-x-1/2 rounded-xl bg-white px-3 py-1 text-sm font-semibold whitespace-nowrap text-slate-800 shadow-lg">
                Ho ho ho! 🎄
              </div>
            )}
          </div>

          <ResultCard result={result} onRetry={handleRetry} isExiting={isExiting} />
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  onRetry,
  isExiting,
}: {
  result: WishResponse;
  onRetry: () => void;
  isExiting: boolean;
}) {
  const { flavor, is_fallback } = result;
  return (
    <div
      className={`flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-4 p-8 text-center shadow-2xl ${
        isExiting ? "result-shrink-out" : "result-pop"
      }`}
      style={{ borderColor: flavor.color_hex, backgroundColor: `${flavor.color_hex}22` }}
    >
      <span className="emoji-reveal text-7xl">{flavor.emoji}</span>
      <h2 className="text-3xl font-bold" style={{ color: flavor.color_hex }}>
        {flavor.name}
      </h2>
      <p className="text-xl text-slate-100">{flavor.taste}</p>
      {flavor.description && <p className="text-slate-300">{flavor.description}</p>}
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
