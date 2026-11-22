import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Applications from "./pages/Applications";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import JdAnalyzer from "./pages/JdAnalyzer";
import Jobs from "./pages/Jobs";
import Resumes from "./pages/Resumes";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="applications" element={<Applications />} />
        <Route path="analyzer" element={<JdAnalyzer />} />
        <Route path="jd-analyzer" element={<JdAnalyzer />} />
        <Route path="resumes" element={<Resumes />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<p style={{ color: '#94a3b8' }}>Page not found.</p>} />
      </Route>
    </Routes>
  );
}
