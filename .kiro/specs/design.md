# Design: JobTrack Agent

## 1. Architecture Overview

```
Browser (React 18 + Vite + TS)
    │  axios + JWT Bearer
    ▼
FastAPI (Uvicorn, sync handlers, threadpool)
    ├── Routers (/auth /skills /jobs /applications /resumes /jd /reminders /notifications /dashboard)
    ├── Services (llm_service, matcher_service, rate_limit, scheduler_service)
    └── SQLAlchemy 2.0 (sync engine)
         ├── PostgreSQL (Neon, production)
         └── SQLite (tests, local dev option)
```

APScheduler runs inside the same Uvicorn process, backed by the same SQLAlchemy connection.

---

## 2. Data Model

All tables use UUID primary keys (`sqlalchemy.Uuid`). Timestamps are timezone-aware (`server_default=func.now()`). JSON columns use `JSON().with_variant(JSONB(), "postgresql")`.

### users
| Column        | Type            | Constraints                     |
|---------------|-----------------|----------------------------------|
| id            | UUID            | PK                               |
| email         | VARCHAR(255)    | UNIQUE, NOT NULL, indexed        |
| password_hash | VARCHAR(255)    | NOT NULL                         |
| full_name     | VARCHAR(100)    | NULL                             |
| created_at    | TIMESTAMPTZ     | server_default=now()             |

### user_skills
| Column           | Type         | Constraints                              |
|------------------|--------------|------------------------------------------|
| id               | UUID         | PK                                       |
| user_id          | UUID FK      | → users (CASCADE), indexed               |
| skill_name       | VARCHAR(100) | NOT NULL                                 |
| proficiency      | VARCHAR(20)  | default "Beginner"                       |
| years_experience | FLOAT        | default 0                                |

### jobs
| Column           | Type         | Constraints                              |
|------------------|--------------|------------------------------------------|
| id               | UUID         | PK                                       |
| user_id          | UUID FK      | → users (CASCADE), indexed               |
| company          | VARCHAR(150) | NOT NULL                                 |
| role_title       | VARCHAR(150) | NOT NULL                                 |
| jd_text          | TEXT         | NOT NULL                                 |
| application_link | VARCHAR(500) | NULL                                     |
| location         | VARCHAR(100) | NULL                                     |
| salary_offered   | VARCHAR(50)  | NULL                                     |
| created_at       | TIMESTAMPTZ  | server_default=now()                     |

### resumes
| Column       | Type         | Constraints                              |
|--------------|--------------|------------------------------------------|
| id           | UUID         | PK                                       |
| user_id      | UUID FK      | → users (CASCADE), indexed               |
| version_name | VARCHAR(100) | NOT NULL (e.g. "SDE-Backend-v1")         |
| content_md   | TEXT         | NULL                                     |
| created_at   | TIMESTAMPTZ  | server_default=now()                     |

### applications
| Column            | Type        | Constraints                                              |
|-------------------|-------------|----------------------------------------------------------|
| id                | UUID        | PK                                                       |
| job_id            | UUID FK     | → jobs (CASCADE), indexed                               |
| resume_version_id | UUID FK     | → resumes (SET NULL), nullable, indexed                 |
| status            | VARCHAR(30) | default "Applied", indexed (Applied/Screening/Interview/Offer/Reject) |
| applied_date      | DATE        | NOT NULL                                                 |
| notes             | TEXT        | NULL                                                     |

### jd_parses
| Column          | Type        | Constraints                                     |
|-----------------|-------------|--------------------------------------------------|
| id              | UUID        | PK                                               |
| job_id          | UUID FK     | → jobs (CASCADE), **UNIQUE** (one parse/job), indexed |
| required_skills | JSON(B)     | list of strings                                  |
| seniority       | VARCHAR(30) | NULL                                             |
| match_score     | FLOAT       | 0.0–1.0                                          |
| skill_gaps      | JSON(B)     | list of strings                                  |
| parsed_at       | TIMESTAMPTZ | server_default=now()                             |

### reminders
| Column         | Type        | Constraints                                     |
|----------------|-------------|--------------------------------------------------|
| id             | UUID        | PK                                               |
| application_id | UUID FK     | → applications (CASCADE), indexed               |
| reminder_type  | VARCHAR(20) | "follow_up_7d" or "follow_up_14d"               |
| due_date       | DATE        | NOT NULL                                         |
| is_sent        | BOOLEAN     | default false                                    |
| created_at     | TIMESTAMPTZ | server_default=now()                             |

