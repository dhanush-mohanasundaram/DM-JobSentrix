import type { Status } from "../types";

const styles: Record<Status, string> = {
  Applied:   "bg-blue-50   text-blue-700   border border-blue-200",
  Screening: "bg-amber-50  text-amber-700  border border-amber-200",
  Interview: "bg-violet-50 text-violet-700 border border-violet-200",
  Offer:     "bg-green-50  text-green-700  border border-green-200",
  Reject:    "bg-red-50    text-red-600    border border-red-200",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}
