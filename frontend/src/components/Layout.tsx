import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./Feedback";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner label="Signing you in" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f4f0]">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main
          id="main"
          className="flex-1 overflow-y-auto"
          style={{ background: "#f5f4f0" }}
        >
          <div className="min-h-full p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
