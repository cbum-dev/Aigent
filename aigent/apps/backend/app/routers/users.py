from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import DbSession, CurrentUser, AdminUser
from app.models.user import User
from app.models.company import Company
from app.schemas.user import UserResponse, UserWithCompany, UserUpdate
from app.schemas.auth import PasswordChangeRequest
from app.services.auth import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserWithCompany)
async def get_current_user(current_user: CurrentUser, db: DbSession):
    """Get current user information with company details."""

    result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = result.scalar_one()
    
    return UserWithCompany(
        id=current_user.id,
        company_id=current_user.company_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        company_name=company.name,
        company_slug=company.slug
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """Update current user's profile."""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    

    await db.flush()
    
    return current_user


@router.post("/me/password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """Change current user's password."""
    if not AuthService.verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.password_hash = AuthService.hash_password(data.new_password)
    await db.flush()
    
    return {"message": "Password changed successfully"}


@router.get("", response_model=list[UserResponse])
async def list_company_users(current_user: CurrentUser, db: DbSession):
    """List all users in the current user's company."""
    result = await db.execute(
        select(User).where(User.company_id == current_user.company_id)
    )
    users = result.scalars().all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: CurrentUser, db: DbSession):
    """Get a specific user (must be in same company)."""
    from uuid import UUID
    
    result = await db.execute(
        select(User).where(
            User.id == UUID(user_id),
            User.company_id == current_user.company_id
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    admin_user: AdminUser,
    db: DbSession
):
    """Update a user (admin only)."""
    from uuid import UUID
    
    result = await db.execute(
        select(User).where(
            User.id == UUID(user_id),
            User.company_id == admin_user.company_id
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:

        if admin_user.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owner can change user roles"
            )
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    
    await db.flush()
    return user
