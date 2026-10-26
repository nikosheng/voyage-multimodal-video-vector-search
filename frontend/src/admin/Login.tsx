import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import { useAuth } from "./AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ access_token: string }>("/admin/auth/login", {
        username,
        password,
      });
      login(res.access_token);
      navigate("/admin/flavors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="text-center text-2xl font-bold">🎅 Admin 登入</h1>
        <input
          className="rounded-lg bg-slate-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="管理員帳號"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="rounded-lg bg-slate-800 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 py-2 font-semibold transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "登入緊..." : "登入"}
        </button>
      </form>
    </div>
  );
}
