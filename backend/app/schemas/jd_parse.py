"""Pydantic schemas for the JD analyzer."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JDAnalyzeRequest(BaseModel):
    """Analyze a JD for a job. If jd_text is omitted the stored job.jd_text is used."""

    job_id: uuid.UUID
    jd_text: str | None = Field(default=None, max_length=20000)


class RoadmapItem(BaseModel):
    """One week of the learning roadmap."""

    week: int
    skill: str
    focus: str


class JDParseRead(BaseModel):
    """Stored parse as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    job_id: uuid.UUID
    required_skills: list[str]
    seniority: str | None
    match_score: float
    skill_gaps: list[str]
    parsed_at: datetime


class JDAnalyzeResponse(JDParseRead):
    """Parse plus extras that are computed, not stored."""

    keywords: list[str] = []
    matched_skills: list[str] = []
    roadmap: list[RoadmapItem] = []
    used_fallback: bool = False
