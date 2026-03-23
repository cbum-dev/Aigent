

import json
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.conversation import Conversation, Message, MessageRole
from app.models.database_connection import DatabaseConnection
from app.services.encryption import get_encryption_service
from app.agents.graph import build_graph
from app.services import cache


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_message(
        self,
        conversation_id: UUID,
        role: MessageRole,
        content: str,
        metadata: dict | None = None,
    ) -> Message:

        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            message_metadata=metadata,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        await cache.delete(f"messages:{conversation_id}")
        return message

    async def get_conversation(
        self, conversation_id: UUID, user_id: UUID
    ) -> Conversation | None:

        result = await self.db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_connection_credentials(self, connection_id: UUID) -> dict:

        cache_key = f"conn_creds:{connection_id}"
        cached = await cache.get_json(cache_key)
        if cached is not None:
            return cached

        result = await self.db.execute(
            select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
        )
        connection = result.scalar_one_or_none()
        if not connection:
            raise ValueError("Connection not found")

        enc = get_encryption_service()
        
        host = enc.decrypt(connection.host_encrypted)
        database = enc.decrypt(connection.database_encrypted)
        username = enc.decrypt(connection.username_encrypted)
        password = enc.decrypt(connection.password_encrypted)

        creds = {
            "host": host,
            "port": connection.port,
            "database": database,
            "username": username,
            "password": password,
        }
        await cache.set_json(cache_key, creds, ttl=600)
        return creds

    async def stream_agent_response(
        self,
        conversation_id: UUID,
        question: str,
        connection_id: UUID,
        company_id: UUID,
        user_api_key: str | None = None,
    ):

        try:

            creds = await self.get_connection_credentials(connection_id)


            initial_state = {
                "question": question,
                "company_id": str(company_id),
                "connection_id": str(connection_id),
                "user_api_key": user_api_key,
                "db_host": creds["host"],
                "db_port": creds["port"],
                "db_name": creds["database"],
                "db_user": creds["username"],
                "db_password": creds["password"],
                "agent_messages": [],
                "retry_count": 0,
            }


            graph = build_graph()
            

            async for event in graph.astream_events(
                initial_state, version="v1"
            ):
                kind = event["event"]
                

                if kind.endswith("_start"):
                    yield json.dumps({"type": "ping"})


                if kind == "on_chain_end":
                    node_name = event.get("name")
                    data = event["data"].get("output")
                    
                    if isinstance(data, dict) and node_name in [
                        "query_planner", "sql_writer", "sql_executor", 
                        "visualization", "insight", "supervisor"
                    ]:
                        msgs = data.get("agent_messages", [])
                        if msgs:
                            last_msg = msgs[-1]
                            if last_msg["agent"] == node_name:
                                yield json.dumps({
                                    "type": "thought",
                                    "agent": node_name,
                                    "content": last_msg["content"],
                                    "msg_type": last_msg["type"]
                                })


                if kind == "on_chain_end" and event.get("name") == "LangGraph":
                    final_state = event["data"].get("output", {})
                    

                    if "response_builder" in final_state:
                        final_state = final_state["response_builder"]
                    elif "supervisor" in final_state:
                        final_state = final_state["supervisor"]
                    
                    if final_state:
                         yield json.dumps({
                            "type": "result", 
                            "content": final_state.get("final_response"),
                            "sql_query": final_state.get("sql_query"),
                            "query_results": final_state.get("query_results"),
                            "chart_config": final_state.get("chart_config"),
                            "insights": final_state.get("insights")
                         })

        except Exception as e:
            yield json.dumps({"type": "error", "content": str(e)})

