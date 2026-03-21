"""Reports Router — CRUD for saved reports."""

from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, desc

from app.dependencies import DbSession, CurrentUser
from app.models.report import Report
from app.models.conversation import Conversation

router = APIRouter(prefix="/reports", tags=["reports"])


# ── Schemas ────────────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    conversation_id: str
    title: str
    description: str | None = None
    sql_query: str | None = None
    results: dict | None = None
    chart_type: str | None = None
    chart_config: dict | None = None
    insights: str | None = None


class ReportResponse(BaseModel):
    id: str
    conversation_id: str
    title: str
    description: str | None
    sql_query: str | None
    results: dict | None
    chart_type: str | None
    chart_config: dict | None
    insights: str | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    items: list[ReportResponse]
    total: int


# ── Helpers ────────────────────────────────────────────────────

def _to_response(report: Report) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        conversation_id=str(report.conversation_id),
        title=report.title,
        description=report.description,
        sql_query=report.sql_query,
        results=report.results,
        chart_type=report.chart_type,
        chart_config=report.chart_config,
        insights=report.insights,
        created_at=report.created_at.isoformat(),
        updated_at=report.updated_at.isoformat(),
    )


# ── Endpoints ──────────────────────────────────────────────────

@router.get("", response_model=ReportListResponse)
async def list_reports(db: DbSession, user: CurrentUser):
    """List all reports for conversations owned by the current user."""
    # Get conversation IDs belonging to this user's company
    conv_result = await db.execute(
        select(Conversation.id).where(
            Conversation.company_id == user.company_id
        )
    )
    conv_ids = [row[0] for row in conv_result.all()]

    if not conv_ids:
        return ReportListResponse(items=[], total=0)

    result = await db.execute(
        select(Report)
        .where(Report.conversation_id.in_(conv_ids))
        .order_by(desc(Report.created_at))
    )
    reports = result.scalars().all()

    return ReportListResponse(
        items=[_to_response(r) for r in reports],
        total=len(reports),
    )


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(data: CreateReportRequest, db: DbSession, user: CurrentUser):
    """Save a new report from a chat message."""
    # Verify the conversation belongs to the user's company
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(data.conversation_id),
            Conversation.company_id == user.company_id,
        )
    )
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    report = Report(
        conversation_id=UUID(data.conversation_id),
        title=data.title,
        description=data.description,
        sql_query=data.sql_query,
        results=data.results,
        chart_type=data.chart_type,
        chart_config=data.chart_config,
        insights=data.insights,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return _to_response(report)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: UUID, db: DbSession, user: CurrentUser):
    """Get a single report by ID."""
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    # Verify ownership via conversation
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == report.conversation_id,
            Conversation.company_id == user.company_id,
        )
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return _to_response(report)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: UUID, db: DbSession, user: CurrentUser):
    """Delete a report."""
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )

    # Verify ownership via conversation
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == report.conversation_id,
            Conversation.company_id == user.company_id,
        )
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await db.delete(report)
    await db.commit()
