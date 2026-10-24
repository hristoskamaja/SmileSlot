from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# A booking can be cancelled until this many hours before the appointment starts.
CANCELLATION_HOURS = 24


class Settings(BaseSettings):
    """App settings, read from environment variables (or backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    # Comma-separated list, e.g. "http://localhost:5173,https://smileslot.vercel.app"
    cors_origins: str = "http://localhost:5173"
    timezone: str = "Europe/Skopje"
    # Empty key = AI is off and bookings use the template message.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    # Empty = Google Calendar is off. Either the service-account JSON itself (starts with "{") or a path to the file.
    google_service_account_json: str = ""
    # Only used by the seed: the calendar id for the first demo doctor. Empty = none.
    demo_calendar_id: str = ""

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        # Render gives "postgres://..." (some tools "postgresql://..."), but our driver needs "postgresql+psycopg://...".
        # Only the start is replaced; a URL that already has "+psycopg" matches neither prefix and stays as it is.
        for old in ("postgresql://", "postgres://"):
            if url.startswith(old):
                return "postgresql+psycopg://" + url[len(old):]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
