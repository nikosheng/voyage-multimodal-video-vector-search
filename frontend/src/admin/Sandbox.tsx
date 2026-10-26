import { useState } from "react";
import WebcamRecorder from "../components/WebcamRecorder";
import { apiUpload } from "../lib/api";

interface SandboxResult {
  matched_flavor_id: string | null;
  is_fallback: boolean;
  confidence_score: number;
  top_k_matches: { flavor_id: string; score: number }[];
  voyage_usage: Record<string, number>;
}

export default function Sandbox() {
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecorded = async (blob: Blob) => {
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("video", blob, "sandbox.webm");
    try {
      const res = await apiUpload<SandboxResult>("/admin/sandbox/test", formData, true);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Sandbox Test</h1>
      <p className="mb-6 text-slate-400">
        Results here are NOT written to wishes / flavor_stats, so you can safely calibrate the threshold and prototype quality.
      </p>

      <WebcamRecorder onRecorded={handleRecorded} buttonLabel="Start Test Action" />

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {result && (
        <div className="mt-6 rounded-2xl bg-slate-900 p-6">
          <p className="mb-2">
            Matched flavor: 
            <span className="font-bold text-emerald-400">
              {result.matched_flavor_id ?? "(none)"}
            </span>
            {result.is_fallback && <span className="ml-2 text-amber-400">(fallback)</span>}
          </p>
          <p className="mb-4 text-slate-400">
            Confidence: {(result.confidence_score * 100).toFixed(1)}%
          </p>
          <h3 className="mb-2 font-semibold">Top-K Matches:</h3>
          <ul className="space-y-1 text-sm">
            {result.top_k_matches.map((m, i) => (
              <li key={i} className="flex justify-between rounded bg-white/5 px-3 py-1">
                <span>{m.flavor_id}</span>
                <span>{(m.score * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
