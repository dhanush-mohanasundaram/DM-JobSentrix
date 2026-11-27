# Tech Stack and Hard Constraints

## Hardware / Environment
- HP laptop, Intel Core i5-1235U, 8 GB RAM, Windows 11 Home, 512 GB NVMe
- C: has little free space — all project files, venvs, node_modules, and databases live on **D: or E:**
- Default location: `D:\hermes\cache\scratch\jobtrack-agent\`
- Run all commands in PowerShell from the project folder on D: or E:

## Constraints (mandatory — never change without asking)
- No containers, no orchestration, no local LLMs, no vector databases, no heavy infrastructure
- All AI calls go to a **cloud LLM API (Groq or OpenRouter free tier), server-side only** — API keys never reach the browser
- Never silently change the stack, schema, or API contract

## Backend
- **Python 3.11+ only**
- FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic
- Sync route handlers (`def`, not `async def`) with a sync `httpx.Client` — FastAPI runs them in a threadpool; never mix `async def` routes with blocking SQLAlchemy calls
- Settings via `pydantic-settings` (`.env`); no secrets in code

### Pinned backend versions (do not upgrade without asking)
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
SQLAlchemy==2.0.36
psycopg2-binary==2.9.10
alembic==1.14.0
pydantic[email]==2.10.4
pydantic-settings==2.7.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1          # newer bcrypt breaks passlib 1.7.4
python-multipart==0.0.20
httpx==0.28.1
apscheduler==3.11.0
pytest==8.3.4
pytest-cov==6.0.0
```

## Frontend
- **React 18 + Vite + TypeScript (strict) + Tailwind CSS 3 + Framer Motion**

### Pinned frontend versions
```
react 18.3.1
react-dom 18.3.1
react-router-dom 6.28.0
axios 1.7.9
framer-motion 11.15.0
vite 5.4.11
@vitejs/plugin-react 4.3.4
typescript 5.6.3
tailwindcss 3.4.17
postcss 8.4.49
autoprefixer 10.4.20
```

## Database
- **PostgreSQL** (Neon free tier in production; local Postgres on D:/E: or SQLite for quick dev)
- Code must run on **both PostgreSQL and SQLite** so tests need no database server
- Use `sqlalchemy.Uuid` for ids and `JSON().with_variant(JSONB(), "postgresql")` for JSON columns
- **Alembic only** for migrations — never call `Base.metadata.create_all()` outside tests
- `alembic check` must report "No new upgrade operations detected"

## Required `.env` Keys
```
DATABASE_URL
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS          # JSON list
LLM_PROVIDER          # groq or openrouter
GROQ_API_KEY
GROQ_MODEL
OPENROUTER_API_KEY
OPENROUTER_MODEL
LLM_TIMEOUT_SECONDS
LLM_RATE_LIMIT_PER_MINUTE=5
ENABLE_SCHEDULER
REMINDER_CHECK_INTERVAL_MINUTES=60
```

## Security Rules
- Ownership: every query filters by authenticated user; accessing another user's row returns **404, not 403**
- Never log API keys or full prompts
- Never store LLM API keys in localStorage or expose them to the client
- JWT HS256, 24-hour expiry, `sub` = user id

## Code Quality
- Type hints on all functions
- Docstrings on all public classes and functions
- Standard `logging` module only — no `print()`
- DB writes: wrap commits so a `SQLAlchemyError` triggers `rollback()`, is logged, and returns a 500 with a safe message

## Error Envelope (every error, including 404s and 422s)
```json
{"error": {"status": 422, "message": "Validation failed", "details": [{"field": "body.email", "msg": "..."}]}}
```
- Register handlers for Starlette's `HTTPException`, `RequestValidationError`, and a catch-all `Exception`
- Preserve exception headers such as `WWW-Authenticate`

## CORS
- From `CORS_ORIGINS` env var (JSON list)
- `GET /health` returns `{"status": "ok"}`

## Things to Avoid
- Containers, queues, caches, vector stores, or any service that needs its own process
- Changing pinned versions, schema, or route paths without asking
- Returning 403 for another user's resource (use 404)
- `async def` routes that call blocking DB code
- Storing secrets in localStorage other than the JWT
- `Base.metadata.create_all()` outside tests
