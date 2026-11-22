export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-gray-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 text-xs font-semibold text-red-600 underline hover:no-underline">
          Try again
        </button>
      )}
    </div>
  );
}
