from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8)
    role: str = "member"


class UserUpdate(BaseModel):
    """User update schema."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """User response schema."""
    id: UUID
    company_id: UUID
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserWithCompany(UserResponse):
    """User response with company details."""
    company_name: str
    company_slug: str
