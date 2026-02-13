"""
Agent API Router — exposes the multi-agent pipeline over HTTP.

POST /agent/query — ask a question against a connected database.
GET  /agent/graph  — visualise the agent pipeline structure.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.database_connection import DatabaseConnection
from app.services.encryption import get_encryption_service
from app.agents.graph import build_graph


router = APIRouter(prefix="/agent", tags=["agent"])


# ── Schemas ──────────────────────────────────────────────────────

class AgentQueryRequest(BaseModel):
    question: str
    connection_id: str


class AgentMessageResponse(BaseModel):
    agent: str
    type: str
    content: str


class AgentQueryResponse(BaseModel):
    question: str
    sql_query: str | None = None
    query_results: dict | None = None
    chart_config: dict | None = None
    insights: str | None = None
    final_response: str | None = None
    agent_messages: list[AgentMessageResponse] = []
    error: str | None = None


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/query", response_model=AgentQueryResponse)
async def run_agent_query(
    request: AgentQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Run the multi-agent analytics pipeline.

    1. Validate the user has access to the connection.
    2. Decrypt credentials.
    3. Invoke the LangGraph pipeline.
    4. Return structured results.
    """

    # ── Fetch & authorise connection ──────────────────────────
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == request.connection_id,
            DatabaseConnection.company_id == current_user.company_id,
        )
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=404, detail="Database connection not found")

    # ── Decrypt credentials ──────────────────────────────────
    enc = get_encryption_service()

    try:
        db_host = enc.decrypt(connection.host_encrypted)
        db_name = enc.decrypt(connection.database_encrypted)
        db_user = enc.decrypt(connection.username_encrypted)
        db_password = enc.decrypt(connection.password_encrypted)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to decrypt database credentials",
        )

    # ── Build initial state ──────────────────────────────────
    initial_state = {
        "question": request.question,
        "company_id": str(current_user.company_id),
        "connection_id": request.connection_id,
        "db_host": db_host,
        "db_port": connection.port,
        "db_name": db_name,
        "db_user": db_user,
        "db_password": db_password,
        "agent_messages": [],
        "retry_count": 0,
    }

    # ── Run the graph ────────────────────────────────────────
    graph = build_graph()

    try:
        final_state = await graph.ainvoke(initial_state, {"recursion_limit": 50})
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent pipeline failed: {str(e)}",
        )

    # ── Return results ───────────────────────────────────────
    return AgentQueryResponse(
        question=request.question,
        sql_query=final_state.get("sql_query"),
        query_results=final_state.get("query_results"),
        chart_config=final_state.get("chart_config"),
        insights=final_state.get("insights"),
        final_response=final_state.get("final_response"),
        agent_messages=[
            AgentMessageResponse(**msg)
            for msg in final_state.get("agent_messages", [])
        ],
        error=final_state.get("error"),
    )


@router.get("/graph")
async def get_graph_info():
    """Return metadata about the agent pipeline for debugging."""
    return {
        "nodes": [
            "supervisor",
            "query_planner",
            "sql_writer",
            "sql_executor",
            "visualization",
            "insight",
            "response_builder",
        ],
        "edges": [
            {"from": "START", "to": "supervisor"},
            {"from": "supervisor", "to": "query_planner", "condition": "has question"},
            {"from": "supervisor", "to": "response_builder", "condition": "no question"},
            {"from": "query_planner", "to": "sql_writer"},
            {"from": "sql_writer", "to": "sql_executor"},
            {"from": "sql_executor", "to": "visualization", "condition": "success"},
            {"from": "sql_executor", "to": "sql_writer", "condition": "error + retry"},
            {"from": "sql_executor", "to": "response_builder", "condition": "fatal error"},
            {"from": "visualization", "to": "insight"},
            {"from": "insight", "to": "response_builder"},
            {"from": "response_builder", "to": "END"},
        ],
        "description": "Multi-agent analytics pipeline powered by LangGraph + Gemini",
    }
