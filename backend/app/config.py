from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://musafir:musafir@localhost:5432/musafir"
    cors_origins: str = "http://localhost:5173"

    jwt_secret: str = "dev-secret-change-me"
    jwt_expiry_minutes: int = 30 * 24 * 60  # 30 days

    ai_enabled: bool = False
    ai_provider: str = "anthropic"
    ai_model: str = "claude-haiku-4-5-20251001"
    ai_api_key: str = ""
    ai_timeout_seconds: float = 20.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
