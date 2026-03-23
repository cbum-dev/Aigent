

from app.agents.state import AgentState, AgentMessage
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage


async def sql_writer_node(state: AgentState) -> dict:

    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    messages.append({
        "agent": "sql_writer",
        "type": "thinking",
        "content": "Generating SQL query...",
    })


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
        col_parts = []
        for c in table["columns"]:
            col_info = f"{c['name']} ({c['type']})"
            if c.get("sample_values"):
                samples = ", ".join(f"'{v}'" for v in c["sample_values"])
                col_info += f" [samples: {samples}]"
            col_parts.append(col_info)
        
        cols = ", ".join(col_parts)
        schema_parts.append(f"Table: {table['full_name']}\n  Columns: {cols}")
    schema_context = "\n\n".join(schema_parts)


    llm = get_llm(temperature=0.0, api_key=state.get("user_api_key"))

    system_prompt = (
        "You are an expert PostgreSQL developer. Generate a single SELECT SQL query "
        "to answer the user's question.\n"
        "DATABASE SCHEMA:\n"
        f"{schema_context}\n\n"
        "STRICT RULES:\n"
        "1. Write ONLY SELECT statements. Never write DDL or DML.\n"
        "2. Use the exact table and column names from the schema.\n"
        "3. **CRITICAL: DO NOT FORMAT DATA.** Never use TO_CHAR(), currency symbols ($), or percentage signs in the SQL. "
        "Return raw numeric and date values. Formatting will be handled by the UI.\n"
        "4. Always qualify columns with table names (e.g. orders.total_amount) when using JOINs or if ambiguous.\n"
        "5. Use appropriate aggregations (SUM, COUNT, AVG, etc.). When calculating **revenue**, prioritize filters like `status = 'completed'` or `status = 'paid'` if those columns exist.\n"
        "6. If the question asks for 'last month', calculate it relative to CURRENT_DATE using: "
        "order_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') "
        "AND order_date < date_trunc('month', CURRENT_DATE)\n"
        "7. LIMIT results to 1000 rows.\n"
        "8. **ROBUST SEARCHING:** When filtering by text entities (like product names, categories, etc.):\n"
        "   - Use `ILIKE` for case-insensitive partial matches if the exact value is uncertain.\n"
        "   - Example: `WHERE name ILIKE '%denim%'` instead of `WHERE category = 'denim'` if denim is part of the name but not the primary category.\n"
        "   - Use `OR` to search across multiple likely columns (e.g. `WHERE name ILIKE '%denim%' OR category ILIKE '%denim%'`).\n"
        "   - Refer to the provided [samples: ...] in the schema to see actual data formats.\n"
        "Return ONLY the SQL query — no markdown, no comments, no explanations."
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


    if sql_query.startswith("```"):
        lines = sql_query.split("\n")

        lines = [l for l in lines if not l.strip().startswith("```")]
        sql_query = "\n".join(lines).strip()


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
