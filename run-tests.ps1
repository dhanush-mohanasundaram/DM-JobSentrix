# Runs the backend test suite with coverage (uses in-memory SQLite, no DB needed)
Set-Location "$PSScriptRoot\backend"
& .\venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing
