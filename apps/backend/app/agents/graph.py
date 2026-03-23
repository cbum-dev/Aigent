

from langgraph.graph import StateGraph, END

from app.agents.state import AgentState
from app.agents.supervisor import (
    supervisor_node,
    route_after_supervisor,
    response_builder_node,
    route_after_executor,
    route_after_sql_writer,
)
from app.agents.query_planner import query_planner_node
from app.agents.sql_writer import sql_writer_node
from app.agents.sql_executor import sql_executor_node
from app.agents.visualization import visualization_node
from app.agents.insight import insight_node


def build_graph() -> StateGraph:

    graph = StateGraph(AgentState)


    graph.add_node("supervisor", supervisor_node)
    graph.add_node("query_planner", query_planner_node)
    graph.add_node("sql_writer", sql_writer_node)
    graph.add_node("sql_executor", sql_executor_node)
    graph.add_node("visualization", visualization_node)
    graph.add_node("insight", insight_node)
    graph.add_node("response_builder", response_builder_node)


    graph.set_entry_point("supervisor")

    graph.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "query_planner": "query_planner",
            "end": "response_builder",
        },
    )


    graph.add_edge("query_planner", "sql_writer")


    graph.add_conditional_edges(
        "sql_writer",
        route_after_sql_writer,
        {
            "sql_executor": "sql_executor",
            "response_builder": "response_builder",
        },
    )


    graph.add_conditional_edges(
        "sql_executor",
        route_after_executor,
        {
            "sql_writer": "sql_writer",      
            "visualization": "visualization",  
            "response_builder": "response_builder",  
        },
    )


    graph.add_edge("visualization", "insight")
    graph.add_edge("insight", "response_builder")
    graph.add_edge("response_builder", END)


    return graph.compile()
