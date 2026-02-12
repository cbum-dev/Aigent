from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service for password hashing and JWT tokens."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plain text password."""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain text password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.access_token_expire_minutes
            )
        
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(
            to_encode, 
            settings.secret_key, 
            algorithm=settings.algorithm
        )
    
    @staticmethod
    def create_refresh_token(
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT refresh token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                days=settings.refresh_token_expire_days
            )
        
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm]
            )
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def create_tokens(user_id: str, company_id: str, email: str) -> dict:
        """Create both access and refresh tokens for a user."""
        token_data = {
            "sub": user_id,
            "company_id": company_id,
            "email": email,
        }
        
        return {
            "access_token": AuthService.create_access_token(token_data),
            "refresh_token": AuthService.create_refresh_token(token_data),
            "token_type": "bearer",
        }
