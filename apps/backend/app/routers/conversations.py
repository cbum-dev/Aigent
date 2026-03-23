from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query
from sqlalchemy import select, func, desc

from app.dependencies import DbSession, CurrentUser
from app.models.conversation import Conversation, Message, MessageRole
from app.models.report import Report
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationWithMessages,
    ConversationList,
    MessageCreate,
    MessageResponse,
    ReportCreate,
    ReportResponse
)
from app.services import cache

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: CurrentUser,
    db: DbSession
):

    conversation = Conversation(
        company_id=current_user.company_id,
        user_id=current_user.id,
        title=data.title,
        database_connection_id=data.database_connection_id
    )
    
    db.add(conversation)
    await db.flush()


    await cache.invalidate_pattern(f"conversations:{current_user.id}:*")
    
    return conversation


@router.get("", response_model=ConversationList)
async def list_conversations(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):

    cache_key = f"conversations:{current_user.id}:{page}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return cached


    total_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.user_id == current_user.id
        )
    )
    total = total_result.scalar()
    

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
        .offset(offset)
        .limit(per_page)
    )
    conversations = result.scalars().all()
    
    response = ConversationList(
        items=conversations,
        total=total,
        page=page,
        per_page=per_page
    )
    await cache.set_json(cache_key, response.model_dump(), ttl=120)
    return response


@router.get("/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession
):

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    

    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()
    
    return ConversationWithMessages(
        id=conversation.id,
        company_id=conversation.company_id,
        user_id=conversation.user_id,
        title=conversation.title,
        database_connection_id=conversation.database_connection_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[MessageResponse.model_validate(m) for m in messages]
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: CurrentUser,
    db: DbSession
):

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    try:
        if data.title is not None:
            conversation.title = data.title
        if data.database_connection_id is not None:
            conversation.database_connection_id = data.database_connection_id
        
        await db.commit()
        await db.refresh(conversation)
        return conversation
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession
):

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await db.delete(conversation)
    

    await cache.invalidate_pattern(f"conversations:{current_user.id}:*")
    await cache.delete(f"messages:{conversation_id}")


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession
):

    cache_key = f"messages:{conversation_id}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()
    items = [MessageResponse.model_validate(m).model_dump() for m in messages]
    await cache.set_json(cache_key, items, ttl=120)
    return items


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_message(
    conversation_id: str,
    data: MessageCreate,
    current_user: CurrentUser,
    db: DbSession
):


    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    message = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=data.content
    )
    
    db.add(message)
    await db.flush()


    await cache.delete(f"messages:{conversation_id}")
    
    return message



@router.get("/{conversation_id}/reports", response_model=list[ReportResponse])
async def list_reports(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession
):


    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    reports_result = await db.execute(
        select(Report).where(Report.conversation_id == UUID(conversation_id))
    )
    return reports_result.scalars().all()


@router.post("/{conversation_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    conversation_id: str,
    data: ReportCreate,
    current_user: CurrentUser,
    db: DbSession
):


    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id),
            Conversation.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    report = Report(
        conversation_id=UUID(conversation_id),
        title=data.title,
        description=data.description,
        sql_query=data.sql_query,
        results=data.results,
        chart_type=data.chart_type,
        chart_config=data.chart_config,
        insights=data.insights
    )
    
    db.add(report)
    await db.flush()
    
    return report
