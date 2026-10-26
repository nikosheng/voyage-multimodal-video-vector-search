import { useEffect, useRef, useState } from "react";
import Confetti from "../components/Confetti";
import Snowfall from "../components/Snowfall";
import StringLights from "../components/StringLights";
import { apiGet } from "../lib/api";
import type { DashboardFlavorStat } from "../lib/types";

interface RecentWish {
  flavor_id: string;
  name: string;
  emoji: string;
  color_hex: string;
  is_fallback: boolean;
  confidence_score: number | null;
  timestamp: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardFlavorStat[]>([]);
  const [recent, setRecent] = useState<RecentWish[]>([]);
  const [connected, setConnected] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [pulseFlavorId, setPulseFlavorId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial snapshot
  useEffect(() => {
    apiGet<{ flavors: DashboardFlavorStat[] }>("/api/dashboard/stats")
      .then((data) => setStats(data.flavors))
      .catch(() => {});
  }, []);

  // Live updates via MongoDB Change Streams -> backend SSE
  useEffect(() => {
    const es = new EventSource("/api/dashboard/stream");
    eventSourceRef.current = es;

    es.addEventListener("connected", () => setConnected(true));

    es.addEventListener("new_wish", (e) => {
      const payload: RecentWish = JSON.parse((e as MessageEvent).data);
      setRecent((prev) => [payload, ...prev].slice(0, 8));
      setStats((prev) =>
        prev.map((s) =>
          s.flavor_id === payload.flavor_id ? { ...s, count: s.count + 1 } : s,
        ),
      );
      setConfettiTrigger((t) => t + 1);
      setPulseFlavorId(payload.flavor_id);
      setTimeout(() => setPulseFlavorId(null), 1800);
    });

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  const total = stats.reduce((sum, s) => sum + s.count, 0) || 1;
  const maxCount = Math.max(1, ...stats.map((s) => s.count));

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
      <Snowfall count={80} />
      <Confetti trigger={confettiTrigger} />

      {/* Twinkling stars background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="twinkle absolute h-1 w-1 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Flying sleigh */}
      <div className="sleigh pointer-events-none absolute top-6 z-10 text-5xl">🛷🎅</div>

      <div className="relative z-10 px-10 py-8">
        <StringLights />

        <header className="my-8 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">
            🎄 Wish in Motion — Live Dashboard
          </h1>
          <span
            className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
              connected ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {connected ? "● Live" : "○ Connecting..."}
          </span>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-4 text-2xl font-semibold text-slate-300">
              ❄️ Flavor Leaderboard
            </h2>
            <div className="space-y-6">
              {stats.map((s) => (
                <div
                  key={s.flavor_id}
                  className={`rounded-2xl p-4 transition ${
                    pulseFlavorId === s.flavor_id ? "bg-white/10" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-lg">
                    <span className={pulseFlavorId === s.flavor_id ? "bob" : ""}>
                      {s.emoji} {s.name}
                    </span>
                    <span className="font-mono">
                      {s.count} ({Math.round((s.count / total) * 100)}%)
                    </span>
                  </div>
                  <div className="h-7 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="glow-pulse h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(s.count / maxCount) * 100}%`,
                        backgroundColor: s.color_hex,
                        color: s.color_hex,
                      }}
                    />
                  </div>
                </div>
              ))}
              {stats.length === 0 && (
                <p className="text-slate-500">No flavors configured yet.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-slate-300">🎁 Latest Wishes</h2>
            <ul className="space-y-3">
              {recent.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 rounded-xl border-l-4 bg-white/5 px-4 py-3 ${
                    i === 0 ? "pop-in" : ""
                  }`}
                  style={{ borderColor: r.color_hex }}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{r.name}</p>
                    {r.confidence_score !== null && (
                      <p className="text-xs text-slate-400">
                        Confidence {Math.round(r.confidence_score * 100)}%
                        {r.is_fallback && " (surprise!)"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
              {recent.length === 0 && (
                <p className="text-slate-500">Waiting for the first wish...</p>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
