"""
LangGraph State Graph — wires all agent nodes together.

Graph structure:
  START → supervisor → query_planner → sql_writer → sql_executor
        → visualization → insight → response_builder → END

The supervisor can retry the sql_writer if execution fails.
"""

from langgraph.graph import StateGraph, END

from app.agents.state import AgentState
from app.agents.supervisor import (
    supervisor_node,
    route_after_supervisor,
    response_builder_node,
    route_after_executor,
)
from app.agents.query_planner import query_planner_node
from app.agents.sql_writer import sql_writer_node
from app.agents.sql_executor import sql_executor_node
from app.agents.visualization import visualization_node
from app.agents.insight import insight_node


def build_graph() -> StateGraph:
    """
    Assemble and compile the multi-agent graph.

    Returns a compiled LangGraph `CompiledGraph` that can be
    invoked with `graph.ainvoke(state)`.
    """
    graph = StateGraph(AgentState)

    # ── Register nodes ──────────────────────────────────────────
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("query_planner", query_planner_node)
    graph.add_node("sql_writer", sql_writer_node)
    graph.add_node("sql_executor", sql_executor_node)
    graph.add_node("visualization", visualization_node)
    graph.add_node("insight", insight_node)
    graph.add_node("response_builder", response_builder_node)

    # ── Wire edges ──────────────────────────────────────────────

    # Entry point
    graph.set_entry_point("supervisor")

    # Supervisor → conditional routing
    graph.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "query_planner": "query_planner",
            "end": "response_builder",
        },
    )

    # Linear pipeline: planner → writer → executor
    graph.add_edge("query_planner", "sql_writer")
    graph.add_edge("sql_writer", "sql_executor")

    # After executor: conditional (retry or proceed)
    graph.add_conditional_edges(
        "sql_executor",
        route_after_executor,
        {
            "sql_writer": "sql_writer",       # retry on error
            "visualization": "visualization",  # success
            "response_builder": "response_builder",  # fatal error
        },
    )

    # visualization → insight → response_builder → END
    graph.add_edge("visualization", "insight")
    graph.add_edge("insight", "response_builder")
    graph.add_edge("response_builder", END)

    # ── Compile ─────────────────────────────────────────────────
    return graph.compile()
