"""Transparent skill matching: normalized set intersection."""
import re

# Common spellings mapped to one canonical form so "JS" matches "JavaScript".
ALIASES: dict[str, str] = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "postgres": "postgresql",
    "psql": "postgresql",
    "node": "node.js",
    "nodejs": "node.js",
    "reactjs": "react",
    "react.js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "golang": "go",
    "k8s": "kubernetes",
    "mongo": "mongodb",
    "gcp": "google cloud",
    "amazon web services": "aws",
    "ci/cd": "ci/cd",
    "cicd": "ci/cd",
    "rest": "rest api",
    "rest apis": "rest api",
    "restful api": "rest api",
    "restful apis": "rest api",
    "ml": "machine learning",
    "dsa": "data structures",
    "data structures and algorithms": "data structures",
}


def normalize_skill(skill: str) -> str:
    """Lowercase, trim, collapse spaces and map aliases to a canonical name."""
    s = re.sub(r"\s+", " ", skill.strip().lower())
    return ALIASES.get(s, s)


def compute_match(
    required_skills: list[str], user_skills: list[str]
) -> tuple[float, list[str], list[str]]:
    """Return (score, matched, gaps).

    score = |required ∩ user| / |required| over normalized strings.
    `matched` and `gaps` keep the original spelling of the required skills.
    An empty requirement list scores 0.0 (nothing to match against).
    """
    user_norm = {normalize_skill(s) for s in user_skills if s.strip()}
    seen: set[str] = set()
    matched: list[str] = []
    gaps: list[str] = []
    for skill in required_skills:
        key = normalize_skill(skill)
        if not key or key in seen:
            continue
        seen.add(key)
        (matched if key in user_norm else gaps).append(skill.strip())
    total = len(matched) + len(gaps)
    score = round(len(matched) / total, 4) if total else 0.0
    return score, matched, gaps


def build_roadmap(gaps: list[str], max_weeks: int = 8) -> list[dict]:
    """One skill gap per week with a simple learn → build → show plan."""
    return [
        {
            "week": i,
            "skill": gap,
            "focus": (
                f"Learn the core concepts of {gap}, build one small project that "
                f"uses it, and add a resume bullet describing it."
            ),
        }
        for i, gap in enumerate(gaps[:max_weeks], start=1)
    ]
