import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import type { Flavor } from "../lib/types";

const emptyForm = {
  name: "",
  taste: "",
  action_label: "",
  emoji: "🍬",
  color_hex: "#20C997",
  description: "",
  is_fallback: false,
};

export default function FlavorList() {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlavors = () => {
    apiGet<Flavor[]>("/admin/flavors", true)
      .then(setFlavors)
      .catch((e) => setError(e.message));
  };

  useEffect(loadFlavors, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost("/admin/flavors", form, true);
      setForm(emptyForm);
      setShowForm(false);
      loadFlavors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flavor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flavors & Items</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
        >
          {showForm ? "Cancel" : "+ New Flavor"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 grid grid-cols-2 gap-4 rounded-2xl bg-slate-900 p-6"
        >
          <Field label="Name">
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Taste / Item">
            <input
              required
              className="input"
              value={form.taste}
              onChange={(e) => setForm({ ...form, taste: e.target.value })}
            />
          </Field>
          <Field label="Action Label (action_label)">
            <input
              required
              className="input"
              placeholder="e.g. cold_shiver"
              value={form.action_label}
              onChange={(e) => setForm({ ...form, action_label: e.target.value })}
            />
          </Field>
          <Field label="Emoji">
            <input
              className="input"
              value={form.emoji}
              onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              className="h-10 w-full rounded-lg"
              value={form.color_hex}
              onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <label className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_fallback}
              onChange={(e) => setForm({ ...form, is_fallback: e.target.checked })}
            />
            Mark as the fallback flavor (used when confidence is too low)
          </label>
          {error && <p className="col-span-2 text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="col-span-2 rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Flavor"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flavors.map((f) => (
          <Link
            key={f.id}
            to={`/admin/flavors/${f.id}`}
            className="flex flex-col gap-2 rounded-2xl border p-5 transition hover:scale-[1.02]"
            style={{ borderColor: f.color_hex, backgroundColor: `${f.color_hex}15` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{f.emoji}</span>
              {f.is_fallback && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                  fallback
                </span>
              )}
              {!f.is_active && (
                <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                  inactive
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold">{f.name}</h3>
            <p className="text-sm text-slate-300">{f.taste}</p>
            <p className="text-xs text-slate-500">action_label: {f.action_label}</p>
          </Link>
        ))}
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
