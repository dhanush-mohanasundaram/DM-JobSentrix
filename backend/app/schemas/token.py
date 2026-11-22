"""Pydantic schema for the JWT response."""
from pydantic import BaseModel


class Token(BaseModel):
    """Bearer token returned on login."""

    access_token: str
    token_type: str = "bearer"
