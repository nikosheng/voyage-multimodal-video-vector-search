import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";
import type { DashboardFlavorStat } from "../lib/types";

interface RecentWish {
  flavor_id: string;
  name_zh: string;
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
    });

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  const total = stats.reduce((sum, s) => sum + s.count, 0) || 1;
  const maxCount = Math.max(1, ...stats.map((s) => s.count));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 px-10 py-10 text-white">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-4xl font-extrabold">🎅 Wish in Motion — Live Dashboard</h1>
        <span
          className={`rounded-full px-4 py-1 text-sm ${
            connected ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {connected ? "● Live" : "○ 連線中..."}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-2xl font-semibold text-slate-300">口味統計</h2>
          <div className="space-y-6">
            {stats.map((s) => (
              <div key={s.flavor_id}>
                <div className="mb-1 flex items-center justify-between text-lg">
                  <span>
                    {s.emoji} {s.name_zh}
                  </span>
                  <span className="font-mono">
                    {s.count}（{Math.round((s.count / total) * 100)}%）
                  </span>
                </div>
                <div className="h-6 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(s.count / maxCount) * 100}%`,
                      backgroundColor: s.color_hex,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-slate-300">最新許願</h2>
          <ul className="space-y-3">
            {recent.map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border-l-4 bg-white/5 px-4 py-3"
                style={{ borderColor: r.color_hex }}
              >
                <span className="text-2xl">{r.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold">{r.name_zh}</p>
                  {r.confidence_score !== null && (
                    <p className="text-xs text-slate-400">
                      信心 {Math.round(r.confidence_score * 100)}%
                      {r.is_fallback && "（驚喜）"}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <p className="text-slate-500">等緊第一位參加者許願...</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
