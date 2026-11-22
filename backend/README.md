# JobTrack backend

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # set DATABASE_URL, SECRET_KEY, GROQ_API_KEY
alembic upgrade head
uvicorn app.main:app --reload # http://127.0.0.1:8000/docs
pytest --cov=app
```

## Migrations

```powershell
alembic revision --autogenerate -m "describe change"   # after editing models
alembic upgrade head
alembic check                                          # fails if models and migrations drift
```

`Base.metadata.create_all()` is never used; the schema comes only from Alembic.

## Endpoints

| Group | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` (form: `username`=email, `password`), `GET /auth/me` |
| Skills | `GET/POST /skills`, `PUT/DELETE /skills/{id}` |
| Jobs | `GET/POST /jobs`, `GET/PUT/DELETE /jobs/{id}` |
| Applications | `GET /applications?status=&date_from=&date_to=`, `POST`, `GET/PATCH/DELETE /applications/{id}` |
| Resumes | `GET/POST /resumes`, `GET/DELETE /resumes/{id}`, `POST /resumes/tailor` |
| JD analyzer | `POST /jd/analyze`, `GET /jd/parse/{job_id}` |
| Reminders | `GET /reminders`, `PATCH /reminders/{id}/sent` |
| Notifications | `GET /notifications`, `POST /notifications/read-all` |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/funnel` |
| Meta | `GET /health` |

Errors always look like `{"error": {"status": 422, "message": "...", "details": [...]}}`.
