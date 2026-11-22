import { useMemo, useState } from "react";
import ApplicationForm from "../components/ApplicationForm";
import EmptyState from "../components/EmptyState";
import { ErrorBanner, Spinner } from "../components/Feedback";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import api, { errorMessage } from "../services/api";
import type { Application, Job, Resume, Status } from "../types";
import { STATUSES } from "../types";
import { formatDate } from "../utils/format";
import { useApi } from "../utils/useApi";

type View = "board" | "table";

const colHeader: Record<Status, string> = {
  Applied:   "bg-blue-50   border-blue-200   text-blue-700",
  Screening: "bg-amber-50  border-amber-200  text-amber-700",
  Interview: "bg-violet-50 border-violet-200 text-violet-700",
  Offer:     "bg-green-50  border-green-200  text-green-700",
  Reject:    "bg-red-50    border-red-200    text-red-600",
};

export default function Applications() {
  const [view, setView]               = useState<View>("board");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom]               = useState("");
  const [to, setTo]                   = useState("");
  const [adding, setAdding]           = useState(false);
  const [actionError, setActionError] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    const s = p.toString();
    return `/applications${s ? `?${s}` : ""}`;
  }, [statusFilter, from, to]);

  const apps    = useApi<Application[]>(query, []);
  const jobs    = useApi<Job[]>("/jobs", []);
  const resumes = useApi<Resume[]>("/resumes", []);

  async function changeStatus(a: Application, status: Status) {
    const previous = a.status;
    apps.setData(list => list.map(x => x.id === a.id ? { ...x, status } : x));
    try { await api.patch(`/applications/${a.id}`, { status }); }
    catch (err) {
      apps.setData(list => list.map(x => x.id === a.id ? { ...x, status: previous } : x));
      setActionError(errorMessage(err));
    }
  }

  async function remove(a: Application) {
    if (!window.confirm(`Delete the application to ${a.job.company}?`)) return;
    try { await api.delete(`/applications/${a.id}`); await apps.reload(); }
    catch (err) { setActionError(errorMessage(err)); }
  }

  const error = apps.error || actionError;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Applications</h2>
          <p className="mt-0.5 text-sm text-gray-500">Track every stage of your job search</p>
        </div>
        <button className="btn-primary" disabled={jobs.data.length === 0} onClick={() => setAdding(true)}>
          + Track application
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <label className="label" htmlFor="f-status">Status</label>
          <select id="f-status" className="input !w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-from">From</label>
          <input id="f-from" type="date" className="input !w-auto" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-to">To</label>
          <input id="f-to" type="date" className="input !w-auto" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="ml-auto flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label="View">
          {(["board", "table"] as View[]).map(v => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={apps.reload} />}

      {/* Content */}
      {apps.loading ? <Spinner /> : apps.data.length === 0 ? (
        <EmptyState
          title={statusFilter || from || to ? "No applications match these filters" : "No applications yet"}
          body={jobs.data.length === 0 ? "Add a job first, then track your application here." : "Track an application to start its pipeline and reminders."}
        />
      ) : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {STATUSES.map(s => {
            const col = apps.data.filter(a => a.status === s);
            return (
              <section key={s} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className={`flex items-center justify-between border-b px-4 py-2.5 ${colHeader[s]}`}>
                  <span className="text-xs font-bold">{s}</span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">{col.length}</span>
                </div>
                <div className="space-y-2 p-3">
                  {col.map(a => (
                    <article key={a.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="truncate text-sm font-semibold text-gray-900">{a.job.company}</p>
                      <p className="truncate text-xs text-gray-500">{a.job.role_title}</p>
                      <p className="mt-1 text-xs text-gray-400">Applied {formatDate(a.applied_date)}</p>
                      {a.notes && <p className="mt-1 line-clamp-2 text-xs text-gray-400">{a.notes}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <select aria-label={`Status for ${a.job.company}`} className="input !w-auto !py-1 !text-xs"
                          value={a.status} onChange={e => changeStatus(a, e.target.value as Status)}>
                          {STATUSES.map(st => <option key={st}>{st}</option>)}
                        </select>
                        <button onClick={() => remove(a)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </article>
                  ))}
                  {col.length === 0 && <p className="py-4 text-center text-xs text-gray-400">Empty</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>{["Company","Role","Applied","Status","Notes",""].map((h,i) => (
                <th key={i} scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {apps.data.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{a.job.company}</td>
                  <td className="px-5 py-3.5 text-gray-600">{a.job.role_title}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-gray-500">{formatDate(a.applied_date)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status as Status} />
                      <select aria-label={`Status for ${a.job.company}`} className="input !w-auto !py-1 !text-xs"
                        value={a.status} onChange={e => changeStatus(a, e.target.value as Status)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3.5 text-gray-500">{a.notes ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="btn-danger !px-3 !py-1 !text-xs" onClick={() => remove(a)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={adding} title="Track application" onClose={() => setAdding(false)}>
        <ApplicationForm jobs={jobs.data} resumes={resumes.data}
          onCancel={() => setAdding(false)}
          onSaved={() => { setAdding(false); void apps.reload(); }} />
      </Modal>
    </div>
  );
}
