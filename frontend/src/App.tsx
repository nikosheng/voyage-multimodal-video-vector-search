import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import FlavorDetail from "./admin/FlavorDetail";
import FlavorList from "./admin/FlavorList";
import Layout from "./admin/Layout";
import Login from "./admin/Login";
import { AuthProvider } from "./admin/AuthContext";
import Sandbox from "./admin/Sandbox";
import Settings from "./admin/Settings";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Navigate to="/admin/flavors" replace />} />
            <Route path="flavors" element={<FlavorList />} />
            <Route path="flavors/:flavorId" element={<FlavorDetail />} />
            <Route path="sandbox" element={<Sandbox />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
