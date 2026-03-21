from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CompanyBase(BaseModel):
    """Base company fields."""
    name: str = Field(..., min_length=2, max_length=255)


class CompanyCreate(CompanyBase):
    """Company creation schema."""
    slug: Optional[str] = None 


class CompanyUpdate(BaseModel):
    """Company update schema."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)


class CompanyResponse(CompanyBase):
    """Company response schema."""
    id: UUID
    slug: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class CompanyWithStats(CompanyResponse):
    """Company response with usage stats."""
    user_count: int
    connection_count: int
    conversation_count: int
