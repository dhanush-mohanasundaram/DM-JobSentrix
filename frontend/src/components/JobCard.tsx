import type { Job } from "../types";
import { formatDate } from "../utils/format";

interface Props {
  job: Job;
  onEdit: (j: Job) => void;
  onDelete: (j: Job) => void;
  onAnalyze: (j: Job) => void;
}

export default function JobCard({ job, onEdit, onDelete, onAnalyze }: Props) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900">{job.role_title}</h3>
          <p className="truncate text-sm text-gray-600">{job.company}</p>
        </div>
        {job.application_link && (
          <a href={job.application_link} target="_blank" rel="noreferrer" className="shrink-0 text-sm text-blue-600 hover:underline">
            Open posting
          </a>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {[job.location, job.salary_offered, `Added ${formatDate(job.created_at)}`].filter(Boolean).join(", ")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary !py-1.5 !text-xs" onClick={() => onAnalyze(job)}>Analyze JD</button>
        <button className="btn-ghost !py-1.5 !text-xs" onClick={() => onEdit(job)}>Edit</button>
        <button className="btn-danger !py-1.5 !text-xs" onClick={() => onDelete(job)}>Delete</button>
      </div>
    </article>
  );
}
