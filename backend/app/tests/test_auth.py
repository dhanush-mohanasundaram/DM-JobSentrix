"""Auth tests."""
from app.tests.conftest import register_and_login


def test_register_and_me(client):
    headers = register_and_login(client)
    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "a@example.com"
    assert "password_hash" not in r.json()


def test_duplicate_email_rejected(client):
    register_and_login(client)
    r = client.post("/auth/register", json={"email": "A@example.com", "password": "password123"})
    assert r.status_code == 400
    assert r.json()["error"]["message"] == "Email already registered"


def test_wrong_password(client):
    register_and_login(client)
    r = client.post("/auth/login", data={"username": "a@example.com", "password": "nope-nope"})
    assert r.status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/jobs").status_code == 401
    assert client.get("/jobs", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_validation_error_envelope(client):
    r = client.post("/auth/register", json={"email": "bad", "password": "short"})
    assert r.status_code == 422
    assert r.json()["error"]["status"] == 422


def test_unknown_route_uses_envelope(client):
    r = client.get("/does-not-exist")
    assert r.status_code == 404
    assert "error" in r.json()


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}
