# Tasks: JobTrack Agent

## Phase 1 — Foundation and Auth

### 1.1 Project skeleton
- [ ] Confirm `requirements.txt` has all pinned backend versions
- [ ] Confirm `pytest.ini` sets `testpaths = app/tests` and `asyncio_mode = auto` is NOT set (sync tests)
- [ ] Confirm `.env.example` lists all required env keys
- [ ] Confirm `.gitignore` excludes `venv/`, `.env`, `node_modules/`, `dist/`, `*.db`, `__pycache__/`, `.pytest_cache/`

### 1.2 Config and database
- [ ] `app/core/config.py` — `Settings` class via pydantic-settings; reads all env keys
- [ ] `app/database.py` — sync engine, `SessionLocal`, `Base`, `get_db` dependency
- [ ] `app/models/_types.py` — `UUIDType = sqlalchemy.Uuid`, `JsonType = JSON().with_variant(JSONB(), "postgresql")`

### 1.3 User model and migration
- [ ] `app/models/user.py` — `User` model with all columns per spec
- [ ] `app/models/__init__.py` — import all models so Alembic sees them
- [ ] `alembic/env.py` — imports `app.models`, sets `target_metadata = Base.metadata`, reads URL from settings, uses `render_as_batch=True`
- [ ] `alembic/versions/0001_initial_schema.py` — full schema migration (users table only at this phase; will be extended in Phase 2)
- [ ] Run `alembic upgrade head` → succeeds
- [ ] Run `alembic check` → "No new upgrade operations detected"

### 1.4 Security
- [ ] `app/core/security.py` — `hash_password`, `verify_password`, `create_access_token`, `decode_access_token`

### 1.5 Auth router
- [ ] `app/schemas/user.py` — `UserCreate`, `UserOut`, `UserLogin`
- [ ] `app/schemas/token.py` — `Token`, `TokenData`
- [ ] `app/routers/deps.py` — `get_current_user` (returns 401 with WWW-Authenticate: Bearer on failure); `get_owned(db, model, id, user_id)` helper
- [ ] `app/routers/auth.py` — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- [ ] `app/main.py` — FastAPI app, CORS, error handlers (RequestValidationError, HTTPException, Exception), mount auth router, `GET /health`

### 1.6 Phase 1 tests
- [ ] `app/tests/conftest.py` — SQLite in-memory engine, override `get_db`, `TestClient`, user fixtures
- [ ] `app/tests/test_auth.py`:
  - register succeeds → user returned, no password_hash
  - duplicate email → 400
  - password < 8 chars → 422
  - login with correct creds → token returned
  - wrong password → 401 with WWW-Authenticate header
  - GET /auth/me with valid token → user
  - GET /auth/me with no token → 401
  - GET /auth/me with bad token → 401
  - unknown route → error envelope shape
  - 422 → error envelope shape

### Phase 1 Verification
```powershell
cd backend
alembic upgrade head
alembic check
pytest app/tests/test_auth.py -v
```
Expected: all tests pass, alembic clean.

---

## Phase 2 — Core CRUD

### 2.1 Remaining models
- [ ] `app/models/skill.py` — `UserSkill` model
- [ ] `app/models/job.py` — `Job` model
- [ ] `app/models/resume.py` — `Resume` model
- [ ] `app/models/application.py` — `Application` model
- [ ] `app/models/jd_parse.py` — `JdParse` model
- [ ] `app/models/reminder.py` — `Reminder`, `Notification` models

### 2.2 Update migration
- [ ] Update `0001_initial_schema.py` to include ALL tables (or add new revision)
- [ ] `alembic upgrade head` and `alembic check` both clean

### 2.3 Schemas
- [ ] `app/schemas/skill.py`
- [ ] `app/schemas/job.py`
- [ ] `app/schemas/application.py`
- [ ] `app/schemas/resume.py`
- [ ] `app/schemas/jd_parse.py`
- [ ] `app/schemas/reminder.py`
- [ ] `app/schemas/dashboard.py`

### 2.4 Routers
- [ ] `app/routers/skills.py` — full CRUD; Proficiency as `Literal["Beginner","Intermediate","Advanced"]`
- [ ] `app/routers/jobs.py` — full CRUD, newest first, partial update with `exclude_unset`
- [ ] `app/routers/resumes.py` — CRUD (tailor endpoint added in Phase 3)
- [ ] `app/routers/applications.py` — list with filters, POST auto-creates 2 reminders in same transaction, PATCH, DELETE
- [ ] Mount all routers in `app/main.py`

