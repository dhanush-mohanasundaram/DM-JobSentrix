import type { Reminder } from "../types";
import { formatDate, reminderLabel } from "../utils/format";
import EmptyState from "./EmptyState";

interface Props { reminders: Reminder[]; onDone: (r: Reminder) => void }

export default function ReminderList({ reminders, onDone }: Props) {
  if (!reminders.length)
    return <EmptyState title="No follow-ups waiting" body="Reminders appear here 7 and 14 days after you track an application." />;
  return (
    <ul className="divide-y divide-gray-100">
      {reminders.map((r) => (
        <li key={r.id} className={`flex items-center justify-between gap-3 py-3 pl-3 border-l-4 ${r.is_due ? "border-red-400" : "border-gray-300"}`}>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-gray-900">{r.company}</p>
            <p className="text-[12px] text-gray-500">
              {reminderLabel[r.reminder_type] ?? "Follow-up"} · {r.is_due ? <span className="text-red-600 font-medium">Due today</span> : `Due ${formatDate(r.due_date)}`}
            </p>
          </div>
          <button onClick={() => onDone(r)} className="btn-ghost !px-3 !py-1 !text-xs shrink-0">
            Done
          </button>
        </li>
      ))}
    </ul>
  );
}
