import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

const navItems = [
  { to: "/admin/flavors", label: "口味管理" },
  { to: "/admin/sandbox", label: "Sandbox 測試" },
  { to: "/admin/settings", label: "全域設定" },
];

export default function Layout() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="w-56 shrink-0 border-r border-white/10 p-6">
        <h2 className="mb-8 text-xl font-bold">🎅 Admin</h2>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 transition ${
                  isActive ? "bg-emerald-600" : "hover:bg-white/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-10 w-full rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          登出
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
