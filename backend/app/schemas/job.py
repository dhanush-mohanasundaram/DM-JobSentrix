"""Pydantic schemas for jobs."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    """Payload to create a job."""

    company: str = Field(min_length=1, max_length=150)
    role_title: str = Field(min_length=1, max_length=150)
    jd_text: str | None = None
    application_link: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=100)
    salary_offered: str | None = Field(default=None, max_length=50)


class JobUpdate(BaseModel):
    """Payload to update a job; all fields optional."""

    company: str | None = Field(default=None, min_length=1, max_length=150)
    role_title: str | None = Field(default=None, min_length=1, max_length=150)
    jd_text: str | None = None
    application_link: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=100)
    salary_offered: str | None = Field(default=None, max_length=50)


class JobRead(BaseModel):
    """Job as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company: str
    role_title: str
    jd_text: str | None
    application_link: str | None
    location: str | None
    salary_offered: str | None
    created_at: datetime


class JobBrief(BaseModel):
    """Small job summary embedded in other responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company: str
    role_title: str
