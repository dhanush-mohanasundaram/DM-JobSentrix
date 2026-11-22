import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { ErrorBanner, Spinner } from "../components/Feedback";
import FunnelChart from "../components/FunnelChart";
import ReminderList from "../components/ReminderList";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../services/api";
import type { FunnelStage, Reminder, Summary } from "../types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const TODAY = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [s, f, r] = await Promise.all([
        api.get<Summary>("/dashboard/summary"),
        api.get<FunnelStage[]>("/dashboard/funnel"),
        api.get<Reminder[]>("/reminders"),
      ]);
      setSummary(s.data); setFunnel(f.data); setReminders(r.data);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function done(r: Reminder) {
    try {
      await api.patch(`/reminders/${r.id}/sent`);
      setReminders(list => list.filter(x => x.id !== r.id));
    } catch (err) { setError(errorMessage(err)); }
  }

  if (loading) return <Spinner />;
  if (error && !summary) return <ErrorBanner message={error} onRetry={load} />;
  if (!summary) return null;

  const name = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const dueNow = reminders.filter(r => r.is_due).length;

  return (
    <div className="space-y-6">

      {/* ── Greeting bar ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{greeting()}, {name}.</h2>
          <p className="mt-0.5 text-sm text-gray-500">{TODAY} · Here's your job search at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/jobs" className="btn-primary">+ Add job</Link>
          <Link to="/applications" className="btn-ghost">Track application</Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Applications",   value: summary.total_applied,       sub: "total tracked",       accent: "#3b82f6" },
          { label: "Response rate",  value: `${summary.response_rate}%`, sub: "moved past Applied",  accent: "#10b981" },
          { label: "Jobs saved",     value: summary.jobs_tracked,        sub: "in your list",        accent: "#8b5cf6" },
          { label: "Follow-ups due", value: dueNow,                      sub: "need attention",      accent: dueNow > 0 ? "#ef4444" : "#d1d5db" },
        ].map(s => (
          <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ background: s.accent }} />
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">{s.value}</p>
            <p className="mt-1 text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ── Pipeline + Reminders ── */}
      {summary.total_applied === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <EmptyState
            title="No applications yet"
            body="Add a job you're interested in, then track your application to start the pipeline and follow-up reminders."
            action={<Link to="/jobs" className="btn-primary">Add your first job</Link>}
          />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-gray-800">Application pipeline</p>
            <p className="mb-5 text-xs text-gray-400">Status breakdown across all applications</p>
            <FunnelChart stages={funnel} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-gray-800">Follow-up reminders</p>
            <p className="mb-5 text-xs text-gray-400">Upcoming and overdue follow-ups</p>
            <ReminderList reminders={reminders} onDone={done} />
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Quick actions</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/analyzer",     icon: "🔍", title: "Analyze a JD",   body: "Paste any job description to see your skill match score and gaps." },
            { to: "/applications", icon: "📊", title: "View pipeline",  body: "See all your applications in a board or table view." },
            { to: "/settings",     icon: "⚙️", title: "Update skills",  body: "Add your technologies to get accurate match scores." },
          ].map(c => (
            <Link key={c.to} to={c.to} className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow transition-all">
              <span className="mt-0.5 text-2xl">{c.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-black">{c.title}</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{c.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Tips section ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-gray-800">Job search tips</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Quality over quantity",  body: "Target 2–3 well-matched roles daily rather than mass applying." },
            { title: "Follow up at day 7",     body: "A polite follow-up email doubles your response rate." },
            { title: "Match score ≥ 60%",      body: "Apply when your skill match is above 60% for better results." },
            { title: "Tailor every resume",    body: "Use the Resume Tailor to flag missing keywords for each JD." },
          ].map(t => (
            <div key={t.title} className="rounded-lg bg-gray-50 p-4">
              <p className="text-[13px] font-semibold text-gray-800">{t.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress card ── */}
      <div className="rounded-xl border border-gray-900 bg-gray-900 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Your target</p>
            <p className="mt-1 text-xl font-bold">Land your next role</p>
            <p className="mt-1 text-sm text-gray-400">Keep tracking, analyzing, and following up — every application brings you closer.</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{summary.total_applied}</p>
            <p className="text-xs text-gray-400">applications so far</p>
          </div>
        </div>
        <div className="mt-5 flex gap-6 border-t border-gray-800 pt-4">
          <div><p className="text-lg font-bold">{summary.jobs_tracked}</p><p className="text-xs text-gray-400">jobs saved</p></div>
          <div><p className="text-lg font-bold">{summary.response_rate}%</p><p className="text-xs text-gray-400">response rate</p></div>
          <div><p className="text-lg font-bold">{summary.pending_reminders}</p><p className="text-xs text-gray-400">reminders pending</p></div>
        </div>
      </div>

    </div>
  );
}
