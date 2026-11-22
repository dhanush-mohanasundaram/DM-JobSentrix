import { motion } from "framer-motion";
import type { FunnelStage } from "../types";

const colors: Record<string, string> = {
  Applied:   "#3b82f6",
  Screening: "#f59e0b",
  Interview: "#8b5cf6",
  Offer:     "#10b981",
  Reject:    "#ef4444",
};

export default function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <ul className="space-y-3" aria-label="Applications by status">
      {stages.map((s, i) => (
        <li key={s.status} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="text-[13px] font-medium text-gray-600">{s.status}</span>
          <div className="h-6 overflow-hidden rounded-md bg-gray-100">
            <motion.div
              className="h-full rounded-md"
              style={{ backgroundColor: colors[s.status] ?? "#6b7280" }}
              initial={{ width: 0 }}
              animate={{ width: `${(s.count / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
            />
          </div>
          <span className="text-right text-[13px] font-semibold tabular-nums text-gray-800">{s.count}</span>
        </li>
      ))}
    </ul>
  );
}
