"""Application settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings; values come from .env or the environment."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "JobTrack Agent"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    LLM_TIMEOUT_SECONDS: float = 30.0
    LLM_RATE_LIMIT_PER_MINUTE: int = 5

    ENABLE_SCHEDULER: bool = True
    REMINDER_CHECK_INTERVAL_MINUTES: int = 60


settings = Settings()  # type: ignore[call-arg]
