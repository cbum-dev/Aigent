

from app.agents.state import AgentState, AgentMessage
from app.agents.llm import get_llm
from app.services.connection_manager import ConnectionManager
from langchain_core.messages import SystemMessage, HumanMessage


async def query_planner_node(state: AgentState) -> dict:

    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    messages.append({
        "agent": "query_planner",
        "type": "thinking",
        "content": "Fetching database schema...",
    })


    try:
        schema_info = await ConnectionManager.get_schema_info(
            host=state["db_host"],
            port=state["db_port"],
            database=state["db_name"],
            username=state["db_user"],
            password=state["db_password"],
        )
    except Exception as e:
        messages.append({
            "agent": "query_planner",
            "type": "error",
            "content": f"Failed to fetch schema: {e}",
        })
        return {
            "error": f"Schema fetch failed: {e}",
            "agent_messages": messages,
        }

    if not schema_info.get("tables"):
        messages.append({
            "agent": "query_planner",
            "type": "error",
            "content": "No tables found in the database.",
        })
        return {
            "schema_info": schema_info,
            "error": "No tables found in the database.",
            "agent_messages": messages,
        }

    messages.append({
        "agent": "query_planner",
        "type": "thinking",
        "content": f"Found {len(schema_info['tables'])} tables. Identifying relevant ones...",
    })


    schema_text_parts: list[str] = []
    for table in schema_info["tables"]:
        col_parts = []
        for c in table["columns"]:
            col_info = f"{c['name']} ({c['type']})"
            if c.get("sample_values"):
                samples = ", ".join(f"'{v}'" for v in c["sample_values"])
                col_info += f" [samples: {samples}]"
            col_parts.append(col_info)
        
        cols = ", ".join(col_parts)
        schema_text_parts.append(f"  {table['full_name']}: {cols}")
    schema_text = "\n".join(schema_text_parts)


    llm = get_llm(temperature=0.0, api_key=state.get("user_api_key"))

    system_prompt = (
        "You are a database analyst. Given a database schema and a user question, "
        "identify the tables and columns that are relevant to answering the question.\n\n"
        "Return your answer as a structured list of relevant tables with the specific "
        "columns needed. For each table, explain briefly WHY it is relevant.\n\n"
        "Format your response EXACTLY like this:\n"
        "RELEVANT TABLES:\n"
        "- table_name: column1, column2, column3 | Reason: <why this table is needed>\n"
        "- table_name2: column1, column2 | Reason: <why this table is needed>\n\n"
        "If you need JOINs, mention which columns to join on.\n"
        "JOIN HINTS:\n"
        "- table1.col = table2.col"
    )

    human_prompt = (
        f"DATABASE SCHEMA:\n{schema_text}\n\n"
        f"USER QUESTION: {state['question']}\n\n"
        "Which tables and columns are relevant?"
    )

    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt),
    ])


    relevant_tables: list[dict] = []
    response_text = response.content

    for table in schema_info["tables"]:
        table_name = table["name"]
        if table_name.lower() in response_text.lower():

            relevant_cols = []
            for col in table["columns"]:
                if col["name"].lower() in response_text.lower():
                    relevant_cols.append(col)


            if not relevant_cols:
                relevant_cols = table["columns"]

            relevant_tables.append({
                "name": table_name,
                "schema": table["schema"],
                "full_name": table["full_name"],
                "columns": relevant_cols,
            })


    if not relevant_tables:
        relevant_tables = schema_info["tables"]

    messages.append({
        "agent": "query_planner",
        "type": "result",
        "content": (
            f"Identified {len(relevant_tables)} relevant table(s): "
            + ", ".join(t["name"] for t in relevant_tables)
        ),
    })

    return {
        "schema_info": schema_info,
        "relevant_tables": relevant_tables,
        "agent_messages": messages,
    }