### notifications
| Column      | Type        | Constraints                                        |
|-------------|-------------|-----------------------------------------------------|
| id          | UUID        | PK                                                  |
| user_id     | UUID FK     | → users (CASCADE), indexed                         |
| reminder_id | UUID FK     | → reminders (SET NULL), nullable, indexed          |
| message     | TEXT        | NOT NULL                                            |
| is_read     | BOOLEAN     | default false                                       |
| created_at  | TIMESTAMPTZ | server_default=now()                                |

---

## 3. API Contract

Base path: `/api/v1` is **not** used — routers are mounted directly.

### Auth
| Method | Path              | Auth? | Body / Params                        | Response           |
|--------|-------------------|-------|--------------------------------------|--------------------|
| POST   | /auth/register    | No    | `{email, password, full_name?}`      | UserOut            |
| POST   | /auth/login       | No    | form: `username=email&password=...`  | `{access_token, token_type}` |
| GET    | /auth/me          | Yes   | —                                    | UserOut            |

### Skills
| Method | Path             | Response     |
|--------|------------------|--------------|
| GET    | /skills          | SkillOut[]   |
| POST   | /skills          | SkillOut     |
| PUT    | /skills/{id}     | SkillOut     |
| DELETE | /skills/{id}     | 204          |

### Jobs
| Method | Path        | Response  |
|--------|-------------|-----------|
| GET    | /jobs       | JobOut[]  |
| POST   | /jobs       | JobOut    |
| GET    | /jobs/{id}  | JobOut    |
| PUT    | /jobs/{id}  | JobOut    |
| DELETE | /jobs/{id}  | 204       |

### Resumes
| Method | Path                 | Response      |
|--------|----------------------|---------------|
| GET    | /resumes             | ResumeOut[]   |
| POST   | /resumes             | ResumeOut     |
| GET    | /resumes/{id}        | ResumeOut     |
| DELETE | /resumes/{id}        | 204           |
| POST   | /resumes/tailor      | TailorOut     |

### Applications
| Method | Path                   | Response          |
|--------|------------------------|-------------------|
| GET    | /applications          | ApplicationOut[]  |
| POST   | /applications          | ApplicationOut    |
| GET    | /applications/{id}     | ApplicationOut    |
| PATCH  | /applications/{id}     | ApplicationOut    |
| DELETE | /applications/{id}     | 204               |

### JD Analyzer
| Method | Path                   | Response    |
|--------|------------------------|-------------|
| POST   | /jd/analyze            | JdParseOut  |
| GET    | /jd/parse/{job_id}     | JdParseOut  |

### Reminders / Notifications
| Method | Path                        | Response           |
|--------|-----------------------------|--------------------|
| GET    | /reminders                  | ReminderOut[]      |
| PATCH  | /reminders/{id}/sent        | ReminderOut        |
| GET    | /notifications              | NotificationOut[]  |
| POST   | /notifications/read-all     | 204                |

### Dashboard
| Method | Path                   | Response          |
|--------|------------------------|-------------------|
| GET    | /dashboard/summary     | DashboardSummary  |
| GET    | /dashboard/funnel      | FunnelItem[]      |

### Health
| Method | Path     | Response             |
|--------|----------|----------------------|
| GET    | /health  | `{"status":"ok"}`    |

---

## 4. AI Flow (JD Analyze)

```
POST /jd/analyze
  │
  ├─ 1. Rate limit check (sliding window, 5/min per user) → 429 if exceeded
  ├─ 2. Load job; use jd_text if supplied (and save to job), else job.jd_text; 400 if empty
  ├─ 3. Truncate JD to 12,000 chars
  ├─ 4. Call LLM (httpx.Client, sync)
  │      system: "return valid JSON only with exactly {required_skills: string[], seniority: string, keywords: string[]};
  │               skills are concrete technologies; seniority is one of Intern, Junior, Mid, Senior, Lead."
  │      response_format: {"type":"json_object"}, temperature 0.1
  │      Retry once on 429/500/502/503/504/timeout with short backoff → raise LLMError
  │      Parse: strip ``` fences, first { to last }, json.loads, clean lists
  │
  ├─ 5. On ANY failure → fallback extractor (regex vocab ~90 skills, boundary lookarounds)
  │      used_fallback = true
  │
  ├─ 6. match_score = |normalize(required) ∩ normalize(user_skills)| / |normalize(required)|
  │      normalize = lower-case, trim, collapse whitespace, map aliases
  │      round to 4 decimals; empty required → 0.0
  │
  ├─ 7. skill_gaps = required skills not in user_skills (original spelling)
  │      roadmap: one gap per week, max 8 weeks, {week, skill, focus}
  │
  └─ 8. Upsert jd_parses (INSERT … ON CONFLICT job_id DO UPDATE)
         Return full JdParseOut
