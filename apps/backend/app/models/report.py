import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class Report(Base):
    """Saved report/visualization from a conversation."""
    
    __tablename__ = "reports"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    

    sql_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    

    results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    

    chart_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    chart_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    

    insights: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    

    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="reports"
    )
    
    def __repr__(self) -> str:
        return f"<Report {self.title}>"
