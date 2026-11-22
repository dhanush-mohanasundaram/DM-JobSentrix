"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.core.config import settings
from app.routers import (
    applications,
    auth,
    dashboard,
    jd_analyzer,
    jobs,
    reminders,
    resumes,
    skills,
)
from app.services.scheduler_service import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start the reminder scheduler on boot and stop it on shutdown."""
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status_code: int, message: str, details: object = None) -> JSONResponse:
    """Build the consistent error envelope used by every handler."""
    body: dict = {"error": {"status": status_code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Format 400/401/403/404/429 etc. consistently."""
    response = _error(exc.status_code, str(exc.detail))
    if exc.headers:
        response.headers.update(exc.headers)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Format 422 validation errors."""
    errors = [
        {"field": ".".join(str(p) for p in e["loc"]), "msg": e["msg"]}
        for e in exc.errors()
    ]
    return _error(422, "Validation failed", errors)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all 500 handler; logs the traceback, hides internals."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return _error(500, "Internal server error")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """Liveness probe for deployment platforms."""
    return {"status": "ok"}


for _router in (
    auth.router,
    skills.router,
    jobs.router,
    applications.router,
    resumes.router,
    jd_analyzer.router,
    reminders.router,
    dashboard.router,
):
    app.include_router(_router)

