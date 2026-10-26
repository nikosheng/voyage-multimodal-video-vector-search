import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import type { AppSettings, Flavor } from "../lib/types";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<AppSettings>("/admin/settings", true).then(setSettings);
    apiGet<Flavor[]>("/admin/flavors", true).then(setFlavors);
  }, []);

  if (!settings) return <p>載入緊...</p>;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiPatch<AppSettings>("/admin/settings", settings, true);
      setSettings(updated);
      setMessage("設定已儲存！");
    } finally {
      setSaving(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    setMessage(null);
    try {
      const res = await apiPost<{ updated: number }>("/admin/recompute-embeddings", {}, true);
      setMessage(`已重新計算 ${res.updated} 個文字原型嘅向量`);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">全域設定</h1>

      <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-6">
        <Field label="Confidence Threshold（低於此分數觸發 fallback）">
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            className="input"
            value={settings.confidence_threshold}
            onChange={(e) =>
              setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })
            }
          />
        </Field>

        <Field label="Fallback 口味">
          <select
            className="input"
            value={settings.fallback_flavor_id ?? ""}
            onChange={(e) => setSettings({ ...settings, fallback_flavor_id: e.target.value })}
          >
            <option value="">（未設定）</option>
            {flavors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.emoji} {f.name_zh}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Top K（比對候選數量）">
          <input
            type="number"
            min={1}
            className="input"
            value={settings.top_k}
            onChange={(e) => setSettings({ ...settings, top_k: parseInt(e.target.value, 10) })}
          />
        </Field>

        <Field label="Num Candidates（$vectorSearch 搜尋範圍）">
          <input
            type="number"
            min={1}
            className="input"
            value={settings.num_candidates}
            onChange={(e) =>
              setSettings({ ...settings, num_candidates: parseInt(e.target.value, 10) })
            }
          />
        </Field>

        {message && <p className="text-emerald-400">{message}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "儲存緊..." : "儲存設定"}
        </button>

        <hr className="border-white/10" />

        <div>
          <p className="mb-2 text-sm text-slate-400">
            當 embedding model 升級後，重新計算所有文字原型嘅向量：
          </p>
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500 disabled:opacity-50"
          >
            {recomputing ? "計算緊..." : "重新計算全部向量"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      {label}
      {children}
    </label>
  );
}
