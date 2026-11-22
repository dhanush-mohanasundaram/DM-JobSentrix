import type { ReactNode } from "react";

interface Props { title: string; body: string; action?: ReactNode }

export default function EmptyState({ title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-gray-500 leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
