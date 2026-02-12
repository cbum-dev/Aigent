"""
SQL Writer Agent — generates a safe, read-only SQL query.

Uses the relevant tables identified by the Query Planner and the
user's question to produce a PostgreSQL SELECT statement.
"""

from app.agents.state import AgentState, AgentMessage
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage


async def sql_writer_node(state: AgentState) -> dict:
    """
    Generate a read-only SQL query from the user question + relevant tables.
    """
    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    messages.append({
        "agent": "sql_writer",
        "type": "thinking",
        "content": "Generating SQL query...",
    })

    # ── Build schema context for the LLM ────────────────────────
    relevant_tables = state.get("relevant_tables", [])
    if not relevant_tables:
        messages.append({
            "agent": "sql_writer",
            "type": "error",
            "content": "No relevant tables identified.",
        })
        return {
            "error": "No relevant tables to query.",
            "agent_messages": messages,
        }

    schema_parts: list[str] = []
    for table in relevant_tables:
        cols = ", ".join(
            f"{c['name']} ({c['type']})" for c in table["columns"]
        )
        schema_parts.append(f"Table: {table['full_name']}\n  Columns: {cols}")
    schema_context = "\n\n".join(schema_parts)

    # ── Ask the LLM to write SQL ────────────────────────────────
    llm = get_llm(temperature=0.0)

    system_prompt = (
        "You are an expert PostgreSQL developer. Generate a single SQL query "
        "to answer the user's question.\n\n"
        "RULES:\n"
        "1. Write ONLY SELECT statements. Never write INSERT, UPDATE, DELETE, DROP, ALTER, or any DDL.\n"
        "2. Use the exact table and column names from the schema provided.\n"
        "3. Always qualify columns with table names when using JOINs.\n"
        "4. Use appropriate aggregations (SUM, COUNT, AVG, etc.) when the question implies them.\n"
        "5. Add ORDER BY when relevant for clarity.\n"
        "6. LIMIT results to 1000 rows maximum.\n"
        "7. Use standard PostgreSQL syntax.\n\n"
        "Return ONLY the SQL query — no explanations, no markdown fences, no comments."
    )

    human_prompt = (
        f"SCHEMA:\n{schema_context}\n\n"
        f"QUESTION: {state['question']}\n\n"
        "Write the SQL query:"
    )

    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt),
    ])

    sql_query = response.content.strip()

    # ── Strip markdown fences if present ─────────────────────────
    if sql_query.startswith("```"):
        lines = sql_query.split("\n")
        # Remove first and last lines (```sql and ```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        sql_query = "\n".join(lines).strip()

    # ── Safety check: reject non-SELECT queries ──────────────────
    first_word = sql_query.split()[0].upper() if sql_query.split() else ""
    if first_word not in ("SELECT", "WITH"):
        messages.append({
            "agent": "sql_writer",
            "type": "error",
            "content": f"Unsafe query rejected (starts with {first_word}).",
        })
        return {
            "error": f"Generated query is not a SELECT statement.",
            "agent_messages": messages,
        }

    messages.append({
        "agent": "sql_writer",
        "type": "result",
        "content": f"Generated SQL:\n{sql_query}",
    })

    return {
        "sql_query": sql_query,
        "agent_messages": messages,
    }
