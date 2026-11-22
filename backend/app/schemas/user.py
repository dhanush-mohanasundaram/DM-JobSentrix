"""Pydantic schemas for users."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Payload for registration."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt limit
    full_name: str | None = Field(default=None, max_length=100)


class UserRead(BaseModel):
    """Public user representation (never includes the password hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    created_at: datetime
