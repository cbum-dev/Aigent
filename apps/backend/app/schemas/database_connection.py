from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class DatabaseConnectionBase(BaseModel):
    """Base database connection fields (unencrypted for input)."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    host: str = Field(..., min_length=1)
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    ssl_mode: str = Field(default="prefer")


class DatabaseConnectionCreate(DatabaseConnectionBase):
    """Database connection creation schema."""
    pass


class DatabaseConnectionUpdate(BaseModel):
    """Database connection update schema."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssl_mode: Optional[str] = None
    is_active: Optional[bool] = None


class DatabaseConnectionResponse(BaseModel):
    """Database connection response (no sensitive data)."""
    id: UUID
    company_id: UUID
    name: str
    description: Optional[str]
    host: str  
    port: int
    database: str  
    ssl_mode: str
    is_active: bool
    last_tested_at: Optional[datetime]
    last_test_success: Optional[bool]
    created_at: datetime
    
    class Config:
        from_attributes = True


class DatabaseConnectionTestRequest(BaseModel):
    """Request to test a database connection."""
    host: str
    port: int = 5432
    database: str
    username: str
    password: str
    ssl_mode: str = "prefer"


class DatabaseConnectionTestResponse(BaseModel):
    """Response from connection test."""
    success: bool
    message: Optional[str] = None


class SchemaInfoResponse(BaseModel):
    """Database schema information."""
    tables: list[dict]
