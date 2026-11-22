import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { ErrorBanner, Spinner } from "../components/Feedback";
import Modal from "../components/Modal";
import api, { errorMessage } from "../services/api";
import type { Job } from "../types";
import { formatDate } from "../utils/format";
import { useApi } from "../utils/useApi";

const blank = { company: "", role_title: "", location: "", salary_offered: "", application_link: "", jd_text: "" };
const COLORS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-indigo-500","bg-teal-500","bg-orange-500"];
const avatarColor = (n: string) => COLORS[n.charCodeAt(0) % COLORS.length];

export default function Jobs() {
  const navigate = useNavigate();
  const { data: jobs, loading, error, reload } = useApi<Job[]>("/jobs", []);
  const [editing, setEditing] = useState<Job | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  function open(job: Job | "new") {
    setEditing(job); setFormError("");
    setForm(job === "new" ? blank : {
      company: job.company, role_title: job.role_title, location: job.location ?? "",
      salary_offered: job.salary_offered ?? "", application_link: job.application_link ?? "", jd_text: job.jd_text ?? "",
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setFormError("");
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]));
    try {
      if (editing === "new") await api.post("/jobs", body);
      else if (editing) await api.put(`/jobs/${editing.id}`, body);
      setEditing(null); await reload();
    } catch (err) { setFormError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  async function remove(job: Job) {
    if (!window.confirm(`Delete ${job.role_title} at ${job.company}?`)) return;
    try { await api.delete(`/jobs/${job.id}`); await reload(); }
    catch (err) { setActionError(errorMessage(err)); }
  }

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Jobs</h2>
          <p className="mt-0.5 text-sm text-gray-500">Save postings and analyze them with AI</p>
        </div>
        <button className="btn-primary" onClick={() => open("new")}>+ Add job</button>
      </div>

      {(error || actionError) && <ErrorBanner message={error || actionError} onRetry={reload} />}

      {loading ? <Spinner /> : jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          body="Save job postings with their descriptions so you can analyze them and track applications."
          action={<button className="btn-primary" onClick={() => open("new")}>Add your first job</button>}
        />
      ) : (
        <div className="space-y-4">
          {/* Stats strip */}
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">{jobs.length} job{jobs.length !== 1 ? "s" : ""} saved</span>
            <span className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">{jobs.filter(j => j.jd_text).length} with JD</span>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {["Company & Role", "Location", "Salary", "Added", ""].map((h, i) => (
                    <th key={i} scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map(j => (
                  <tr key={j.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${avatarColor(j.company)}`}>
                          {j.company[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {j.application_link
                              ? <a href={j.application_link} target="_blank" rel="noreferrer" className="hover:underline">{j.role_title}</a>
                              : j.role_title}
                          </p>
                          <p className="text-xs text-gray-400">{j.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{j.location ?? "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{j.salary_offered ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{formatDate(j.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-primary !px-3 !py-1 !text-xs" onClick={() => navigate(`/analyzer?job=${j.id}`)}>Analyze</button>
                        <button className="btn-ghost !px-3 !py-1 !text-xs" onClick={() => open(j)}>Edit</button>
                        <button className="btn-danger !px-3 !py-1 !text-xs" onClick={() => remove(j)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {jobs.map(j => (
              <div key={j.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarColor(j.company)}`}>
                    {j.company[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{j.role_title}</p>
                    <p className="text-sm text-gray-500">{j.company}{j.location ? ` · ${j.location}` : ""}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary !py-1 !text-xs" onClick={() => navigate(`/analyzer?job=${j.id}`)}>Analyze</button>
                  <button className="btn-ghost !py-1 !text-xs" onClick={() => open(j)}>Edit</button>
                  <button className="btn-danger !py-1 !text-xs" onClick={() => remove(j)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Tip card */}
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500">💡 Tip — click <strong>Analyze</strong> on any job to get your match score, skill gaps, and a learning roadmap.</p>
          </div>
        </div>
      )}

      <Modal open={editing !== null} title={editing === "new" ? "Add job" : "Edit job"} onClose={() => setEditing(null)}>
        <form onSubmit={save} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="j-company">Company</label><input id="j-company" required maxLength={150} className="input" value={form.company} onChange={set("company")} placeholder="e.g. Google" /></div>
            <div><label className="label" htmlFor="j-role">Role title</label><input id="j-role" required maxLength={150} className="input" value={form.role_title} onChange={set("role_title")} placeholder="e.g. Software Engineer" /></div>
            <div><label className="label" htmlFor="j-loc">Location</label><input id="j-loc" maxLength={100} className="input" value={form.location} onChange={set("location")} placeholder="e.g. Bangalore" /></div>
            <div><label className="label" htmlFor="j-sal">Salary</label><input id="j-sal" maxLength={50} className="input" value={form.salary_offered} onChange={set("salary_offered")} placeholder="e.g. ₹12 LPA" /></div>
          </div>
          <div><label className="label" htmlFor="j-link">Posting link</label><input id="j-link" type="url" maxLength={500} className="input" value={form.application_link} onChange={set("application_link")} placeholder="https://" /></div>
          <div><label className="label" htmlFor="j-jd">Job description</label><textarea id="j-jd" rows={6} className="input" value={form.jd_text} onChange={set("jd_text")} placeholder="Paste the full job description here…" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save job"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
