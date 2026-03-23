

import json
from app.agents.state import AgentState, AgentMessage
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage


async def visualization_node(state: AgentState) -> dict:

    messages: list[AgentMessage] = list(state.get("agent_messages", []))

    query_results = state.get("query_results", {})
    rows = query_results.get("rows", [])
    columns = query_results.get("columns", [])

    if not rows:
        messages.append({
            "agent": "visualization",
            "type": "result",
            "content": "No data to visualize (empty result set).",
        })
        return {
            "chart_config": None,
            "agent_messages": messages,
        }

    messages.append({
        "agent": "visualization",
        "type": "thinking",
        "content": "Analyzing data for best visualization...",
    })


    sample_rows = rows[:10]
    data_preview = json.dumps({"columns": columns, "sample_rows": sample_rows}, default=str)


    llm = get_llm(temperature=0.0, api_key=state.get("user_api_key"))

    system_prompt = (
        "You are a data visualization expert. Given SQL query results, decide the best chart type "
        "and produce a chart configuration.\n\n"
        "AVAILABLE CHART TYPES: stat, bar, line, pie, area, table\n\n"
        "CHOICE LOGIC:\n"
        "- Choose 'stat' if the result is a single value (1 row, 1 column), like a total count or sum.\n"
        "- Choose 'pie' for proportion/distribution data (e.g. counts by status) with ≤ 8 categories.\n"
        "- Choose 'line' for time-series data with multiple data points.\n"
        "- Choose 'bar' for comparisons across categories.\n"
        "- Choose 'area' for cumulative trends over time.\n"
        "- Choose 'table' if there are many columns or the data doesn't fit a chart.\n\n"
        "Return ONLY valid JSON with this exact structure (no markdown):\n"
        "{\n"
        '  "chart_type": "stat|bar|line|pie|area|table",\n'
        '  "title": "descriptive chart title",\n'
        '  "x_axis": "column name for labels (ignored for stat)",\n'
        '  "y_axis": "column name for values",\n'
        '  "x_label": "human readable x-axis label",\n'
        '  "y_label": "human readable y-axis label (e.g. Total Revenue)"\n'
        "}"
    )

    human_prompt = (
        f"USER QUESTION: {state['question']}\n\n"
        f"SQL QUERY: {state.get('sql_query', 'N/A')}\n\n"
        f"QUERY RESULTS ({len(rows)} total rows):\n{data_preview}\n\n"
        "Produce the chart configuration:"
    )

    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt),
    ])


    response_text = response.content.strip()


    if response_text.startswith("```"):
        lines = response_text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines).strip()

    try:
        chart_config = json.loads(response_text)
    except json.JSONDecodeError:

        chart_config = {
            "chart_type": "table",
            "title": "Query Results",
            "x_axis": columns[0] if columns else "",
            "y_axis": columns[1] if len(columns) > 1 else "",
            "x_label": columns[0] if columns else "",
            "y_label": columns[1] if len(columns) > 1 else "",
        }


    chart_config["datasets"] = [{
        "label": chart_config.get("title", "Data"),
        "data": rows,
    }]
    chart_config["labels"] = columns

    messages.append({
        "agent": "visualization",
        "type": "result",
        "content": f"Recommended chart: {chart_config.get('chart_type', 'table')} — \"{chart_config.get('title', '')}\"",
    })

    return {
        "chart_config": chart_config,
        "agent_messages": messages,
    }
