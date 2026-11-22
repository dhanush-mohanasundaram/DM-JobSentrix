import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import EmptyState from "../components/EmptyState";
import { ErrorBanner, Spinner } from "../components/Feedback";
import SkillBadge from "../components/SkillBadge";
import api, { errorMessage } from "../services/api";
import type { Job, JdAnalysis } from "../types";
import { useApi } from "../utils/useApi";

function ScoreRing({ score }: { score: number }) {
  const pct   = Math.round(score * 100);
  const r     = 54;
  const c     = 2 * Math.PI * r;
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const label = pct >= 70 ? "Strong match" : pct >= 40 ? "Partial match" : "Weak match";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-36 w-36" role="img" aria-label={`Match score ${pct} percent`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - score) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums text-gray-900">{pct}%</span>
          <span className="text-xs text-gray-500">match</span>
        </div>
      </div>
      <span className="rounded-full px-3 py-1 text-xs font-semibold border"
        style={{ backgroundColor: color + "15", color, borderColor: color + "40" }}>
        {label}
      </span>
    </div>
  );
}

export default function JdAnalyzer() {
  const [params, setParams] = useSearchParams();
  const { data: jobs, loading, error: jobsError } = useApi<Job[]>("/jobs", []);
  const jobId = params.get("job") ?? "";
  const [text, setText]     = useState("");
  const [result, setResult] = useState<JdAnalysis | null>(null);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    setResult(null); setError("");
    const job = jobs.find(j => j.id === jobId);
    setText(job?.jd_text ?? "");
    if (!job) return;
    api.get<JdAnalysis>(`/jd/parse/${job.id}`).then(r => setResult(r.data)).catch(() => undefined);
  }, [jobId, jobs]);

  async function analyze() {
    setBusy(true); setError("");
    try {
      const { data } = await api.post<JdAnalysis>("/jd/analyze", { job_id: jobId, jd_text: text.trim() || null });
      setResult(data);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  if (loading) return <Spinner />;
  if (jobsError) return <ErrorBanner message={jobsError} />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">JD Analyzer</h2>
        <p className="mt-0.5 text-sm text-gray-500">Paste a job description to get your match score, skill gaps, and learning roadmap</p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="Add a job to analyze" body="Save a job posting first, then come back here to analyze the description."
          action={<Link to="/jobs" className="btn-primary">Add a job</Link>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Input */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Job description</h3>
            <div>
              <label className="label" htmlFor="job">Select job</label>
              <select id="job" className="input" value={jobId}
                onChange={e => setParams(e.target.value ? { job: e.target.value } : {})}>
                <option value="">Choose a job…</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.company} — {j.role_title}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="jd">Description text</label>
              <textarea id="jd" rows={13} className="input" value={text}
                onChange={e => setText(e.target.value)} placeholder="Paste the full job description here…" />
            </div>
            {error && <ErrorBanner message={error} />}
            <button className="btn-primary w-full" disabled={!jobId || !text.trim() || busy} onClick={analyze}>
              {busy ? "Analyzing…" : "Analyze match"}
            </button>
            <p className="text-xs text-center text-gray-400">The description is saved to the job when you analyze.</p>
          </div>

          {/* Results */}
          <div className="space-y-4" aria-live="polite">
            {!result ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl">🎯</div>
                <p className="font-semibold text-gray-900">No analysis yet</p>
                <p className="mt-1 text-sm text-gray-500">Choose a job, paste the JD, and click Analyze match.</p>
              </div>
            ) : (
              <>
                {result.used_fallback && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    ⚠️ AI was unavailable — skills matched using keyword search. Results may be incomplete.
                  </div>
                )}

                {/* Score */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                    <ScoreRing score={result.match_score} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Seniority</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{result.seniority ?? "Not stated"}</p>
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                        You have <strong className="text-gray-900">{result.required_skills.length - result.skill_gaps.length}</strong> of <strong className="text-gray-900">{result.required_skills.length}</strong> required skills.
                        {result.skill_gaps.length > 0 && <span className="text-gray-400"> ({result.skill_gaps.length} to learn)</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills you have */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-gray-800">✅ Skills you have</p>
                  <div className="flex flex-wrap gap-2">
                    {result.required_skills.filter(s => !result.skill_gaps.includes(s)).map(s => <SkillBadge key={s} name={s} variant="match" />)}
                    {result.required_skills.length === result.skill_gaps.length && (
                      <p className="text-sm text-gray-500">None yet — add skills in <Link to="/settings" className="text-blue-600 hover:underline">Settings</Link>.</p>
                    )}
                  </div>
                </div>

                {/* Gaps */}
                {result.skill_gaps.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-gray-800">📚 Skills to learn</p>
                    <div className="flex flex-wrap gap-2">
                      {result.skill_gaps.map(s => <SkillBadge key={s} name={s} variant="gap" />)}
                    </div>
                  </div>
                )}

                {/* Roadmap */}
                {!!result.roadmap?.length && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-gray-800">🗺️ Learning roadmap</p>
                    <ol className="space-y-4">
                      {result.roadmap.map(w => (
                        <li key={w.week} className="flex gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">{w.week}</div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{w.skill}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{w.focus}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
