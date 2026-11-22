import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorBanner } from "../components/Feedback";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);
  const isLogin = mode === "login";

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (isLogin) await login(email, password);
      else await register(email, password, name);
      navigate("/", { replace: true });
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] flex">
      {/* Left panel */}
      <div className="hidden md:flex md:w-[45%] flex-col justify-between bg-white border-r border-gray-200 px-12 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-gray-900">JobTrack</span>
        </div>

        {/* Middle content */}
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900">
            Your job search,<br />finally organised.
          </h1>
          <p className="mt-4 text-gray-500 leading-relaxed max-w-sm">
            Track applications, analyze job descriptions with AI, and never miss a follow-up — all in one clean dashboard.
          </p>

          <div className="mt-10 space-y-5">
            {[
              { label: "AI match score",     body: "See how well your skills match any job description, instantly." },
              { label: "Auto reminders",     body: "Day-7 and day-14 follow-ups created for every application." },
              { label: "Resume tailor",      body: "AI suggests edits and flags missing keywords for each role." },
            ].map(f => (
              <div key={f.label} className="flex gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white">
                  <svg className="h-3 w-3 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-gray-900">{f.label}</p>
                  <p className="text-[13px] text-gray-500">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400">Free to use · No credit card required</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <span className="text-[15px] font-bold text-gray-900">JobTrack</span>
          </div>

          {/* Tab switcher */}
          <div className="mb-6 flex rounded-lg border border-gray-200 bg-gray-100 p-1">
            <Link to="/login" className={`flex-1 rounded-md py-2 text-center text-[13px] font-semibold transition-colors ${isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Log in
            </Link>
            <Link to="/register" className={`flex-1 rounded-md py-2 text-center text-[13px] font-semibold transition-colors ${!isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Register
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-gray-900">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mb-5 text-[13px] text-gray-500">
              {isLogin ? "Sign in to continue." : "Start tracking your job search today."}
            </p>

            {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

            <form onSubmit={submit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="label" htmlFor="name">Full name</label>
                  <input id="name" className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your full name" />
                </div>
              )}
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" required minLength={isLogin ? 1 : 8} maxLength={72} className="input" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Your password" : "At least 8 characters"} />
                {!isLogin && <p className="mt-1.5 text-[11px] text-gray-400">Must be at least 8 characters.</p>}
              </div>
              <button className="btn-primary w-full !py-2.5" disabled={busy}>
                {busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
