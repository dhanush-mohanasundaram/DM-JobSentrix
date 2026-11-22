# JobTrack Agent

An AI-assisted job application tracker. Paste a job description and it extracts the required skills, scores how well you match, lists your skill gaps, builds a weekly learning roadmap, and schedules follow-up reminders.

**Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PostgreSQL, APScheduler, Groq/OpenRouter (server-side), React + Vite + TypeScript + Tailwind + Framer Motion.

No Docker, no local LLMs, no vector DB. It runs comfortably on an 8 GB laptop.

## Features

| Area | What it does |
|---|---|
| Auth | Register/login, bcrypt hashes, 24h JWT, protected routes |
| Jobs & skills | CRUD, every row scoped to the signed-in user |
| Applications | Status pipeline (Applied, Screening, Interview, Offer, Reject), filters by status and date, board and table views |
| Reminders | Creating an application auto-creates day-7 and day-14 follow-ups; an hourly background job turns due ones into in-app alerts |
| JD Analyzer | LLM extracts skills and seniority, set-intersection match score, gaps, roadmap, saved to `jd_parses` |
| Resume tailor | Suggests truthful bullet rewrites and missing ATS keywords |
| Dashboard | Totals, response rate, pipeline funnel, follow-up list |

## Quick start (Windows, D: or E: drive)

Prerequisites: Python 3.11+, Node 18+, and a PostgreSQL database. The easiest is a free [Neon](https://neon.tech) project (nothing to install locally).

```powershell
cd D:\hermes\cache\scratch\jobtrack-agent
powershell -ExecutionPolicy Bypass -File .\setup.ps1     # venv + deps + .env files
notepad backend\.env                                     # set DATABASE_URL and GROQ_API_KEY
.\run-backend.ps1                                        # migrations + API on :8000
.\run-frontend.ps1                                       # UI on :5173 (second terminal)
```

Open http://localhost:5173, create an account, then add your skills in **Settings**.

API docs: http://127.0.0.1:8000/docs. Use **Authorize** with your email and password.

**Trying it without Postgres:** set `DATABASE_URL=sqlite:///./jobtrack.db` in `backend\.env`. Everything works, including migrations. Use Postgres for deployment.

**Without an LLM key:** the analyzer and tailor fall back to keyword matching and say so in the UI. Get a free Groq key at https://console.groq.com.

### Tests

```powershell
.\run-tests.ps1
```

37 tests, over 90% coverage. They use in-memory SQLite and mock every LLM call, so they need no database and no network.

## Project layout

```
backend/app/
  main.py            app, CORS, error envelope, scheduler lifespan
  core/              config (pydantic-settings), security (JWT, bcrypt)
  models/            SQLAlchemy 2.0 declarative models
  schemas/           Pydantic v2 request/response models
  routers/           auth, skills, jobs, applications, resumes, jd_analyzer, reminders, dashboard
  services/          llm_service, matcher_service, scheduler_service, rate_limit
  tests/
backend/alembic/     migrations (0001 creates the whole schema)
frontend/src/        components, pages, services (api.ts), context (AuthContext.tsx), utils, types
```

Design notes are in [architecture.md](architecture.md), deployment steps in [DEPLOYMENT.md](DEPLOYMENT.md).

## Deviations from the original spec (deliberate)

- **`notifications` table** added. The spec says the scheduler creates "in-app notification records" but had no table for them.
- **`resume_version_id` is nullable** so an application can exist without a linked resume, and deleting a resume doesn't delete applications.
- **`jd_parses.job_id` is unique**: re-analyzing a job updates its row instead of piling up duplicates.
- **Sync routes with a sync `httpx` client.** FastAPI runs sync routes in a threadpool, which is correct when the DB driver is synchronous. Mixing `async def` routes with blocking SQLAlchemy calls would stall the event loop.
- **Reminders stay visible until you mark them done.** The scheduler creates a notification but does not flip `is_sent`, so the dashboard still shows them. Notifications are deduplicated per reminder.

## Interview talking points

1. *"I used PostgreSQL with SQLAlchemy 2.0 and Alembic so schema changes are version-controlled, not manual. I added a drift check (`alembic check`) to make sure the models and migration agree."*
2. *"The LLM layer runs server-side so API keys never reach the browser, with retry on 429/5xx, strict JSON validation, a per-user rate limit, and a deterministic keyword fallback so the feature degrades instead of failing."*
3. *"Match score is a transparent set intersection over normalized skill strings (aliases like JS→JavaScript, postgres→PostgreSQL). It's explainable in an interview, not a black-box model."*
4. *"APScheduler uses a SQLAlchemy job store in the same Postgres database, so schedules survive restarts without Redis or Celery. The job is idempotent: running it twice never creates duplicate notifications."*
5. *"Every query is scoped by the authenticated user, and there are tests proving one user can't read another's jobs or applications (404, not 403, to avoid leaking existence)."*
6. *"All errors, including framework 404s and validation failures, use one JSON envelope: `{error: {status, message, details?}}`."*

## Known limits

- The rate limiter is in-memory, which is fine for one process. With several workers, move it to Redis.
- Free-tier hosts sleep when idle, so the hourly job only runs while the service is awake. Because of the persistent job store and `coalesce=True`, it catches up on wake.
- There is no email sending in the MVP. Reminders appear in the app.
- `apscheduler_jobs` is created by APScheduler itself, not by Alembic.
