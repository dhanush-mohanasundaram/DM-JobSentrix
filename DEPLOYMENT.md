# Deployment (free tiers)

Order matters: database, then backend, then frontend, then tie CORS together.

## 1. Database: Neon

1. Create a project at https://neon.tech and copy the connection string.
2. Convert it to the SQLAlchemy form: change the start to `postgresql+psycopg2://` and keep `?sslmode=require`.

   ```
   postgresql+psycopg2://USER:PASS@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Backend: Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint**, pick the repo (it reads `render.yaml`). Or create a Web Service manually with root directory `backend`.
   - Build: `pip install -r requirements.txt`
   - Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon string from step 1 |
   | `SECRET_KEY` | long random string (`python -c "import secrets; print(secrets.token_hex(32))"`) |
   | `CORS_ORIGINS` | `["https://YOUR-APP.vercel.app"]` (JSON list; fill in after step 3) |
   | `GROQ_API_KEY` | from https://console.groq.com |
   | `LLM_PROVIDER` | `groq` (or `openrouter` plus `OPENROUTER_API_KEY`) |

4. Check `https://YOUR-API.onrender.com/health` returns `{"status":"ok"}`.

Railway works the same way: set the root directory to `backend`, reuse the same build and start commands and variables.

## 3. Frontend: Vercel

1. Vercel → **Add New Project**, import the repo, set **Root Directory** to `frontend`.
2. Framework preset: Vite. Build `npm run build`, output `dist`.
3. Environment variable: `VITE_API_URL` = `https://YOUR-API.onrender.com` (no trailing slash).
4. Deploy. `vercel.json` already rewrites all paths to `index.html` so refreshing `/jobs` works. For Netlify, `public/_redirects` does the same.

## 4. Finish

Go back to Render and set `CORS_ORIGINS` to your real Vercel URL, then redeploy the API. Register an account on the live site and run through: add skills, add a job with a JD, analyze, track an application.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Browser shows a CORS error | `CORS_ORIGINS` is missing the exact Vercel URL, is not a JSON list, or has a trailing slash |
| Login 401 right after register | Make sure the frontend sends form-encoded data (it does); check API logs |
| First request takes 30+ seconds | Free tier cold start; this is normal |
| Analyzer says "keyword matching" | No `GROQ_API_KEY`, or the provider returned 429/5xx; check logs for `LLM attempt` lines |
| `alembic upgrade` fails on SSL | Keep `?sslmode=require` on the Neon URL |
| Reminders don't fire for hours | The free instance was asleep; the job catches up when it wakes |
