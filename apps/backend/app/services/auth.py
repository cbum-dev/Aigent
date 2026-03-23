from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:

    
    @staticmethod
    def hash_password(password: str) -> str:

        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:

        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:

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

        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm]
            )
            return payload
        except JWTError:
            return None

    def verify_token(self, token: str) -> dict:

        payload = self.decode_token(token)
        if payload is None:
            raise Exception("Invalid token")
        return payload
    
    @staticmethod
    def create_tokens(user_id: str, company_id: str, email: str) -> dict:

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


def get_auth_service() -> AuthService:

    return AuthService()
