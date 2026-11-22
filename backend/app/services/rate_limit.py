"""Tiny in-memory sliding-window rate limiter for LLM-backed endpoints.

Good enough for a single-process free-tier deployment. For multiple workers
you would move this state to Redis.
"""
import time
import uuid
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, status

from app.core.config import settings

_WINDOW_SECONDS = 60.0
_hits: dict[uuid.UUID, deque[float]] = defaultdict(deque)
_lock = Lock()


def reset() -> None:
    """Clear all counters (used by tests)."""
    with _lock:
        _hits.clear()


def check(user_id: uuid.UUID) -> None:
    """Record a call for the user or raise 429 if they are over the limit."""
    now = time.monotonic()
    with _lock:
        q = _hits[user_id]
        while q and now - q[0] > _WINDOW_SECONDS:
            q.popleft()
        if len(q) >= settings.LLM_RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many AI requests. Wait a minute and try again.",
            )
        q.append(now)

