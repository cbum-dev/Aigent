import re
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import DbSession
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest, 
    RegisterRequest, 
    TokenResponse, 
    RefreshTokenRequest
)
from app.schemas.user import UserResponse, UserWithCompany
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def slugify(text: str) -> str:

    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: DbSession):


    existing = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    

    slug = slugify(data.company_name)
    

    existing_company = await db.execute(
        select(Company).where(Company.slug == slug)
    )
    if existing_company.scalar_one_or_none():

        import uuid
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    company = Company(
        name=data.company_name,
        slug=slug
    )
    db.add(company)
    await db.flush() 
    

    user = User(
        company_id=company.id,
        email=data.email,
        password_hash=AuthService.hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.OWNER
    )
    db.add(user)
    await db.flush()
    

    tokens = AuthService.create_tokens(
        user_id=str(user.id),
        company_id=str(company.id),
        email=user.email
    )
    
    return TokenResponse(**tokens)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DbSession):


    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not AuthService.verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    

    tokens = AuthService.create_tokens(
        user_id=str(user.id),
        company_id=str(user.company_id),
        email=user.email
    )
    
    return TokenResponse(**tokens)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: DbSession):

    payload = AuthService.decode_token(data.refresh_token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    

    from uuid import UUID
    result = await db.execute(
        select(User).where(User.id == UUID(payload["sub"]))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )
    

    tokens = AuthService.create_tokens(
        user_id=str(user.id),
        company_id=str(user.company_id),
        email=user.email
    )
    
    return TokenResponse(**tokens)


@router.get("/me", response_model=UserWithCompany)
async def get_current_user_info(db: DbSession):

    from app.dependencies import get_current_user
    from fastapi import Depends

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Use the /users/me endpoint instead"
    )
