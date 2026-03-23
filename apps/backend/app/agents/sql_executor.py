

from app.agents.state import AgentState, AgentMessage
from app.services.connection_manager import ConnectionManager


async def sql_executor_node(state: AgentState) -> dict:

    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    sql_query = state.get("sql_query", "")
    if not sql_query:
        messages.append({
            "agent": "sql_executor",
            "type": "error",
            "content": "No SQL query to execute.",
        })
        return {
            "error": "No SQL query provided.",
            "agent_messages": messages,
        }

    messages.append({
        "agent": "sql_executor",
        "type": "thinking",
        "content": "Executing query against database...",
    })

    try:
        results = await ConnectionManager.execute_query(
            host=state["db_host"],
            port=state["db_port"],
            database=state["db_name"],
            username=state["db_user"],
            password=state["db_password"],
            query=sql_query,
        )
    except Exception as e:
        error_msg = str(e)
        messages.append({
            "agent": "sql_executor",
            "type": "error",
            "content": f"Query execution failed: {error_msg}",
        })
        return {
            "error": f"Query execution failed: {error_msg}",
            "retry_count": state.get("retry_count", 0) + 1,
            "agent_messages": messages,
        }

    row_count = results.get("row_count", 0)
    col_count = len(results.get("columns", []))

    messages.append({
        "agent": "sql_executor",
        "type": "result",
        "content": f"Query returned {row_count} rows and {col_count} columns.",
    })

    return {
        "query_results": results,
        "error": None,
        "agent_messages": messages,
    }
