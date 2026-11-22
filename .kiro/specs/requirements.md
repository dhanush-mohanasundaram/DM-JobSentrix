# Requirements: JobTrack Agent

## US-01 Authentication

**US-01-A Register**
When a new visitor submits a valid email and password (8–72 chars), the system SHALL create an account, lower-case the email, bcrypt-hash the password, and return the user object without the hash.
- AC: duplicate email → 400 with error envelope
- AC: password < 8 chars → 422 with error envelope
- AC: response body contains no `password_hash` field

**US-01-B Login**
When a registered user submits correct credentials via `POST /auth/login` (form-encoded, email in `username` field), the system SHALL return `{access_token, token_type:"bearer"}` with a 24-hour JWT (sub = user id).
- AC: wrong password → 401 with `WWW-Authenticate: Bearer`
- AC: unknown email → 401 with `WWW-Authenticate: Bearer`

**US-01-C Session restore**
When a client calls `GET /auth/me` with a valid Bearer token, the system SHALL return the current user.
- AC: missing/malformed/expired token → 401 with `WWW-Authenticate: Bearer`

---

## US-02 Skills Management

When an authenticated user manages their skills via `/skills`, the system SHALL:
- **US-02-A** Return all skills for that user (`GET /skills`)
- **US-02-B** Create a skill with name and proficiency (Beginner / Intermediate / Advanced) (`POST /skills`)
- **US-02-C** Update a skill's name, proficiency, or years_experience (`PUT /skills/{id}`)
- **US-02-D** Delete a skill (`DELETE /skills/{id}` → 204)
- AC: invalid proficiency value → 422
- AC: another user's skill → 404

---

## US-03 Jobs

When an authenticated user manages jobs via `/jobs`, the system SHALL:
- **US-03-A** Return all jobs newest-first (`GET /jobs`)
- **US-03-B** Create a job with company, role_title, jd_text (`POST /jobs`)
- **US-03-C** Return a single job (`GET /jobs/{id}`)
- **US-03-D** Partially update a job (`PUT /jobs/{id}`, exclude_unset)
- **US-03-E** Delete a job, cascading to its applications and jd_parse (`DELETE /jobs/{id}`)
- AC: another user's job → 404

---

## US-04 Resumes

When an authenticated user manages resumes via `/resumes`, the system SHALL:
- **US-04-A** List all resume versions (`GET /resumes`)
- **US-04-B** Create a resume version with version_name and content_md (`POST /resumes`)
- **US-04-C** Return a single resume (`GET /resumes/{id}`)
- **US-04-D** Delete a resume (`DELETE /resumes/{id}`)
- AC: another user's resume → 404

---

## US-05 Applications

When an authenticated user tracks applications via `/applications`, the system SHALL:
- **US-05-A** List applications filtered by optional status and date range, newest-applied first; each record embeds `job: {id, company, role_title}` (`GET /applications?status=&date_from=&date_to=`)
- **US-05-B** Create an application; default applied_date to today; verify job and resume belong to the user; auto-create two reminders at applied_date+7 and applied_date+14 in the same transaction (`POST /applications`)
- **US-05-C** Return a single application (`GET /applications/{id}`)
- **US-05-D** Update status, notes, or resume link (`PATCH /applications/{id}`)
- **US-05-E** Delete an application, cascading reminders (`DELETE /applications/{id}`)
- AC: invalid status value → 422
- AC: job or resume belongs to another user → 404

---

## US-06 JD Analyzer

When an authenticated user calls `POST /jd/analyze` with `{job_id, jd_text?}`, the system SHALL:
- **US-06-A** Use `job.jd_text` when `jd_text` is omitted; return 400 if both are empty
- **US-06-B** Enforce a per-user rate limit of 5 requests/minute; return 429 when exceeded
- **US-06-C** Call the LLM to extract `{required_skills, seniority, keywords}`
- **US-06-D** On any LLM failure (no key, timeout, 429/5xx from provider, malformed JSON, empty skill list), use the Python fallback extractor and set `used_fallback: true`
- **US-06-E** Compute the match score against the user's `user_skills`
- **US-06-F** Upsert the `jd_parses` row (one per job); return job_id, required_skills, seniority, match_score, skill_gaps, parsed_at, keywords, matched_skills, roadmap, used_fallback
- **US-06-G** `GET /jd/parse/{job_id}` returns the stored parse or 404

