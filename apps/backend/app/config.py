from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from functools import lru_cache
from typing import Optional
from cryptography.fernet import Fernet
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    

    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/aigent")
    
    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Normalize database URL for async compatibility."""
        if not v:
            return v
            
        v = v.strip()
            
        # 1. Handle Render/Heroku style postgres://
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "+asyncpg" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        # 2. Strip incompatible query parameters like sslmode
        # asyncpg handles SSL via connect_args in database.py
        import re
        v = re.sub(r'([?&])sslmode=[^&]*(&|$)', r'\1', v)
        v = v.rstrip('?&')
        
        # 3. Debug logging (masked)
        try:
            from urllib.parse import urlparse
            p = urlparse(v)
            # Mask sensitive parts for logs
            user_creds = f"{p.username}:***" if p.username else "none"
            safe_url = f"{p.scheme}://{user_creds}@{p.hostname}:{p.port}{p.path}?{p.query}"
            print(f"DEBUG: Normalized DATABASE_URL: {safe_url}")
        except Exception:
            print(f"DEBUG: Normalized DATABASE_URL (raw length): {len(v)}")
                
        return v
    

    secret_key: str = "your-secret-key-change-in-production"
    encryption_key: str = Field(default="your-fernet-key-change-in-production")
    
    @field_validator("encryption_key", mode="before")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        """Normalize encryption key and ensure it's a valid Fernet key."""
        if not v:
            return Fernet.generate_key().decode()
        
        v = v.strip()
        if v == "your-fernet-key-change-in-production":
            return Fernet.generate_key().decode()
            
        try:
            # Test if it's a valid Fernet key
            Fernet(v.encode())
            return v
        except Exception:
            # If invalid, return a fresh one for the session
            return Fernet.generate_key().decode()
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
