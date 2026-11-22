"""JD analyzer, resume tailor, matcher, LLM parsing and scheduler tests."""
from datetime import date, timedelta

import pytest

from app.core.config import settings
from app.models.reminder import Notification
from app.services import llm_service, matcher_service
from app.services.scheduler_service import process_due_reminders

JD = "We need a Senior engineer with Python, FastAPI, PostgreSQL, Docker and AWS experience."


def seed(client, auth, jd=JD):
    for name in ("Python", "postgres"):
        client.post("/skills", json={"skill_name": name}, headers=auth)
    return client.post("/jobs", json={"company": "Acme", "role_title": "SDE", "jd_text": jd}, headers=auth).json()


# ---------------------------------------------------------------- matcher
def test_match_score_is_set_intersection():
    score, matched, gaps = matcher_service.compute_match(
        ["Python", "PostgreSQL", "Docker", "AWS"], ["python", "Postgres"]
    )
    assert score == 0.5
    assert matched == ["Python", "PostgreSQL"]
    assert gaps == ["Docker", "AWS"]


def test_match_empty_and_duplicates():
    assert matcher_service.compute_match([], ["python"])[0] == 0.0
    assert matcher_service.compute_match(["Python", "python", "PY"], ["python"])[0] == 1.0


def test_roadmap_caps_weeks():
    road = matcher_service.build_roadmap([f"s{i}" for i in range(12)])
    assert len(road) == 8 and road[0]["week"] == 1


# ------------------------------------------------------------ llm helpers
def test_parse_json_tolerates_fences():
    assert llm_service.parse_json_object('```json\n{"a": 1}\n```') == {"a": 1}
    assert llm_service.parse_json_object('Sure! {"a": 1} hope that helps') == {"a": 1}


@pytest.mark.parametrize("bad", ["", "no json", "{broken", "[1,2]"])
def test_parse_json_rejects_garbage(bad):
    with pytest.raises(llm_service.LLMError):
        llm_service.parse_json_object(bad)


def test_fallback_extract():
    out = llm_service.fallback_extract("Senior role: Python, C++, Node.js, JavaScript and CI/CD")
    for s in ("python", "c++", "node.js", "javascript", "ci/cd"):
        assert s in out["required_skills"]
    assert "java" not in out["required_skills"]  # not matched inside "javascript"
    assert out["seniority"] == "Senior"


def test_no_api_key_raises(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "groq")
    with pytest.raises(llm_service.LLMError):
        llm_service.extract_jd("anything")


# --------------------------------------------------------------- endpoints
def test_analyze_with_llm(client, auth, monkeypatch):
    job = seed(client, auth)
    monkeypatch.setattr(
        llm_service, "extract_jd",
        lambda text: {"required_skills": ["Python", "PostgreSQL", "Docker", "AWS"], "seniority": "Senior", "keywords": ["backend"]},
    )
    r = client.post("/jd/analyze", json={"job_id": job["id"]}, headers=auth)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["match_score"] == 0.5
    assert body["skill_gaps"] == ["Docker", "AWS"]
    assert body["used_fallback"] is False
    assert body["roadmap"][0]["skill"] == "Docker"
    stored = client.get(f"/jd/parse/{job['id']}", headers=auth).json()
    assert stored["match_score"] == 0.5


def test_analyze_falls_back_when_llm_fails(client, auth, monkeypatch):
    job = seed(client, auth)

    def boom(text):
        raise llm_service.LLMError("down")

    monkeypatch.setattr(llm_service, "extract_jd", boom)
    r = client.post("/jd/analyze", json={"job_id": job["id"], "jd_text": JD}, headers=auth)
    assert r.status_code == 200
    assert r.json()["used_fallback"] is True
    assert "python" in r.json()["required_skills"]


def test_analyze_reanalysis_updates_same_row(client, auth, monkeypatch):
    job = seed(client, auth)
    monkeypatch.setattr(llm_service, "extract_jd", lambda t: {"required_skills": ["Python"], "seniority": "Mid", "keywords": []})
    client.post("/jd/analyze", json={"job_id": job["id"]}, headers=auth)
    r = client.post("/jd/analyze", json={"job_id": job["id"]}, headers=auth)
    assert r.json()["match_score"] == 1.0


def test_analyze_empty_jd_and_missing_parse(client, auth):
    job = client.post("/jobs", json={"company": "A", "role_title": "B"}, headers=auth).json()
    assert client.post("/jd/analyze", json={"job_id": job["id"]}, headers=auth).status_code == 400
    assert client.get(f"/jd/parse/{job['id']}", headers=auth).status_code == 404


