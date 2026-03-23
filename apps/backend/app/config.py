from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from functools import lru_cache
from typing import Optional, Any
from cryptography.fernet import Fernet
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode


class Settings(BaseSettings):

    

    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/aigent")
    
    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:

        if not v:
            return v
            
        v = v.strip()
            

        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and "+asyncpg" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            
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
        

        try:
            from urllib.parse import urlparse
            p = urlparse(v)
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

        if not v:
            return "MISSING_ENCRYPTION_KEY_PLEASE_SET_IN_ENV"
        
        v = v.strip()
        return v
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  
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

        if not v:
            return ["http://localhost:3000"]
        
        if isinstance(v, list):
            return [str(item).strip() for item in v if item]
            
        if isinstance(v, str):
            v = v.strip()

            if v.startswith("[") and v.endswith("]"):
                try:
                    import json
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if item]
                except Exception:

                    v = v[1:-1]
            

            return [item.strip().strip("'\"") for item in v.split(",") if item.strip()]
            
        return [str(v)]
    

    redis_url: str = "redis://localhost:6379"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:

    return Settings()
