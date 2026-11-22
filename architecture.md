# Architecture

```
┌────────────┐  HTTPS + JWT   ┌──────────────────────────────┐        ┌────────────┐
│ React SPA  │ ─────────────► │ FastAPI                      │ ─────► │ PostgreSQL │
│ (Vercel)   │ ◄───────────── │  routers → services → ORM    │ ◄───── │ (Neon)     │
└────────────┘   JSON         │                              │        └────────────┘
                              │  llm_service ──► Groq / OpenRouter (server-side key)
                              │  APScheduler (hourly) ──► notifications
                              └──────────────────────────────┘
```

## Request flow: analyze a job description

1. `POST /jd/analyze {job_id, jd_text?}` with `Authorization: Bearer <jwt>`.
2. `get_current_user` decodes the JWT and loads the user. `get_owned` returns 404 if the job isn't theirs.
3. `rate_limit.check(user)` allows 5 AI calls per minute per user (429 beyond that).
4. `llm_service.extract_jd` sends a JSON-mode chat completion, retries once on 429/5xx/timeout, and validates the result. Any failure raises `LLMError`.
5. On `LLMError` the router uses `fallback_extract`, a vocabulary scan with word-boundary regexes (so `java` doesn't match inside `javascript`). The response sets `used_fallback: true`.
6. `matcher_service.compute_match` normalizes both skill lists and returns `|required ∩ user| / |required|`, the matched list and the gaps.
7. The result is upserted into `jd_parses` (one row per job) and returned with a computed weekly roadmap.

## Data model

```
users 1─* user_skills
users 1─* jobs 1─* applications 1─* reminders 1─* notifications(by reminder)
users 1─* resumes ──< applications.resume_version_id (nullable, SET NULL)
jobs  1─1 jd_parses
users 1─* notifications
```

- UUID primary keys (`sa.Uuid`, native `UUID` on Postgres).
- `jd_parses.required_skills` / `skill_gaps` are JSONB on Postgres and plain JSON on SQLite (tests).
- Deleting a user, job or application cascades down; deleting a resume only clears the link.

## Reminder engine

`start_scheduler()` runs in the FastAPI lifespan. One interval job (`reminder_check`, default every 60 minutes) calls `process_due_reminders`, which:

1. selects reminders with `due_date <= today` and `is_sent = false`,
2. skips any that already have a notification,
3. inserts one `Notification` per remaining reminder.

The job store is `SQLAlchemyJobStore` on the main database, so the schedule survives restarts. The job function is referenced by import path (`module:function`), which is what lets APScheduler persist it.

## Security notes

- Passwords: bcrypt via passlib (max 72 bytes, enforced in the schema).
- JWT: HS256, 24h expiry, `sub` = user id. The frontend keeps it in `localStorage`; the trade-off is XSS exposure. A production hardening step would be an httpOnly cookie plus CSRF protection.
- Ownership: every query filters by the authenticated user; cross-user access returns 404.
- The 500 handler logs the traceback and returns a generic message.
- LLM keys exist only in server environment variables.

## Frontend

- `services/api.ts`: axios instance, attaches the JWT, clears it and emits `auth:expired` on any 401 (except login).
- `context/AuthContext.tsx`: login (form-encoded, as FastAPI's OAuth2 form requires), register, logout, session restore via `/auth/me`.
- `components/Layout.tsx`: protected shell; unauthenticated users are redirected to `/login`.
- Pages fetch with a small `useApi` hook and always render loading, error and empty states.
