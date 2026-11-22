# Applies migrations, then starts the API on http://127.0.0.1:8000  (docs at /docs)
Set-Location "$PSScriptRoot\backend"
& .\venv\Scripts\alembic.exe upgrade head
& .\venv\Scripts\uvicorn.exe app.main:app --reload
