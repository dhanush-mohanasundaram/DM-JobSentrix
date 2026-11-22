# Repository Structure

## Layout
```
jobtrack-agent/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, lifespan, error handlers, CORS, router mounts
│   │   ├── database.py      # engine, SessionLocal, Base, get_db dependency
│   │   ├── core/
│   │   │   ├── config.py    # pydantic-settings Settings class
│   │   │   └── security.py  # JWT create/verify, password hash/verify
│   │   ├── models/
│   │   │   ├── _types.py    # shared column types (UUID, JSON/JSONB variant)
│   │   │   ├── user.py
│   │   │   ├── skill.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   ├── resume.py
│   │   │   ├── jd_parse.py
│   │   │   └── reminder.py
│   │   ├── schemas/
│   │   │   ├── user.py      # UserCreate, UserOut
│   │   │   ├── token.py     # Token, TokenData
│   │   │   ├── skill.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   ├── resume.py
│   │   │   ├── jd_parse.py
│   │   │   ├── reminder.py
│   │   │   └── dashboard.py
│   │   ├── routers/
│   │   │   ├── deps.py          # get_current_user, get_owned helper
│   │   │   ├── auth.py          # /auth/register, /auth/login, /auth/me
│   │   │   ├── skills.py        # /skills CRUD
│   │   │   ├── jobs.py          # /jobs CRUD
│   │   │   ├── applications.py  # /applications CRUD
│   │   │   ├── resumes.py       # /resumes CRUD + /resumes/tailor
│   │   │   ├── jd_analyzer.py   # /jd/analyze, /jd/parse/{job_id}
│   │   │   ├── reminders.py     # /reminders, /reminders/{id}/sent, /notifications
│   │   │   └── dashboard.py     # /dashboard/summary, /dashboard/funnel
│   │   ├── services/
│   │   │   ├── llm_service.py       # LLM call, retry, fallback, JSON parse
│   │   │   ├── matcher_service.py   # normalize, match score, skill gaps, roadmap
│   │   │   ├── rate_limit.py        # per-user sliding window
│   │   │   └── scheduler_service.py # APScheduler setup, run_reminder_job
│   │   └── tests/
│   │       ├── conftest.py          # SQLite in-memory engine, test client, fixtures
│   │       ├── test_auth.py
│   │       ├── test_crud.py
│   │       └── test_ai_and_scheduler.py
│   ├── alembic/
│   │   ├── env.py                   # imports app.models, sets target_metadata, render_as_batch
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json
│   ├── public/_redirects
│   ├── .env.example
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # router, MotionConfig reducedMotion="user"
│       ├── index.css           # Tailwind directives, Manrope font
│       ├── vite-env.d.ts
│       ├── components/
│       │   ├── Layout.tsx      # protected shell, redirects to /login when signed out
│       │   ├── Navbar.tsx      # links, alerts bell (unread count, Mark all read), logout, mobile menu
│       │   ├── JobCard.tsx
│       │   ├── ApplicationForm.tsx
│       │   ├── SkillBadge.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── FunnelChart.tsx  # Framer Motion bars filling in
│       │   ├── ReminderList.tsx
│       │   ├── EmptyState.tsx
│       │   ├── Modal.tsx        # role="dialog" + aria-modal + Escape-to-close + focus restore
│       │   ├── Spinner.tsx
│       │   └── ErrorBanner.tsx
│       ├── pages/
│       │   ├── AuthPage.tsx      # login + register tabs
│       │   ├── Dashboard.tsx     # summary cards, FunnelChart, ReminderList
│       │   ├── Jobs.tsx          # table (desktop) / cards (mobile), add/edit modal, Analyze button
│       │   ├── Applications.tsx  # Board + Table views, status filters, date range, Track modal
│       │   ├── JdAnalyzer.tsx    # job picker, textarea, match-score ring, roadmap, fallback notice
│       │   ├── Resumes.tsx       # list, create, view, delete, tailor panel
│       │   └── Settings.tsx      # account info, skills management
│       ├── context/
│       │   └── AuthContext.tsx   # login, register, logout, session restore via /auth/me
│       ├── services/
│       │   └── api.ts            # axios instance, JWT interceptor, 401→auth:expired, errorMessage helper
│       ├── types/
│       │   └── index.ts          # all TypeScript interfaces matching backend schemas
│       └── utils/
│           └── index.ts          # useApi<T>(url, initial) hook
├── setup.ps1
├── run-backend.ps1
├── run-frontend.ps1
├── run-tests.ps1
├── render.yaml
├── .gitignore
├── README.md
├── architecture.md
└── DEPLOYMENT.md
```

## Key Conventions

### Backend
- SQLAlchemy 2.0 declarative style with `Mapped[...]` and `mapped_column`
- UUID primary keys via `sqlalchemy.Uuid`
- JSON columns: `JSON().with_variant(JSONB(), "postgresql")`
- Timestamps: `server_default=func.now()`, timezone-aware
- `ondelete="CASCADE"` from user and job down; `SET NULL` where noted
- Index every foreign key column
- One `get_owned(db, model, id, user_id)` helper used in every ownership check
- All route handlers are `def` (sync), not `async def`
- `alembic/env.py` uses `render_as_batch=True` for SQLite compatibility

### Frontend
- Dark theme: page `bg-slate-950`, cards `bg-slate-800`, primary action `indigo-600`
- Colour-coded status badges, mobile-first responsive
- `@layer components` block for `.card`, `.input`, `.btn-*`
- Typography: Manrope font with system fallback; sentence-case copy
- Motion: one deliberate moment per interaction — funnel bars, match-score ring; modal open/close; short route fade
- `MotionConfig reducedMotion="user"` wraps the whole app
- Accessibility: labelled form controls, `role="dialog"` + `aria-modal` + Escape-to-close + focus restore on modals, `aria-live` on analysis results, visible focus rings, skip-to-content link, `aria-pressed` on toggles
- Every page has loading, error, and empty states
- `useApi<T>(url, initial)` returns `{data, setData, loading, error, reload}`

## .gitignore must exclude
`venv/`, `.env`, `node_modules/`, `dist/`, `*.db`, `__pycache__/`, `.pytest_cache/`
