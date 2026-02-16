"""
Chat Router — WebSocket endpoint for real-time agent interaction.

Handles connection upgrades, JWT authentication via query param,
and the message loop.
"""

import json
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth import get_auth_service
from app.services.chat import ChatService
from app.models.conversation import MessageRole
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


async def get_current_user_ws(
    token: str,
    db: AsyncSession,
) -> User:
    """Validate token from query param for WebSocket."""
    auth_service = get_auth_service()
    try:
        payload = auth_service.verify_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    from sqlalchemy import select
    # 'sub' in token is user_id
    user_id_str = payload.get("sub")
    result = await db.execute(select(User).where(User.id == UUID(user_id_str)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.websocket("/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for real-time chat.
    
    Flow:
    1. Connect & Auth
    2. Check conversation access
    3. Loop: Receive message -> Save -> Run Agent -> Stream Response -> Save Response
    """
    try:
        user = await get_current_user_ws(token, db)
    except HTTPException:
        await websocket.close(code=4001)
        return

    chat_service = ChatService(db)
    conversation = await chat_service.get_conversation(conversation_id, user.id)
    
    if not conversation:
        await websocket.close(code=4003)  # Forbidden
        return
        
    if not conversation.database_connection_id:
        await websocket.accept()
        await websocket.send_text(json.dumps({
            "type": "error", 
            "content": "Conversation has no database connection linked."
        }))
        await websocket.close()
        return

    await websocket.accept()

    try:
        while True:
            # 1. Receive User Message
            data = await websocket.receive_text()
            payload = json.loads(data)
            user_msg_content = payload.get("content")
            
            if not user_msg_content:
                continue

            # 2. Save User Message
            await chat_service.save_message(
                conversation_id=conversation_id,
                role=MessageRole.USER,
                content=user_msg_content
            )

            # 3. Run Agent & Stream
            full_response_content = ""
            final_metadata = {}

            async for event_json in chat_service.stream_agent_response(
                conversation_id=conversation_id,
                question=user_msg_content,
                connection_id=conversation.database_connection_id,
                company_id=user.company_id
            ):
                await websocket.send_text(event_json)
                
                # Accumulate final response for saving
                event = json.loads(event_json)
                if event["type"] == "result":
                    full_response_content = event.get("content", "")
                    # Save other artifacts as metadata
                    final_metadata = {
                        "sql_query": event.get("sql_query"),
                        "chart_config": event.get("chart_config"),
                        "insights": event.get("insights")
                    }

            # 4. Save Assistant Message
            if full_response_content or final_metadata:
                await chat_service.save_message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=full_response_content or "Here is the analysis.",
                    metadata=final_metadata
                )
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        # Try to send error if still connected
        try:
             await websocket.send_text(json.dumps({"type": "error", "content": str(e)}))
        except:
            pass
