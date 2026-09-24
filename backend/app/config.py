from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://musafir:musafir@localhost:5432/musafir"
    cors_origins: str = "http://localhost:5173"

    jwt_secret: str = "dev-secret-change-me"
    jwt_expiry_minutes: int = 30 * 24 * 60  # 30 days

    ai_enabled: bool = False
    # Groq is the only supported provider; any other AI_PROVIDER value fails at startup.
    ai_provider: Literal["groq"] = "groq"
    ai_model: str = "openai/gpt-oss-120b"
    ai_api_key: str = ""
    ai_timeout_seconds: float = 20.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
