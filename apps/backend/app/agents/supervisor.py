"""
Supervisor Agent — orchestrates the multi-agent pipeline.

Decides the next step, handles errors, and assembles the final
response once all agents have finished.
"""

from app.agents.state import AgentState, AgentMessage
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage


# ── Keywords / patterns that indicate a non-data question ──────
_CASUAL_PATTERNS = {
    "hi", "hello", "hey", "howdy", "hola", "good morning",
    "good evening", "good afternoon", "good night", "bye",
    "thank you", "thanks", "ok", "okay", "sure", "yes", "no",
    "what are you", "who are you", "what can you do",
    "help", "how are you",
}


def _is_casual_question(question: str) -> bool:
    """Fast heuristic check for greetings / non-data questions."""
    q = question.strip().lower().rstrip("?!.,")
    if q in _CASUAL_PATTERNS:
        return True
    # Very short messages that don't contain data-related words
    if len(q.split()) <= 3 and not any(
        kw in q for kw in (
            "table", "row", "column", "count", "sum", "avg",
            "select", "query", "data", "show", "list", "how many",
            "total", "max", "min", "group", "where", "filter",
            "user", "order", "report", "chart", "metric",
            "database", "schema", "record",
        )
    ):
        return True
    return False


_FRIENDLY_REPLY = (
    "Hey there! 👋 I'm your data analyst assistant. "
    "I can help you explore your connected database — just ask me "
    "things like:\n\n"
    "- *\"How many users signed up last month?\"*\n"
    "- *\"Show me the top 10 orders by revenue\"*\n"
    "- *\"What tables are in the database?\"*\n\n"
    "Go ahead and ask a question about your data!"
)


async def supervisor_node(state: AgentState) -> dict:
    """
    Entry point: validates input, classifies the question,
    and routes to the first agent or responds directly.
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

    # ── Fast-path: casual / non-data question ──────────────────
    if _is_casual_question(question):
        messages.append({
            "agent": "supervisor",
            "type": "result",
            "content": "This looks like a casual message, responding directly.",
        })
        return {
            "next_agent": "end",
            "final_response": _FRIENDLY_REPLY,
            "agent_messages": messages,
        }

    # ── Data question → proceed through pipeline ───────────────
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
