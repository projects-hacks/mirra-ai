"""Application configuration via environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """All configuration loaded from environment variables or .env file."""

    # Perfect Corp
    PERFECT_CORP_API_KEY: str = ""
    PERFECT_CORP_BASE_URL: str = "https://yce-api-01.makeupar.com"

    # Deepgram
    DEEPGRAM_API_KEY: str = ""

    # Google AI Studio (for Gemini 3.1 Pro via Deepgram BYO)
    GOOGLE_AI_STUDIO_KEY: str = ""

    # Google Calendar
    GOOGLE_CALENDAR_CREDENTIALS: str = ""  # JSON string (legacy, for global credentials)
    GOOGLE_CLIENT_ID: str = ""  # OAuth client ID
    GOOGLE_CLIENT_SECRET: str = ""  # OAuth client secret

    # Serper (Google Shopping)
    SERPER_API_KEY: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    USE_MOCKS: bool = True
    PORT: int = 8000
    CORS_ORIGIN: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
