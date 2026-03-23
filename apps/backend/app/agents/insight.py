

import json
from app.agents.state import AgentState, AgentMessage
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage


async def insight_node(state: AgentState) -> dict:

    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    query_results = state.get("query_results", {})
    rows = query_results.get("rows", [])
    columns = query_results.get("columns", [])

    if not rows:
        summary = "The query returned no results. Please refine your question or check that the database has data."
        messages.append({
            "agent": "insight",
            "type": "result",
            "content": summary,
        })
        return {
            "insights": summary,
            "agent_messages": messages,
        }

    messages.append({
        "agent": "insight",
        "type": "thinking",
        "content": "Analyzing results to generate insights...",
    })


    sample_rows = rows[:20]
    data_preview = json.dumps(
        {"columns": columns, "sample_rows": sample_rows, "total_rows": len(rows)},
        default=str,
    )


    llm = get_llm(temperature=0.3, api_key=state.get("user_api_key"))  

    system_prompt = (
        "You are a business analyst. Given query results, provide a clear, "
        "insightful analysis in markdown format.\n\n"
        "IF NO RESULTS OR NULLS ARE FOUND:\n"
        "- Explain that no data matched the criteria.\n"
        "- Suggest potential reasons (e.g., 'no orders in this date range', 'filtered for completed orders but none are marked completed').\n"
        "- Suggest a simpler question to verify data exists.\n\n"
        "IF RESULTS EXIST:\n"
        "- Include a 1-2 sentence executive summary.\n"
        "- Key findings (bullet points) with numbers.\n"
        "- Notable trends, patterns, or anomalies.\n"
        "- A brief recommendation.\n\n"
        "RULES:\n"
        "- Be concise and actionable.\n"
        "- Write for a business audience, not a technical one.\n"
        "- Always format currency and large numbers for readability in the markdown output."
    )

    chart_type = ""
    chart_config = state.get("chart_config")
    if chart_config:
        chart_type = chart_config.get("chart_type", "")

    human_prompt = (
        f"USER QUESTION: {state['question']}\n\n"
        f"SQL QUERY:\n{state.get('sql_query', 'N/A')}\n\n"
        f"CHART TYPE: {chart_type or 'none'}\n\n"
        f"QUERY RESULTS:\n{data_preview}\n\n"
        "Provide your analysis:"
    )

    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt),
    ])

    insights = response.content.strip()

    messages.append({
        "agent": "insight",
        "type": "result",
        "content": "Analysis complete.",
    })

    return {
        "insights": insights,
        "agent_messages": messages,
    }
