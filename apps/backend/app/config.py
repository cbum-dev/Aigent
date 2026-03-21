from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aigent"
    

    secret_key: str = "your-secret-key-change-in-production"
    encryption_key: str = "your-fernet-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    refresh_token_expire_days: int = 7
    

    gemini_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    

    langsmith_api_key: Optional[str] = None
    langsmith_endpoint: Optional[str] = None
    langsmith_project: str = "aigent"
    langsmith_tracing: bool = True
    

    cors_origins: list[str] = ["http://localhost:3000"]
    

    redis_url: str = "redis://localhost:6379"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
