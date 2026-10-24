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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
