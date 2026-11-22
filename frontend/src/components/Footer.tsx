import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 text-white">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">

          {/* Brand */}
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-white">JobTrack</span>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">
              AI-powered job application tracker.<br />
              Know where every application stands.
            </p>
            <div className="mt-4 flex gap-3">
              <span className="rounded-lg bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-300">Free to use</span>
              <span className="rounded-lg bg-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-300">AI-powered</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Navigation</p>
            <nav className="flex flex-col gap-2.5" aria-label="Footer navigation">
              {[
                { to: "/", label: "Dashboard" },
                { to: "/jobs", label: "Jobs" },
                { to: "/applications", label: "Applications" },
                { to: "/analyzer", label: "JD Analyzer" },
                { to: "/resumes", label: "Resumes" },
                { to: "/settings", label: "Settings" },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    `text-sm transition-colors ${isActive ? "font-semibold text-blue-400" : "text-gray-400 hover:text-white"}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Links */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Resources</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Track applications</p>
              <p className="text-sm text-gray-400">Analyze job descriptions</p>
              <p className="text-sm text-gray-400">Tailor your resume</p>
              <p className="text-sm text-gray-400">Set follow-up reminders</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 flex flex-col items-center gap-2 md:flex-row md:justify-between">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} JobTrack Agent. All rights reserved.</p>
          <p className="text-xs text-gray-600">FastAPI · SQLAlchemy · React · Groq AI</p>
        </div>
      </div>
    </footer>
  );
}
