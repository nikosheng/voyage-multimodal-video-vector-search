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

  if (!settings) return <p>Loading...</p>;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiPatch<AppSettings>("/admin/settings", settings, true);
      setSettings(updated);
      setMessage("Settings saved!");
    } finally {
      setSaving(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    setMessage(null);
    try {
      const res = await apiPost<{ updated: number }>("/admin/recompute-embeddings", {}, true);
      setMessage(`Recomputed vectors for ${res.updated} text prototypes`);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Global Settings</h1>

      <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-6">
        <Field label="Confidence Threshold (triggers fallback below this score)">
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

        <Field label="Fallback Flavor">
          <select
            className="input"
            value={settings.fallback_flavor_id ?? ""}
            onChange={(e) => setSettings({ ...settings, fallback_flavor_id: e.target.value })}
          >
            <option value="">(not set)</option>
            {flavors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.emoji} {f.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Top K (number of candidates compared)">
          <input
            type="number"
            min={1}
            className="input"
            value={settings.top_k}
            onChange={(e) => setSettings({ ...settings, top_k: parseInt(e.target.value, 10) })}
          />
        </Field>

        <Field label="Num Candidates ($vectorSearch search scope)">
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
          {saving ? "Saving..." : "Save Settings"}
        </button>

        <hr className="border-white/10" />

        <div>
          <p className="mb-2 text-sm text-slate-400">
            After upgrading the embedding model, recompute vectors for all text prototypes:
          </p>
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500 disabled:opacity-50"
          >
            {recomputing ? "Computing..." : "Recompute All Vectors"}
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
