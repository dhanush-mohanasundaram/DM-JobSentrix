# Product: JobTrack Agent

## Purpose
JobTrack Agent is a full-stack web app that manages the whole job-application lifecycle with AI help. Built as a flagship portfolio project for a final-year B.E. Electronics and Communication Engineering student (VCET, Erode, graduating 2027) targeting an SDE role at a product company by 31 December 2026. All code must be explainable in an interview.

## Core User Flow
1. Paste a job description
2. Server extracts required skills
3. Computes a match score against the user's skills
4. Lists skill gaps
5. Builds a weekly learning roadmap (up to 8 weeks)
6. Tracks the application
7. Schedules day-7 and day-14 follow-up reminders

## Capabilities Demonstrated
- Relational schema design (PostgreSQL + SQLAlchemy 2.0 + Alembic)
- JWT authentication
- REST contract design with validation and a uniform error envelope
- LLM integration (Groq or OpenRouter) with a deterministic fallback
- Background scheduling (APScheduler with SQLAlchemy job store)
- React 18 + TypeScript frontend
- Automated tests (pytest, ≥70% coverage)
- Free-tier deployment (Neon → Render → Vercel/Netlify)

## Target User
The developer themselves — one user at a time, authenticated. No multi-tenancy complexity beyond per-user data isolation.

## Non-Goals
- No email sending (MVP)
- No mobile app
- No real-time features (no WebSockets)
- No local LLMs, no vector databases, no containers

## Interview Talking Points (must appear in README)
1. PostgreSQL + SQLAlchemy 2.0 + Alembic give version-controlled schema changes; `alembic check` guards against drift.
2. The LLM layer is server-side so keys never reach the browser, with retry, strict JSON validation, a per-user rate limit, and a deterministic fallback so the feature degrades instead of failing.
3. The match score is a transparent set intersection over normalized skill strings — explainable in one sentence, not a black box.
4. APScheduler with a database-backed job store survives restarts without Redis or Celery; the job is idempotent.
5. Every query is scoped to the authenticated user; tests prove cross-user isolation (404 not 403).
6. One JSON error envelope covers every error including framework-generated ones.
