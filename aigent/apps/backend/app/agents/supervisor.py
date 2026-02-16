"""
Supervisor Agent — orchestrates the multi-agent pipeline.

Decides the next step, handles errors, and assembles the final
response once all agents have finished.
"""

from app.agents.state import AgentState, AgentMessage


async def supervisor_node(state: AgentState) -> dict:
    """
    Entry point: validates input, initialises state, routes to the
    first agent (query_planner).
    """
    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    question = state.get("question", "")
    if not question:
        return {
            "error": "No question provided.",
            "final_response": "Please provide a question to analyze.",
            "next_agent": "end",
            "agent_messages": messages,
        }

    messages.append({
        "agent": "supervisor",
        "type": "thinking",
        "content": f"Received question: \"{question}\"",
    })

    return {
        "retry_count": 0,
        "error": None,
        "next_agent": "query_planner",
        "agent_messages": messages,
    }


def route_after_supervisor(state: AgentState) -> str:
    """Conditional edge: where should the graph go after the supervisor?"""
    return state.get("next_agent", "query_planner")


async def response_builder_node(state: AgentState) -> dict:
    """
    Final node: assembles the complete response from all agent outputs.
    """
    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    error = state.get("error")
    if error:
        messages.append({
            "agent": "supervisor",
            "type": "error",
            "content": f"Pipeline error: {error}",
        })
        return {
            "final_response": f"I encountered an issue: {error}",
            "agent_messages": messages,
        }

    messages.append({
        "agent": "supervisor",
        "type": "result",
        "content": "Analysis complete. Assembling response.",
    })

    # Build a structured final response
    parts: list[str] = []

    insights = state.get("insights")
    if insights:
        parts.append(insights)

    sql_query = state.get("sql_query")
    if sql_query:
        parts.append(f"\n**SQL Query Used:**\n```sql\n{sql_query}\n```")

    final_response = "\n\n".join(parts) if parts else "Analysis complete."

    return {
        "final_response": final_response,
        "agent_messages": messages,
        "sql_query": sql_query,
        "query_results": state.get("query_results"),
        "chart_config": state.get("chart_config"),
        "insights": insights,
    }


def route_after_sql_writer(state: AgentState) -> str:
    """
    After SQL writer: if there was an error (e.g. no relevant tables,
    unsafe query), skip the executor and go straight to response_builder.
    """
    error = state.get("error")
    sql_query = state.get("sql_query")

    if error or not sql_query:
        return "response_builder"

    return "sql_executor"


def route_after_executor(state: AgentState) -> str:
    """
    After SQL execution: if there was an error and we haven't
    retried too many times, go back to the SQL writer.
    Otherwise proceed to visualization.
    """
    error = state.get("error")
    retry_count = state.get("retry_count", 0)

    if error and retry_count < 2:
        return "sql_writer"  # retry with the error context

    if error:
        return "response_builder"  # give up, return the error

    return "visualization"
