from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from functools import lru_cache
from typing import Optional, Any
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
            
        # 2. Strip ALL libpq-specific query parameters incompatible with asyncpg
        # asyncpg handles SSL via connect_args in database.py
        from urllib.parse import urlparse as _urlparse, parse_qs, urlencode, urlunparse
        _INCOMPATIBLE_PARAMS = {
            "sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey",
            "sslpassword", "sslcrl", "sslcrldir", "sslsni", "requirepeer",
            "krbsrvname", "gsslib", "target_session_attrs", "options",
        }
        _parsed = _urlparse(v)
        if _parsed.query:
            _params = parse_qs(_parsed.query, keep_blank_values=True)
            for _bad in _INCOMPATIBLE_PARAMS:
                _params.pop(_bad, None)
            _clean_query = urlencode(_params, doseq=True)
            v = urlunparse(_parsed._replace(query=_clean_query))
        
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
            # We return a dummy key if missing, but we'll check it in the service
            return "MISSING_ENCRYPTION_KEY_PLEASE_SET_IN_ENV"
        
        v = v.strip()
        return v
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    refresh_token_expire_days: int = 7
    

    gemini_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    

    langsmith_api_key: Optional[str] = None
    langsmith_endpoint: Optional[str] = None
    langsmith_project: str = "aigent"
    langsmith_tracing: bool = True
    

    cors_origins: list[str] = Field(default=["http://localhost:3000"])
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def validate_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS origins from string, list, or JSON-like string."""
        if not v:
            return ["http://localhost:3000"]
        
        if isinstance(v, list):
            return [str(item).strip() for item in v if item]
            
        if isinstance(v, str):
            v = v.strip()
            # Handle JSON-like string: ["a", "b"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    import json
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:
                    # Fallback: strip brackets and split by comma
                    v = v[1:-1]
            
            # Split by comma
            return [item.strip().strip("'\"") for item in v.split(",") if item.strip()]
            
        return [str(v)]
    

    redis_url: str = "redis://localhost:6379"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
