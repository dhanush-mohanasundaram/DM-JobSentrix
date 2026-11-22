"""Test fixtures: in-memory SQLite DB, dependency override, auth helpers."""
import os

# Must be set before the app is imported.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ["ENABLE_SCHEDULER"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.services import rate_limit


@pytest.fixture()
def db_session():
    """Fresh in-memory database per test."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """TestClient whose get_db yields the test session."""

    def override():
        yield db_session

    app.dependency_overrides[get_db] = override
    rate_limit.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def register_and_login(client: TestClient, email: str = "a@example.com") -> dict[str, str]:
    """Register a user and return Authorization headers."""
    r = client.post("/auth/register", json={"email": email, "password": "password123", "full_name": "A"})
    assert r.status_code == 201, r.text
    r = client.post("/auth/login", data={"username": email, "password": "password123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def auth(client):
    """Headers for a logged-in user."""
    return register_and_login(client)
