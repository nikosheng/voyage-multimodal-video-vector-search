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
      setError(e instanceof Error ? e.message : "測試失敗");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Sandbox 測試</h1>
      <p className="mb-6 text-slate-400">
        呢度嘅測試結果唔會寫入 wishes / flavor_stats，可以安心校準 threshold 同原型效果。
      </p>

      <WebcamRecorder onRecorded={handleRecorded} buttonLabel="開始測試動作" />

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {result && (
        <div className="mt-6 rounded-2xl bg-slate-900 p-6">
          <p className="mb-2">
            配對結果：
            <span className="font-bold text-emerald-400">
              {result.matched_flavor_id ?? "(無)"}
            </span>
            {result.is_fallback && <span className="ml-2 text-amber-400">(fallback)</span>}
          </p>
          <p className="mb-4 text-slate-400">
            信心分數：{(result.confidence_score * 100).toFixed(1)}%
          </p>
          <h3 className="mb-2 font-semibold">Top-K 比對：</h3>
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
