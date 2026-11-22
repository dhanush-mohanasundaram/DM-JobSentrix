"""CRUD, ownership, applications, reminders and dashboard tests."""
from datetime import date, timedelta

from app.tests.conftest import register_and_login


def make_job(client, auth, **over):
    body = {"company": "Acme", "role_title": "SDE", **over}
    r = client.post("/jobs", json=body, headers=auth)
    assert r.status_code == 201, r.text
    return r.json()


def test_skills_crud(client, auth):
    r = client.post("/skills", json={"skill_name": "Python", "proficiency": "Advanced", "years_experience": 2}, headers=auth)
    assert r.status_code == 201
    sid = r.json()["id"]
    r = client.put(f"/skills/{sid}", json={"proficiency": "Intermediate"}, headers=auth)
    assert r.json()["proficiency"] == "Intermediate"
    assert len(client.get("/skills", headers=auth).json()) == 1
    assert client.delete(f"/skills/{sid}", headers=auth).status_code == 204
    assert client.get("/skills", headers=auth).json() == []


def test_invalid_proficiency(client, auth):
    r = client.post("/skills", json={"skill_name": "Go", "proficiency": "Wizard"}, headers=auth)
    assert r.status_code == 422


def test_jobs_crud(client, auth):
    job = make_job(client, auth, location="Chennai")
    assert client.get(f"/jobs/{job['id']}", headers=auth).json()["location"] == "Chennai"
    r = client.put(f"/jobs/{job['id']}", json={"company": "Beta"}, headers=auth)
    assert r.json()["company"] == "Beta" and r.json()["role_title"] == "SDE"
    assert client.delete(f"/jobs/{job['id']}", headers=auth).status_code == 204
    assert client.get(f"/jobs/{job['id']}", headers=auth).status_code == 404


def test_users_cannot_see_each_others_data(client, auth):
    job = make_job(client, auth)
    other = register_and_login(client, "b@example.com")
    assert client.get(f"/jobs/{job['id']}", headers=other).status_code == 404
    assert client.get("/jobs", headers=other).json() == []
    r = client.post("/applications", json={"job_id": job["id"]}, headers=other)
    assert r.status_code == 404


def test_application_creates_two_reminders(client, auth):
    job = make_job(client, auth)
    resume = client.post("/resumes", json={"version_name": "v1", "content_md": "# Me"}, headers=auth).json()
    applied = date.today()
    r = client.post(
        "/applications",
        json={"job_id": job["id"], "resume_version_id": resume["id"], "applied_date": applied.isoformat()},
        headers=auth,
    )
    assert r.status_code == 201
    assert r.json()["job"]["company"] == "Acme"
    reminders = client.get("/reminders", headers=auth).json()
    assert [x["reminder_type"] for x in reminders] == ["follow_up_7d", "follow_up_14d"]
    assert reminders[0]["due_date"] == (applied + timedelta(days=7)).isoformat()
    assert reminders[1]["due_date"] == (applied + timedelta(days=14)).isoformat()


def test_application_filters_and_patch(client, auth):
    j1, j2 = make_job(client, auth), make_job(client, auth, company="Beta")
    a1 = client.post("/applications", json={"job_id": j1["id"], "applied_date": "2026-01-01"}, headers=auth).json()
    client.post("/applications", json={"job_id": j2["id"], "applied_date": "2026-03-01"}, headers=auth)
    r = client.patch(f"/applications/{a1['id']}", json={"status": "Interview", "notes": "Round 1"}, headers=auth)
    assert r.json()["status"] == "Interview" and r.json()["notes"] == "Round 1"
    assert len(client.get("/applications?status=Interview", headers=auth).json()) == 1
    assert len(client.get("/applications?date_from=2026-02-01", headers=auth).json()) == 1
    assert len(client.get("/applications?date_to=2026-02-01", headers=auth).json()) == 1
    assert client.get("/applications?status=Bogus", headers=auth).status_code == 422
    assert client.delete(f"/applications/{a1['id']}", headers=auth).status_code == 204
    assert len(client.get("/applications", headers=auth).json()) == 1


def test_mark_reminder_sent(client, auth):
    job = make_job(client, auth)
    client.post("/applications", json={"job_id": job["id"]}, headers=auth)
    rid = client.get("/reminders", headers=auth).json()[0]["id"]
    assert client.patch(f"/reminders/{rid}/sent", headers=auth).json()["is_sent"] is True
    assert len(client.get("/reminders", headers=auth).json()) == 1


def test_dashboard(client, auth):
    empty = client.get("/dashboard/summary", headers=auth).json()
    assert empty["total_applied"] == 0 and empty["response_rate"] == 0.0
    ids = []
    for c in ("A", "B", "C", "D"):
        j = make_job(client, auth, company=c)
        ids.append(client.post("/applications", json={"job_id": j["id"]}, headers=auth).json()["id"])
    client.patch(f"/applications/{ids[0]}", json={"status": "Interview"}, headers=auth)
    client.patch(f"/applications/{ids[1]}", json={"status": "Reject"}, headers=auth)
    s = client.get("/dashboard/summary", headers=auth).json()
    assert s["total_applied"] == 4
    assert s["response_rate"] == 50.0
    assert s["status_counts"]["Applied"] == 2
    assert s["pending_reminders"] == 8
    funnel = client.get("/dashboard/funnel", headers=auth).json()
    assert [f["status"] for f in funnel] == ["Applied", "Screening", "Interview", "Offer", "Reject"]
    assert funnel[2]["count"] == 1


def test_resumes(client, auth):
    r = client.post("/resumes", json={"version_name": "SDE-v1", "content_md": "x"}, headers=auth)
    rid = r.json()["id"]
    assert client.get(f"/resumes/{rid}", headers=auth).json()["version_name"] == "SDE-v1"
    assert len(client.get("/resumes", headers=auth).json()) == 1