---

## US-07 Resume Tailor

When an authenticated user calls `POST /resumes/tailor` with `{resume_id or resume_md, jd_text or job_id}`, the system SHALL:
- **US-07-A** Call the LLM to suggest up to 6 rewritten bullets, missing keywords, and a summary — instructing the model never to invent facts
- **US-07-B** On LLM failure, fall back to listing JD keywords absent from the resume text; return `used_fallback: true`
- **US-07-C** Return 400 if resume or JD content is empty
- AC: shares the same 5/min rate limit as JD analyzer

---

## US-08 Reminders and Notifications

When the authenticated user manages reminders:
- **US-08-A** `GET /reminders` returns unsent reminders soonest-first, each with company, role_title, and is_due (due_date ≤ today)
- **US-08-B** `PATCH /reminders/{id}/sent` marks a reminder done
- **US-08-C** `GET /notifications` returns the latest 50 notifications
- **US-08-D** `POST /notifications/read-all` marks all notifications read (→ 204)

**US-08-E Scheduler**
The APScheduler BackgroundScheduler SHALL:
- Start/stop in the FastAPI lifespan; skip when `ENABLE_SCHEDULER=false`
- Use SQLAlchemyJobStore on the main database
- Register the job by import path string `"app.services.scheduler_service:run_reminder_job"` with `replace_existing=True`, `coalesce=True`, `max_instances=1`
- Run every `REMINDER_CHECK_INTERVAL_MINUTES` (default 60)
- Create one Notification per due, unfinished reminder — idempotent (second run creates none)
- Never set `is_sent` on reminders (the user does that)
- Log failures; must not stop the scheduler

---

## US-09 Dashboard

When the authenticated user calls dashboard endpoints:
- **US-09-A** `GET /dashboard/summary` returns: total_applied, response_rate (% of apps whose status ≠ Applied, one decimal, 0 when none), status_counts (all five statuses, zeros included), jobs_tracked, pending_reminders
- **US-09-B** `GET /dashboard/funnel` returns `[{status, count}]` in pipeline order (Applied → Screening → Interview → Offer → Reject)

---

## US-10 Frontend — All Pages

Every page SHALL have loading, error, and empty states.

**US-10-A Login / Register** — tab-based auth page
**US-10-B Dashboard** — four summary cards, funnel chart (Framer Motion bars), reminder list with "Mark done"
**US-10-C Jobs** — table on desktop / cards on mobile; add/edit modal; delete with confirmation; "Analyse" button jumps to JD Analyzer with the job preselected
**US-10-D Applications** — Board view (column per status) and Table view; status filter and date-range filter; status changed optimistically (revert on failure); "Track application" modal
**US-10-E JD Analyzer** — job picker, large textarea (prefilled from job), match-score ring animation, seniority, skills you have, skill gaps, weekly roadmap, visible fallback notice
**US-10-F Resumes** — list versions, create, view, delete, "tailor for job" panel showing missing keywords and suggested bullets
**US-10-G Settings** — account info display; skills management (add, change level, remove)

---

## US-11 Cross-Cutting

- **US-11-A** Every error (including 404, 422, 500) returns `{"error": {"status": N, "message": "...", "details": [...]}}` — details optional
- **US-11-B** `GET /health` returns `{"status": "ok"}` without authentication
- **US-11-C** CORS from `CORS_ORIGINS` env var
- **US-11-D** No secrets (API keys, SECRET_KEY) appear in code, logs, or the frontend bundle
- **US-11-E** Test coverage ≥ 70% (aim 90%); all tests run offline against SQLite in-memory
