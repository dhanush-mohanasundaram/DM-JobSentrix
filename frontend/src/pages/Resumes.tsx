import { useState, type FormEvent } from "react";
import EmptyState from "../components/EmptyState";
import { ErrorBanner, Spinner } from "../components/Feedback";
import Modal from "../components/Modal";
import SkillBadge from "../components/SkillBadge";
import api, { errorMessage } from "../services/api";
import type { Job, Resume, TailorResult } from "../types";
import { formatDate } from "../utils/format";
import { useApi } from "../utils/useApi";

export default function Resumes() {
  const { data: resumes, loading, error, reload } = useApi<Resume[]>("/resumes", []);
  const jobs       = useApi<Job[]>("/jobs", []);
  const [creating, setCreating]   = useState(false);
  const [name, setName]           = useState("");
  const [content, setContent]     = useState("");
  const [busy, setBusy]           = useState(false);
  const [formError, setFormError] = useState("");
  const [openId, setOpenId]       = useState<string | null>(null);
  const [tailorJob, setTailorJob] = useState("");
  const [tailor, setTailor]       = useState<{ id: string; result: TailorResult } | null>(null);
  const [tailorBusy, setTailorBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFormError("");
    try {
      await api.post("/resumes", { version_name: name.trim(), content_md: content || null });
      setCreating(false); setName(""); setContent(""); await reload();
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  async function remove(r: Resume) {
    if (!window.confirm(`Delete resume version "${r.version_name}"?`)) return;
    try { await api.delete(`/resumes/${r.id}`); await reload(); }
    catch (err) { setActionError(errorMessage(err)); }
  }

  async function runTailor(r: Resume) {
    setTailorBusy(true); setActionError("");
    try {
      const { data } = await api.post<TailorResult>("/resumes/tailor", { resume_id: r.id, job_id: tailorJob });
      setTailor({ id: r.id, result: data });
    } catch (err) { setActionError(errorMessage(err)); }
    finally { setTailorBusy(false); }
  }

  return (
    <div className="max-w-3xl space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Resumes</h2>
          <p className="mt-0.5 text-sm text-gray-500">Manage versions and tailor them to jobs with AI</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New version</button>
      </div>

      {(error || actionError) && <ErrorBanner message={error || actionError} onRetry={reload} />}

      {loading ? <Spinner /> : resumes.length === 0 ? (
        <EmptyState
          title="No resume versions"
          body="Keep one version per role type and link it when tracking an application."
          action={<button className="btn-primary" onClick={() => setCreating(true)}>New version</button>}
        />
      ) : (
        <ul className="space-y-3">
          {resumes.map(r => {
            const isOpen = openId === r.id;
            return (
              <li key={r.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.version_name}</p>
                      <p className="text-xs text-gray-400">Created {formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost !py-1.5 !text-xs" aria-expanded={isOpen}
                      onClick={() => { setOpenId(isOpen ? null : r.id); setTailor(null); }}>
                      {isOpen ? "Collapse" : "View & Tailor"}
                    </button>
                    <button className="btn-danger !py-1.5 !text-xs" onClick={() => remove(r)}>Delete</button>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-5 space-y-4">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs text-gray-700">
                      {r.content_md || "No content yet."}
                    </pre>

                    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                      <p className="text-sm font-semibold text-gray-800">AI Resume Tailor</p>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[14rem] flex-1">
                          <label className="label" htmlFor={`tj-${r.id}`}>Tailor for job</label>
                          <select id={`tj-${r.id}`} className="input" value={tailorJob} onChange={e => setTailorJob(e.target.value)}>
                            <option value="">Choose a job with a description</option>
                            {jobs.data.filter(j => j.jd_text).map(j => (
                              <option key={j.id} value={j.id}>{j.company} — {j.role_title}</option>
                            ))}
                          </select>
                        </div>
                        <button className="btn-primary" disabled={!tailorJob || !r.content_md || tailorBusy} onClick={() => runTailor(r)}>
                          {tailorBusy ? "Analyzing…" : "Get suggestions"}
                        </button>
                      </div>

                      {tailor?.id === r.id && (
                        <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4" aria-live="polite">
                          {tailor.result.used_fallback && <p className="text-xs text-amber-600">⚠️ AI unavailable — keyword comparison only.</p>}
                          {tailor.result.summary && <p className="text-sm text-gray-700">{tailor.result.summary}</p>}
                          {tailor.result.missing_keywords.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold text-gray-700">Missing keywords</p>
                              <div className="flex flex-wrap gap-2">
                                {tailor.result.missing_keywords.map(k => <SkillBadge key={k} name={k} variant="gap" />)}
                              </div>
                            </div>
                          )}
                          {tailor.result.suggested_bullets.length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold text-gray-700">Suggested bullets</p>
                              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                                {tailor.result.suggested_bullets.map((b, i) => <li key={i}>{b}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={creating} title="New resume version" onClose={() => setCreating(false)}>
        <form onSubmit={create} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <div>
            <label className="label" htmlFor="r-name">Version name</label>
            <input id="r-name" required maxLength={100} className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Backend-v1" />
          </div>
          <div>
            <label className="label" htmlFor="r-md">Content (markdown)</label>
            <textarea id="r-md" rows={10} className="input font-mono" value={content} onChange={e => setContent(e.target.value)} placeholder={"# Your Name\n## Experience\n..."} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save version"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
