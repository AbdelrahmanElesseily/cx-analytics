from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Google AI
    google_api_key: str = ""

    # GitHub Models (legacy)
    github_token: str = ""
    github_model: str = "gpt-4o-mini"

    # DB
    database_url: str = "sqlite+aiosqlite:///./data/cx.db"

    # ChromaDB
    chroma_path: str = "./data/chroma"

    # App
    app_env: str = "development"
    app_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    max_rows_returned: int = 500
    query_timeout_seconds: int = 30

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def github_base_url(self) -> str:
        return "https://models.inference.ai.azure.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
