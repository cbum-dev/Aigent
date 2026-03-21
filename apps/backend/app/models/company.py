import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Company(Base):
    """Multi-tenant company/organization model."""
    
    __tablename__ = "companies"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    
    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User", 
        back_populates="company",
        cascade="all, delete-orphan"
    )
    database_connections: Mapped[list["DatabaseConnection"]] = relationship(
        "DatabaseConnection",
        back_populates="company", 
        cascade="all, delete-orphan"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation",
        back_populates="company",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Company {self.name}>"
