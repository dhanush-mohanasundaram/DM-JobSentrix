import type { Proficiency } from "../types";

const tone: Record<Proficiency, string> = {
  Beginner:     "bg-gray-100   text-gray-600   border border-gray-200",
  Intermediate: "bg-blue-50    text-blue-700   border border-blue-200",
  Advanced:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

interface Props {
  name: string;
  proficiency?: Proficiency;
  variant?: "neutral" | "match" | "gap";
  onRemove?: () => void;
}

export default function SkillBadge({ name, proficiency, variant = "neutral", onRemove }: Props) {
  const cls =
    variant === "match" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
    variant === "gap"   ? "bg-red-50 text-red-600 border border-red-200" :
    proficiency         ? tone[proficiency] :
                          "bg-gray-100 text-gray-600 border border-gray-200";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${cls}`}>
      {name}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${name}`}
          className="-mr-0.5 rounded px-0.5 opacity-50 hover:opacity-100 transition-opacity">
          ×
        </button>
      )}
    </span>
  );
}
