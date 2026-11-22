import type { Status } from "../types";

export const statusStyles: Record<Status, { badge: string; bar: string }> = {
  Applied: { badge: "bg-blue-50 text-blue-700 ring-blue-200", bar: "bg-blue-500" },
  Screening: { badge: "bg-amber-50 text-amber-700 ring-amber-200", bar: "bg-amber-500" },
  Interview: { badge: "bg-violet-50 text-violet-700 ring-violet-200", bar: "bg-violet-500" },
  Offer: { badge: "bg-green-50 text-green-700 ring-green-200", bar: "bg-green-500" },
  Reject: { badge: "bg-red-50 text-red-700 ring-red-200", bar: "bg-red-500" },
};

export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const reminderLabel: Record<string, string> = {
  follow_up_7d: "7-day follow-up",
  follow_up_14d: "14-day follow-up",
};
