from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.dependencies import DbSession, CurrentUser, OwnerUser
from app.models.company import Company
from app.models.user import User
from app.models.database_connection import DatabaseConnection
from app.models.conversation import Conversation
from app.schemas.company import CompanyResponse, CompanyUpdate, CompanyWithStats

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyWithStats)
async def get_current_company(current_user: CurrentUser, db: DbSession):
    """Get current user's company with stats."""
    result = await db.execute(
        select(Company).where(Company.id == current_user.company_id)
    )
    company = result.scalar_one()
    

    user_count = await db.execute(
        select(func.count(User.id)).where(User.company_id == company.id)
    )
    connection_count = await db.execute(
        select(func.count(DatabaseConnection.id)).where(
            DatabaseConnection.company_id == company.id
        )
    )
    conversation_count = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.company_id == company.id
        )
    )
    
    return CompanyWithStats(
        id=company.id,
        name=company.name,
        slug=company.slug,
        created_at=company.created_at,
        user_count=user_count.scalar(),
        connection_count=connection_count.scalar(),
        conversation_count=conversation_count.scalar()
    )


@router.patch("/me", response_model=CompanyResponse)
async def update_company(
    data: CompanyUpdate,
    owner_user: OwnerUser,
    db: DbSession
):
    """Update company details (owner only)."""
    result = await db.execute(
        select(Company).where(Company.id == owner_user.company_id)
    )
    company = result.scalar_one()
    
    if data.name is not None:
        company.name = data.name
    
    await db.flush()
    return company
