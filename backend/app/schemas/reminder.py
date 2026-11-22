"""Pydantic schemas for reminders and notifications."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ReminderRead(BaseModel):
    """Reminder with enough context to render in the UI."""

    id: uuid.UUID
    application_id: uuid.UUID
    reminder_type: str
    due_date: date
    is_sent: bool
    company: str
    role_title: str
    is_due: bool


class NotificationRead(BaseModel):
    """In-app notification."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    message: str
    is_read: bool
    created_at: datetime