def test_analyze_rate_limited(client, auth, monkeypatch):
    job = seed(client, auth)
    monkeypatch.setattr(settings, "LLM_RATE_LIMIT_PER_MINUTE", 2)
    monkeypatch.setattr(llm_service, "extract_jd", lambda t: {"required_skills": ["Python"], "seniority": "Mid", "keywords": []})
    codes = [client.post("/jd/analyze", json={"job_id": job["id"]}, headers=auth).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_tailor_fallback_and_success(client, auth, monkeypatch):
    def boom(a, b):
        raise llm_service.LLMError("down")

    monkeypatch.setattr(llm_service, "tailor_resume", boom)
    r = client.post("/resumes/tailor", json={"resume_md": "I know python", "jd_text": JD}, headers=auth)
    assert r.status_code == 200 and r.json()["used_fallback"] is True
    assert "docker" in r.json()["missing_keywords"] and "python" not in r.json()["missing_keywords"]

    monkeypatch.setattr(
        llm_service, "tailor_resume",
        lambda a, b: {"suggested_bullets": ["Built X"], "missing_keywords": ["Docker"], "summary": "ok"},
    )
    r = client.post("/resumes/tailor", json={"resume_md": "x", "jd_text": JD}, headers=auth)
    assert r.json()["suggested_bullets"] == ["Built X"] and r.json()["used_fallback"] is False
    assert client.post("/resumes/tailor", json={"resume_md": "", "jd_text": JD}, headers=auth).status_code == 400


# --------------------------------------------------------------- scheduler
def test_scheduler_creates_notifications_once(client, auth, db_session):
    job = client.post("/jobs", json={"company": "Acme", "role_title": "SDE"}, headers=auth).json()
    old = (date.today() - timedelta(days=10)).isoformat()
    client.post("/applications", json={"job_id": job["id"], "applied_date": old}, headers=auth)
    assert process_due_reminders(db_session) == 1  # 7d reminder is due, 14d is not
    assert process_due_reminders(db_session) == 0  # idempotent
    notes = client.get("/notifications", headers=auth).json()
    assert len(notes) == 1 and "Acme" in notes[0]["message"]
    assert client.post("/notifications/read-all", headers=auth).status_code == 204
    assert client.get("/notifications", headers=auth).json()[0]["is_read"] is True
    assert db_session.query(Notification).count() == 1


# ------------------------------------------------- provider HTTP behaviour
def _mock_client(handler):
    import httpx

    real = httpx.Client

    def factory(*a, **kw):
        kw["transport"] = httpx.MockTransport(handler)
        return real(*a, **kw)

    return factory


def test_chat_success_and_headers(monkeypatch):
    import httpx

    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers["authorization"]
        seen["url"] = str(request.url)
        content = '{"required_skills": ["Python", "SQL"], "seniority": "Junior", "keywords": ["api"]}'
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    monkeypatch.setattr(settings, "GROQ_API_KEY", "k123")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(llm_service.httpx, "Client", _mock_client(handler))
    out = llm_service.extract_jd("jd")
    assert out["required_skills"] == ["Python", "SQL"] and out["seniority"] == "Junior"
    assert seen["auth"] == "Bearer k123" and "groq.com" in seen["url"]


def test_chat_retries_then_fails(monkeypatch):
    import httpx

    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        return httpx.Response(429)

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "k")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "openrouter")
    monkeypatch.setattr(llm_service.time, "sleep", lambda s: None)
    monkeypatch.setattr(llm_service.httpx, "Client", _mock_client(handler))
    with pytest.raises(llm_service.LLMError):
        llm_service.extract_jd("jd")
    assert calls["n"] == 2


def test_extract_rejects_empty_skills(monkeypatch):
    monkeypatch.setattr(llm_service, "_chat", lambda s, u: '{"required_skills": [], "seniority": "Mid"}')
    with pytest.raises(llm_service.LLMError):
        llm_service.extract_jd("jd")


def test_tailor_parses(monkeypatch):
    monkeypatch.setattr(
        llm_service, "_chat",
        lambda s, u: '{"suggested_bullets": ["a", "a", "b"], "missing_keywords": ["Docker"], "summary": "ok"}',
    )
    out = llm_service.tailor_resume("r", "j")
    assert out["suggested_bullets"] == ["a", "b"] and out["summary"] == "ok"
