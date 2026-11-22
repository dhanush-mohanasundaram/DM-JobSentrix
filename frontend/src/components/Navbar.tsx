import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import type { AppNotification } from "../types";
import { formatDate } from "../utils/format";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/jobs", label: "Jobs" },
  { to: "/applications", label: "Applications" },
  { to: "/analyzer", label: "JD Analyzer" },
  { to: "/resumes", label: "Resumes" },
  { to: "/settings", label: "Settings" },
];

function linkCls({ isActive }: { isActive: boolean }) {
  return `relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "text-blue-600 font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-blue-600"
      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
  }`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const unread = notes.filter((n) => !n.is_read).length;

  const load = useCallback(() => {
    api.get<AppNotification[]>("/notifications").then((r) => setNotes(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [load]);

  async function readAll() {
    await api.post("/notifications/read-all").catch(() => undefined);
    load();
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <>
      {/* Top gradient bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-500" aria-hidden />

      <header className="sticky top-0.5 z-40 border-b border-gray-200 bg-white shadow-sm">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          {/* Logo */}
          <span className="mr-4 text-lg font-extrabold tracking-tight text-blue-600 select-none">
            JobTrack
          </span>

          {/* Desktop nav */}
          <div className="hidden flex-1 gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls}>
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setBell((v) => !v)}
                aria-expanded={bell}
                aria-label={`Notifications, ${unread} unread`}
                className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {bell && (
                <div className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                  {notes.length === 0 ? (
                    <p className="p-2 text-sm text-gray-500">No alerts yet.</p>
                  ) : (
                    <>
                      <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                        {notes.map((n) => (
                          <li key={n.id} className="py-2 text-sm">
                            <p className={n.is_read ? "text-gray-500" : "font-semibold text-gray-900"}>{n.message}</p>
                            <p className="text-xs text-gray-400">{formatDate(n.created_at)}</p>
                          </li>
                        ))}
                      </ul>
                      {unread > 0 && (
                        <button className="btn-ghost mt-2 w-full !py-1 text-xs" onClick={readAll}>
                          Mark all read
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User avatar + name */}
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white select-none">
                {initials}
              </div>
              <span className="max-w-[10rem] truncate text-sm font-medium text-gray-700">
                {user?.full_name || user?.email}
              </span>
            </div>

            <button className="btn-ghost !py-1.5 text-sm" onClick={logout}>
              Log out
            </button>

            {/* Mobile hamburger */}
            <button
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              aria-expanded={menu}
              aria-label="Toggle menu"
              onClick={() => setMenu((v) => !v)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                {menu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {menu && (
          <div className="flex flex-col gap-1 border-t border-gray-200 bg-white px-4 py-2 md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls} onClick={() => setMenu(false)}>
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
