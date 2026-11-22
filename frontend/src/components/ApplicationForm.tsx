import { useState, type FormEvent } from "react";
import api, { errorMessage } from "../services/api";
import type { Application, Job, Resume, Status } from "../types";
import { STATUSES } from "../types";
import { todayISO } from "../utils/format";
import { ErrorBanner } from "./Feedback";

interface Props { jobs: Job[]; resumes: Resume[]; defaultJobId?: string; onSaved: (a: Application) => void; onCancel: () => void }

export default function ApplicationForm({ jobs, resumes, defaultJobId, onSaved, onCancel }: Props) {
  const [jobId, setJobId] = useState(defaultJobId ?? jobs[0]?.id ?? "");
  const [resumeId, setResumeId] = useState("");
  const [status, setStatus] = useState<Status>("Applied");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<Application>("/applications", {
        job_id: jobId,
        resume_version_id: resumeId || null,
        status,
        applied_date: date,
        notes: notes || null,
      });
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label" htmlFor="af-job">Job</label>
        <select id="af-job" className="input" required value={jobId} onChange={(e) => setJobId(e.target.value)}>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.company}, {j.role_title}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="af-resume">Resume version</label>
          <select id="af-resume" className="input" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            <option value="">None</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.version_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="af-status">Status</label>
          <select id="af-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="af-date">Applied on</label>
        <input id="af-date" type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
        <p className="mt-1.5 text-xs text-gray-400">Follow-up reminders are created for day 7 and day 14.</p>
      </div>
      <div>
        <label className="label" htmlFor="af-notes">Notes</label>
        <textarea id="af-notes" rows={3} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy || !jobId}>{busy ? "Saving…" : "Track application"}</button>
      </div>
    </form>
  );
}
