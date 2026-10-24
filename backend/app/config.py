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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
