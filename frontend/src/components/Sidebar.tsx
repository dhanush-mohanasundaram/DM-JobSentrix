import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props { isOpen: boolean; }

const nav = [
  { label: "Dashboard",    path: "/",            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { label: "Jobs",         path: "/jobs",        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> },
  { label: "Applications", path: "/applications",icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg> },
  { label: "JD Analyzer",  path: "/analyzer",   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg> },
  { label: "Resumes",      path: "/resumes",     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg> },
  { label: "Settings",     path: "/settings",    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export default function Sidebar({ isOpen }: Props) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <aside
      className="flex flex-col h-screen flex-shrink-0 transition-all duration-200"
      style={{
        width: isOpen ? 240 : 0,
        minWidth: isOpen ? 240 : 0,
        overflow: 'hidden',
        background: '#ffffff',
        borderRight: '1px solid #e8e6e1',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-gray-900">JobTrack</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-400 pl-[42px]">Job search manager</p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-gray-100 mb-3" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Main">
        {nav.map(({ label, path, icon }) => {
          const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors"
              style={active
                ? { background: '#f0ede8', color: '#1a1a1a', fontWeight: 600 }
                : { color: '#6b6966' }
              }
            >
              <span style={{ color: active ? '#1a1a1a' : '#9b9894' }}>{icon}</span>
              <span className="whitespace-nowrap">{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-black" />}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-5 border-t border-gray-100 mt-3" />

      {/* User */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-gray-50 border border-gray-100">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {user?.full_name && <p className="truncate text-[13px] font-semibold text-gray-900">{user.full_name}</p>}
            <p className="truncate text-[11px] text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}
