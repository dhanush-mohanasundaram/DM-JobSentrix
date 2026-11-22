import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const titles: Record<string, string> = {
  "/":            "Dashboard",
  "/jobs":        "Jobs",
  "/applications":"Applications",
  "/analyzer":   "JD Analyzer",
  "/resumes":     "Resumes",
  "/settings":    "Settings",
};

interface Props { onMenuToggle: () => void; }

export default function TopBar({ onMenuToggle }: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = titles[pathname] ?? "JobTrack";

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <h1 className="text-[15px] font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="search"
            placeholder="Search…"
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-[13px] text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none transition-colors"
            style={{ width: 180 }}
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-gray-200 mx-1" />

        {/* Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white select-none"
          title={user?.full_name ?? user?.email ?? ""}
        >
          {initials}
        </div>
        {user?.full_name && (
          <span className="hidden lg:block text-[13px] font-medium text-gray-700 max-w-[120px] truncate">
            {user.full_name}
          </span>
        )}
      </div>
    </header>
  );
}
