"""Pydantic schemas for resumes."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResumeCreate(BaseModel):
    """Payload to create a resume version."""

    version_name: str = Field(min_length=1, max_length=100)
    content_md: str | None = None


class ResumeRead(BaseModel):
    """Resume as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version_name: str
    content_md: str | None
    created_at: datetime


class ResumeTailorRequest(BaseModel):
    """Input for the resume tailor: a stored resume (or raw markdown) and a JD."""

    resume_id: uuid.UUID | None = None
    resume_md: str | None = None
    jd_text: str | None = None
    job_id: uuid.UUID | None = None


class ResumeTailorResponse(BaseModel):
    """Suggestions returned by the resume tailor."""

    suggested_bullets: list[str]
    missing_keywords: list[str]
    summary: str
    used_fallback: bool
