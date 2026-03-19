from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class MessageBase(BaseModel):
    """Base message fields."""
    content: str = Field(..., min_length=1)


class MessageCreate(MessageBase):
    """Message creation (user input)."""
    pass


class MessageResponse(MessageBase):
    """Message response."""
    id: UUID
    conversation_id: UUID
    role: str
    message_metadata: Optional[dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    """Base conversation fields."""
    title: str = Field(default="New Conversation", max_length=255)
    database_connection_id: Optional[UUID] = None


class ConversationCreate(ConversationBase):
    """Conversation creation schema."""
    pass


class ConversationUpdate(BaseModel):
    """Conversation update schema."""
    title: Optional[str] = Field(None, max_length=255)
    database_connection_id: Optional[UUID] = None


class ConversationResponse(ConversationBase):
    """Conversation response."""
    id: UUID
    company_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ConversationWithMessages(ConversationResponse):
    """Conversation with all messages."""
    messages: list[MessageResponse] = []


class ConversationList(BaseModel):
    """Paginated conversation list."""
    items: list[ConversationResponse]
    total: int
    page: int
    per_page: int


class ReportBase(BaseModel):
    """Base report fields."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ReportCreate(ReportBase):
    """Report creation schema."""
    sql_query: Optional[str] = None
    results: Optional[dict[str, Any]] = None
    chart_type: Optional[str] = None
    chart_config: Optional[dict[str, Any]] = None
    insights: Optional[str] = None


class ReportResponse(ReportBase):
    """Report response."""
    id: UUID
    conversation_id: UUID
    sql_query: Optional[str]
    results: Optional[dict[str, Any]]
    chart_type: Optional[str]
    chart_config: Optional[dict[str, Any]]
    insights: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
