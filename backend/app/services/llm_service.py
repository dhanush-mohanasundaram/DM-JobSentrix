"""LLM access (Groq / OpenRouter) with JSON validation and keyword fallback.

Everything here runs server-side; API keys never reach the browser.
"""
import json
import logging
import re
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_ENDPOINTS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
}

JD_SYSTEM_PROMPT = (
    "You extract structured data from job descriptions. "
    "Return valid JSON only, with exactly these keys: "
    '{"required_skills": string[], "seniority": string, "keywords": string[]}. '
    "required_skills are concrete technologies or skills (e.g. Python, SQL, Docker). "
    "seniority is one of: Intern, Junior, Mid, Senior, Lead."
)

TAILOR_SYSTEM_PROMPT = (
    "You are an ATS-aware resume coach. Given a resume in markdown and a job "
    "description, return valid JSON only: "
    '{"suggested_bullets": string[], "missing_keywords": string[], "summary": string}. '
    "Bullets must be truthful rewrites of existing experience, never invented facts. "
    "Give at most 6 bullets."
)

# Vocabulary for the offline fallback extractor.
SKILL_VOCAB: list[str] = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "sql", "nosql", "postgresql", "mysql",
    "mongodb", "redis", "sqlite", "dynamodb", "cassandra", "elasticsearch", "kafka",
    "rabbitmq", "fastapi", "django", "flask", "spring boot", "node.js", "express",
    "react", "angular", "vue", "next.js", "html", "css", "tailwind", "redux",
    "rest api", "graphql", "grpc", "microservices", "docker", "kubernetes", "aws",
    "azure", "google cloud", "terraform", "ansible", "jenkins", "ci/cd", "linux",
    "git", "github actions", "system design", "data structures", "algorithms",
    "object-oriented design", "design patterns", "unit testing", "pytest", "junit",
    "machine learning", "deep learning", "pytorch", "tensorflow", "pandas", "numpy",
    "spark", "airflow", "etl", "data modeling", "agile", "scrum", "oauth", "jwt",
    "websockets", "embedded systems", "iot", "mqtt", "rtos", "verilog", "vhdl",
]


class LLMError(Exception):
    """Raised when the LLM call fails or returns unusable output."""


# ---------------------------------------------------------------- fallback
def _term_pattern(term: str) -> re.Pattern[str]:
    return re.compile(
        r"(?<![A-Za-z0-9+#.])" + re.escape(term) + r"(?![A-Za-z0-9+#])", re.IGNORECASE
    )


def fallback_extract(jd_text: str) -> dict[str, Any]:
    """Pure-Python keyword extraction used when the LLM is unavailable."""
    found: list[str] = []
    for term in SKILL_VOCAB:
        if _term_pattern(term).search(jd_text) and term not in found:
            found.append(term)
    lowered = jd_text.lower()
    if re.search(r"\b(principal|staff|lead|architect)\b", lowered):
        seniority = "Lead"
    elif re.search(r"\b(senior|sr\.?)\b", lowered):
        seniority = "Senior"
    elif re.search(r"\b(intern|internship)\b", lowered):
        seniority = "Intern"
    elif re.search(r"\b(junior|jr\.?|entry[- ]level|fresher|graduate|new grad)\b", lowered):
        seniority = "Junior"
    else:
        seniority = "Mid"
    return {"required_skills": found, "seniority": seniority, "keywords": found}


# ----------------------------------------------------------------- plumbing
def _clean_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip() and item.strip() not in out:
            out.append(item.strip())
    return out


def parse_json_object(raw: str) -> dict[str, Any]:
    """Parse a JSON object from model output, tolerating ``` fences and chatter."""
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("Model output contained no JSON object")
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise LLMError(f"Malformed JSON from model: {exc}") from exc
    if not isinstance(data, dict):
        raise LLMError("Model JSON was not an object")
    return data


def _chat(system: str, user: str) -> str:
    """Send one chat completion request with a small retry on 429/5xx/timeouts."""
    provider = settings.LLM_PROVIDER.lower()
    if provider == "openrouter":
        key, model = settings.OPENROUTER_API_KEY, settings.OPENROUTER_MODEL
    else:
        provider, key, model = "groq", settings.GROQ_API_KEY, settings.GROQ_MODEL
    if not key:
        raise LLMError(f"No API key configured for {provider}")

    payload = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    last_error: Optional[Exception] = None
    for attempt in range(1, 3):
        try:
            with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
                resp = client.post(_ENDPOINTS[provider], json=payload, headers=headers)
            if resp.status_code in (429, 500, 502, 503, 504):
                last_error = LLMError(f"{provider} returned {resp.status_code}")
                logger.warning("LLM attempt %d failed: %s", attempt, last_error)
                time.sleep(0.5 * attempt)
                continue
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            last_error = exc
            logger.warning("LLM attempt %d failed: %s", attempt, exc)
            time.sleep(0.5 * attempt)
    raise LLMError(f"LLM request failed: {last_error}")


# ------------------------------------------------------------------ public
def extract_jd(jd_text: str) -> dict[str, Any]:
    """Ask the LLM for skills/seniority/keywords. Raises LLMError on any failure."""
    raw = _chat(JD_SYSTEM_PROMPT, f"Job description:\n\n{jd_text[:12000]}")
    data = parse_json_object(raw)
    skills = _clean_list(data.get("required_skills"))
    if not skills:
        raise LLMError("Model returned no required_skills")
    seniority = data.get("seniority")
    return {
        "required_skills": skills,
        "seniority": seniority.strip()[:30] if isinstance(seniority, str) and seniority.strip() else "Mid",
        "keywords": _clean_list(data.get("keywords")),
    }


def tailor_resume(resume_md: str, jd_text: str) -> dict[str, Any]:
    """Ask the LLM for tailored bullets and missing ATS keywords. Raises LLMError."""
    raw = _chat(
        TAILOR_SYSTEM_PROMPT,
        f"Resume (markdown):\n{resume_md[:8000]}\n\nJob description:\n{jd_text[:8000]}",
    )
    data = parse_json_object(raw)
    summary = data.get("summary")
    return {
        "suggested_bullets": _clean_list(data.get("suggested_bullets"))[:6],
        "missing_keywords": _clean_list(data.get("missing_keywords")),
        "summary": summary.strip() if isinstance(summary, str) else "",
    }