```

### Alias Map (normalize)
`js→javascript`, `ts→typescript`, `py→python`, `postgres→postgresql`, `node/nodejs→node.js`, `reactjs→react`, `golang→go`, `k8s→kubernetes`, `rest→rest api`, `ml→machine learning`, `dsa→data structures`

### Fallback Extractor
- Vocabulary of ~90 skills matched with regex boundary lookarounds `(?<![A-Za-z0-9+#.])term(?![A-Za-z0-9+#.])`
- Special patterns: `c\+\+`, `c#`, `node\.js`, `ci/cd`
- `java` does NOT match inside `javascript`
- Seniority from words: principal/staff/lead→Lead; senior/sr→Senior; intern→Intern; junior/entry-level/fresher/new grad→Junior; else Mid

---

## 5. Match Score Algorithm

```python
score = len(normalize(required) ∩ normalize(user_skills)) / len(normalize(required))
```
- `normalize(skill)`: lower-case → strip → collapse whitespace → apply alias map
- De-duplicate required skills after normalizing
- matched_skills and skill_gaps use the **original spelling** of the required skill
- Empty required list → score = 0.0
- Round to 4 decimal places

---

## 6. Error Handling

### Error Envelope
```json
{"error": {"status": 422, "message": "Validation failed", "details": [{"field": "body.email", "msg": "..."}]}}
```

### Registered Handlers (in main.py)
1. `RequestValidationError` → 422, flatten Pydantic errors into details list
2. `HTTPException` → pass through status/detail, preserve headers (WWW-Authenticate etc.)
3. `Exception` (catch-all) → log full traceback, return 500 with generic message

---

## 7. Testing Strategy

### Test Database
- SQLite in-memory via `sqlite+pysqlite:///:memory:`
- `create_all` / `drop_all` per test session in `conftest.py`
- `render_as_batch=True` in alembic env for SQLite ALTER support

### Test Structure
| File                      | Coverage target                                       |
|---------------------------|-------------------------------------------------------|
| test_auth.py              | register, duplicate, wrong password, 401 flows, /me  |
| test_crud.py              | all CRUD endpoints, ownership isolation, filters, cascade deletes, proficiency/status validation |
| test_ai_and_scheduler.py  | match score math, alias handling, fallback, rate limit, scheduler idempotency |

### Key Test Cases (Phase 3)
- match score 0.5 for `[Python, PostgreSQL, Docker, AWS]` vs user `[python, Postgres]`
- empty required list → 0.0
- JSON parser accepts fenced/chatty output; rejects `""`, `"no json"`, `"{broken"`, `"[1,2]"`
- fallback: `java` not found inside `javascript`; `c++`, `node.js`, `ci/cd` found
- LLM failure → 200 with `used_fallback: true`
- re-analysis updates same jd_parses row
- 6th call in a minute → 429
- scheduler: 10-day-old application gets one notification; second run creates none

---

## 8. Frontend Architecture

### Auth Flow
```
AuthContext (login, register, logout, restoreSession)
  └── api.ts axios instance
        ├── request interceptor: inject JWT from localStorage
        └── response interceptor: on 401 (not login) → dispatch "auth:expired" → AuthContext clears token → redirect /login
```

### Component Hierarchy (abbreviated)
```
App (MotionConfig reducedMotion="user", BrowserRouter)
  ├── /login → AuthPage
  └── Layout (protected, redirects to /login if no token)
        ├── Navbar (alerts bell, mobile menu)
        └── Outlet
              ├── /dashboard → Dashboard
              ├── /jobs → Jobs
              ├── /applications → Applications
              ├── /jd-analyzer → JdAnalyzer
              ├── /resumes → Resumes
              └── /settings → Settings
```

### useApi Hook
```typescript
function useApi<T>(url: string, initial: T): {data: T, setData: Dispatch, loading: boolean, error: string|null, reload: () => void}
```

### Visual System
- Page bg: `bg-slate-950`
- Card bg: `bg-slate-800`
- Primary action: `bg-indigo-600 hover:bg-indigo-500`
- Status badge colours: Applied=blue, Screening=yellow, Interview=purple, Offer=green, Reject=red
- Font: Manrope (Google Fonts), fallback system-sans
- Animations: match-score ring draw-in (SVG strokeDashoffset), funnel bars fill-in (height/scaleY), modal fade+scale, route fade (AnimatePresence)

---

## 9. Deployment

| Layer    | Service              | Notes                              |
|----------|----------------------|------------------------------------|
| Database | Neon (PostgreSQL)    | Free tier, `DATABASE_URL` from env |
| Backend  | Render               | Free tier web service, `render.yaml` |
| Frontend | Vercel or Netlify    | `vercel.json` / `public/_redirects` for SPA routing |

`CORS_ORIGINS` on the backend must include the frontend URL.