### 2.5 Phase 2 tests
- [ ] `app/tests/test_crud.py`:
  - Skills: CRUD, invalid proficiency → 422, another user's skill → 404
  - Jobs: CRUD, partial update, cascade delete removes application and jd_parse
  - Resumes: CRUD, ownership
  - Applications: create auto-creates 2 reminders, list with status filter, list with date filter, PATCH status, cascade delete removes reminders, invalid status → 422
  - Cross-user isolation: user B cannot read/update/delete user A's job, application, skill, resume → 404

### Phase 2 Verification
```powershell
cd backend
alembic upgrade head
alembic check
pytest app/tests/test_crud.py -v
```
Expected: all tests pass, alembic clean.

---

## Phase 3 — AI Layer

### 3.1 Rate limiter
- [ ] `app/services/rate_limit.py` — in-memory sliding window, `check_rate_limit(user_id, limit, window_seconds)`

### 3.2 LLM service
- [ ] `app/services/llm_service.py`:
  - `call_llm(jd_text, settings)` — sync httpx.Client
  - Groq: `https://api.groq.com/openai/v1/chat/completions`
  - OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
  - `response_format: {"type":"json_object"}`, temperature 0.1, bearer-token header
  - Retry once on 429/500/502/503/504/timeout
  - Strip ``` fences, extract first `{` to last `}`, `json.loads`, validate fields, clean lists
  - Raise `LLMError` after retry failure
  - Fallback extractor: `fallback_extract(jd_text)` — regex vocab, boundary lookarounds, seniority inference
  - Never log API keys or full prompts

### 3.3 Matcher service
- [ ] `app/services/matcher_service.py`:
  - `normalize(skill)` with alias map
  - `compute_match(required_skills, user_skills)` → `{match_score, matched_skills, skill_gaps}`
  - `build_roadmap(skill_gaps)` → list of `{week, skill, focus}`, max 8 items

### 3.4 JD Analyzer router
- [ ] `app/routers/jd_analyzer.py`:
  - `POST /jd/analyze`
  - `GET /jd/parse/{job_id}`
- [ ] Add tailor endpoint to `app/routers/resumes.py`: `POST /resumes/tailor`

### 3.5 Phase 3 tests
- [ ] `app/tests/test_ai_and_scheduler.py` (AI portion):
  - match score = 0.5 for `[Python, PostgreSQL, Docker, AWS]` vs `[python, Postgres]`
  - aliases handled, duplicates de-duped
  - empty required → 0.0
  - JSON parser: accepts fenced output, accepts chatty preamble; rejects `""`, `"no json"`, `"{broken"`, `"[1,2]"`
  - fallback: `java` NOT matched inside `javascript`; `c++`, `node.js`, `ci/cd` matched
  - LLM failure (mocked) → 200, `used_fallback: true`
  - re-analysis → same jd_parses row updated (not duplicated)
  - empty JD → 400
  - 6th call within minute → 429
  - LLM HTTP behaviour via `httpx.MockTransport`: correct URL, bearer header, retry then `LLMError` on repeated 429, missing key → `LLMError`

### Phase 3 Verification
```powershell
cd backend
pytest app/tests/test_ai_and_scheduler.py -v -k "not scheduler"
```
Expected: all AI tests pass with LLM calls mocked (no network).

---

## Phase 4 — Reminders and Scheduler

### 4.1 Reminders router
- [ ] `app/routers/reminders.py`:
  - `GET /reminders` — unsent, soonest first, with company/role_title/is_due
  - `PATCH /reminders/{id}/sent`
  - `GET /notifications` — latest 50
  - `POST /notifications/read-all` → 204

### 4.2 Scheduler service
- [ ] `app/services/scheduler_service.py`:
  - `run_reminder_job(settings)` — queries due, unsent reminders; for each, check if notification exists; if not, create one; log failures, never raise
  - `start_scheduler(app, settings)` — BackgroundScheduler, SQLAlchemyJobStore, interval job registered by import path string, `replace_existing=True`, `coalesce=True`, `max_instances=1`
  - `stop_scheduler(app)` — called in lifespan shutdown
- [ ] Wire into `app/main.py` lifespan; skip when `ENABLE_SCHEDULER=false`

### 4.3 Dashboard router
- [ ] `app/routers/dashboard.py`:
  - `GET /dashboard/summary`
  - `GET /dashboard/funnel`

### 4.4 Phase 4 tests
- [ ] `app/tests/test_ai_and_scheduler.py` (scheduler portion):
  - POST /applications auto-creates reminders at applied_date+7 and +14
  - Reminder due_dates are `applied_date + 7` and `applied_date + 14`
  - Marking a reminder done hides it from GET /reminders
  - `run_reminder_job` creates notification for a 10-day-old application
  - Running `run_reminder_job` twice creates only one notification (idempotent)
  - POST /notifications/read-all → 204, notifications marked read
  - Dashboard: 4 applications (1 Interview, 1 Reject) → response_rate = 50.0, correct status_counts

### Phase 4 Verification
```powershell
cd backend
pytest app/tests/ -v
# Then start the server and confirm scheduler starts/stops:
$env:ENABLE_SCHEDULER="true"; uvicorn app.main:app --reload
# Confirm log shows scheduler started. Ctrl+C → confirm clean stop.
```

---

## Phase 5 — Frontend

### 5.1 Setup
- [ ] Confirm `package.json` has all pinned frontend versions
- [ ] `tailwind.config.js` — dark mode, Manrope font, `bg-slate-950`, `bg-slate-800`, `indigo-600`
- [ ] `src/index.css` — `@layer components` for `.card`, `.input`, `.btn-primary`, `.btn-danger`
- [ ] `src/types/index.ts` — all TypeScript interfaces (User, Skill, Job, Application, Resume, JdParse, Reminder, Notification, DashboardSummary, FunnelItem, TailorOut)

### 5.2 API layer
- [ ] `src/services/api.ts` — axios instance, `VITE_API_URL`, JWT interceptor, 401→`auth:expired`, `errorMessage(err)` helper
- [ ] `src/utils/index.ts` — `useApi<T>(url, initial)` hook

### 5.3 Auth
- [ ] `src/context/AuthContext.tsx` — login, register, logout, restoreSession via `/auth/me`
- [ ] `src/pages/AuthPage.tsx` — login + register tabs

### 5.4 Layout and routing
- [ ] `src/App.tsx` — `BrowserRouter`, `MotionConfig reducedMotion="user"`, route definitions, `AnimatePresence` for route fade
- [ ] `src/components/Layout.tsx` — protected shell, redirect to `/login`
- [ ] `src/components/Navbar.tsx` — links, alerts bell with unread count, "Mark all read", logout, mobile menu

### 5.5 Shared components
- [ ] `src/components/Modal.tsx` — `role="dialog"`, `aria-modal`, Escape-to-close, focus restore
- [ ] `src/components/Spinner.tsx`
- [ ] `src/components/ErrorBanner.tsx`
- [ ] `src/components/EmptyState.tsx`
- [ ] `src/components/StatusBadge.tsx` — colour per status
- [ ] `src/components/SkillBadge.tsx`
- [ ] `src/components/FunnelChart.tsx` — Framer Motion bars filling in
- [ ] `src/components/JobCard.tsx`
- [ ] `src/components/ApplicationForm.tsx`
- [ ] `src/components/ReminderList.tsx`

### 5.6 Pages
- [ ] `src/pages/Dashboard.tsx` — summary cards, FunnelChart, ReminderList with Mark done
- [ ] `src/pages/Jobs.tsx` — table/cards, add/edit modal, delete confirm, Analyse button
- [ ] `src/pages/Applications.tsx` — Board + Table view, status/date filters, optimistic status update, Track modal
- [ ] `src/pages/JdAnalyzer.tsx` — job picker, textarea, match-score SVG ring, roadmap, fallback notice, `aria-live`
- [ ] `src/pages/Resumes.tsx` — list, create, view, delete, tailor panel
- [ ] `src/pages/Settings.tsx` — account info, skills management

### Phase 5 Verification
```powershell
cd frontend
npm install
npx tsc -b   # zero errors
npm run build  # succeeds
```
Then manually walk: register → add skills → add job with JD → analyse → track application → change status → dashboard updates → mark reminder done → log out → confirm 401 redirects to login.

---

## Phase 6 — Hardening and Deploy

### 6.1 Test coverage
- [ ] Run `pytest --cov=app` and confirm ≥ 70% (aim 90%)
- [ ] Fix any failing tests

### 6.2 Code audit
- [ ] No `print(` calls in `backend/app`
- [ ] No secrets or API keys in any source file
- [ ] All public functions and classes have docstrings
- [ ] All functions have type hints

### 6.3 Documentation
- [ ] `README.md` — setup on Windows (venv on D:/E:, .env, alembic upgrade head, npm install, run scripts), deviations from original brief, known limits, interview talking points (all 6 from section 10 of prompt)
- [ ] `DEPLOYMENT.md` — Neon → Render → Vercel/Netlify step-by-step, setting CORS_ORIGINS, troubleshooting table
- [ ] `architecture.md` — updated diagram matching final implementation

### 6.4 Deployment config
- [ ] `render.yaml` — backend web service config
- [ ] `frontend/vercel.json` — SPA rewrite rule
- [ ] `frontend/public/_redirects` — Netlify fallback
- [ ] `.env.example` — complete with all keys

### Phase 6 Verification
```powershell
cd backend
pytest --cov=app --cov-report=term-missing
# Confirm coverage ≥ 70%
# Confirm no print( in app/ source
Select-String -Path app -Recurse -Pattern "print\(" -Include "*.py" | Where-Object { $_.Line -notmatch "#" }
```
