"""
Chat Service — handles message persistence and agent streaming.

Manages database interaction for conversation history and invokes
the LangGraph pipeline, yielding events for the WebSocket.
"""

import json
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.conversation import Conversation, Message, MessageRole
from app.models.database_connection import DatabaseConnection
from app.services.encryption import get_encryption_service
from app.agents.graph import build_graph


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
        """Persist a new message to the database."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            message_metadata=metadata,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_conversation(
        self, conversation_id: UUID, user_id: UUID
    ) -> Conversation | None:
        """Evaluate if the user has access to this conversation."""
        result = await self.db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_connection_credentials(self, connection_id: UUID) -> dict:
        """Retrieve and decrypt connection credentials."""
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

        return {
            "host": host,
            "port": connection.port,
            "database": database,
            "username": username,
            "password": password,
        }

    async def stream_agent_response(
        self,
        conversation_id: UUID,
        question: str,
        connection_id: UUID,
        company_id: UUID,
    ):
        """
        Generator that runs the agent pipeline and yields events.

        Yields JSON strings:
        - {"type": "ping"}
        - {"type": "thought", "agent": "...", "content": "..."}
        - {"type": "result", "content": "...", "data": ...}
        - {"type": "error", "content": "..."}
        """
        try:
            # 1. Get credentials
            creds = await self.get_connection_credentials(connection_id)

            # 2. Build initial state
            initial_state = {
                "question": question,
                "company_id": str(company_id),
                "connection_id": str(connection_id),
                "db_host": creds["host"],
                "db_port": creds["port"],
                "db_name": creds["database"],
                "db_user": creds["username"],
                "db_password": creds["password"],
                "agent_messages": [],
                "retry_count": 0,
            }

            # 3. Run graph with event streaming
            graph = build_graph()
            
            # We use astream_events to catch node updates
            async for event in graph.astream_events(
                initial_state, version="v1"
            ):
                kind = event["event"]
                
                # Filter for node completion events that update state
                # Specifically looking for "on_chain_end" where the output is a dict with 'agent_messages'
                if kind == "on_chain_end":
                    data = event["data"].get("output")
                    if isinstance(data, dict):
                        # Use the new agent_messages to stream updates
                        # But we only want to stream *new* messages. 
                        # Since we can't easily track delta here without state,
                        # we rely on the specific agent node outputs which usually return just their own update
                        # OR create specific events inside the nodes.
                        
                        # Better approach: Check event name against known nodes
                        node_name = event.get("name")
                        
                        if node_name in [
                            "query_planner", "sql_writer", "sql_executor", 
                            "visualization", "insight", "supervisor"
                        ]:
                            # Send a specific event for this node
                            # Extract content from AgentMessage if present
                            msgs = data.get("agent_messages", [])
                            if msgs:
                                last_msg = msgs[-1]
                                # Ensure the message actually belongs to this agent
                                if last_msg["agent"] == node_name:
                                    yield json.dumps({
                                        "type": "thought",
                                        "agent": node_name,
                                        "content": last_msg["content"],
                                        "msg_type": last_msg["type"]
                                    })

                # Also yield the final output
                if kind == "on_chain_end" and event.get("name") == "LangGraph":
                    final_state = event["data"].get("output", {})
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

