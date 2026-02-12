"""
Shared agent state that flows through the LangGraph pipeline.

Every node reads from and writes to this TypedDict.
The `agent_messages` list is the reasoning trace streamed to the user.
"""

from __future__ import annotations

from typing import TypedDict, Any, Literal


class AgentMessage(TypedDict):
    """A single reasoning / status message emitted by an agent node."""
    agent: str          # e.g. "query_planner", "sql_writer"
    type: str           # "thinking" | "result" | "error"
    content: str        # human-readable description


class ChartConfig(TypedDict, total=False):
    """Chart configuration produced by the Visualization agent."""
    chart_type: str                    # "bar" | "line" | "pie" | "area" | "table"
    title: str
    x_axis: str
    y_axis: str
    x_label: str
    y_label: str
    datasets: list[dict[str, Any]]     # [{label, data, ...}]
    labels: list[str]


class AgentState(TypedDict, total=False):
    """
    The shared state passed between all agent nodes.

    `total=False` means every key is optional so nodes only need to
    populate the fields they care about.
    """

    # ── Input ────────────────────────────────────────────────────
    question: str               # the user's natural-language question
    company_id: str             # tenant isolation
    connection_id: str          # which DB connection to use

    # ── Schema context (set by Query Planner) ────────────────────
    schema_info: dict[str, Any]           # full schema dump
    relevant_tables: list[dict[str, Any]] # subset relevant to the question

    # ── SQL (set by SQL Writer / Executor) ───────────────────────
    sql_query: str
    query_results: dict[str, Any]  # { columns, rows, row_count }

    # ── Output (set by Visualization / Insight) ──────────────────
    chart_config: ChartConfig | None
    insights: str                  # markdown explanation

    # ── Control flow ─────────────────────────────────────────────
    error: str | None
    retry_count: int
    next_agent: str                # supervisor routing decision
    final_response: str            # assembled answer

    # ── Observability ────────────────────────────────────────────
    agent_messages: list[AgentMessage]

    # ── DB credentials (decrypted, never persisted) ──────────────
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
