"""Pydantic schemas for user skills."""
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Proficiency = Literal["Beginner", "Intermediate", "Advanced"]


class SkillCreate(BaseModel):
    """Payload to add a skill."""

    skill_name: str = Field(min_length=1, max_length=100)
    proficiency: Proficiency = "Beginner"
    years_experience: float = Field(default=0.0, ge=0, le=60)


class SkillUpdate(BaseModel):
    """Payload to update a skill; all fields optional."""

    skill_name: str | None = Field(default=None, min_length=1, max_length=100)
    proficiency: Proficiency | None = None
    years_experience: float | None = Field(default=None, ge=0, le=60)


class SkillRead(BaseModel):
    """Skill as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skill_name: str
    proficiency: str
    years_experience: float
