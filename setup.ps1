# One-time setup. Run from the jobtrack-agent folder (must be on D: or E:, not C:).
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if ($root -like "C:*") { Write-Warning "This folder is on C:. Move it to D: or E: to save system-drive space." }

Write-Host "== Backend ==" -ForegroundColor Cyan
Set-Location "$root\backend"
if (-not (Test-Path venv)) { python -m venv venv }
& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  $key = & .\venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
  (Get-Content .env) -replace "SECRET_KEY=change-me", "SECRET_KEY=$key" | Set-Content .env
  Write-Host "Created backend\.env  ->  open it and set DATABASE_URL (and GROQ_API_KEY)." -ForegroundColor Yellow
}

Write-Host "== Frontend ==" -ForegroundColor Cyan
Set-Location "$root\frontend"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install

Write-Host "`nDone. Next: edit backend\.env, then run .\run-backend.ps1 and .\run-frontend.ps1" -ForegroundColor Green
