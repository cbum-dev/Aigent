"""
Shared agent state that flows through the LangGraph pipeline.

Every node reads from and writes to this TypedDict.
The `agent_messages` list is the reasoning trace streamed to the user.
"""

from __future__ import annotations

from typing import TypedDict, Any, Literal


class AgentMessage(TypedDict):
    """A single reasoning / status message emitted by an agent node."""
    agent: str          
    type: str           
    content: str        


class ChartConfig(TypedDict, total=False):
    """Chart configuration produced by the Visualization agent."""
    chart_type: str                    
    title: str
    x_axis: str
    y_axis: str
    x_label: str
    y_label: str
    datasets: list[dict[str, Any]]     
    labels: list[str]


class AgentState(TypedDict, total=False):
    """
    The shared state passed between all agent nodes.

    `total=False` means every key is optional so nodes only need to
    populate the fields they care about.
    """


    question: str               
    company_id: str             
    connection_id: str          
    user_api_key: str | None    


    schema_info: dict[str, Any]           
    relevant_tables: list[dict[str, Any]] 


    sql_query: str
    query_results: dict[str, Any]  


    chart_config: ChartConfig | None
    insights: str                  


    error: str | None
    retry_count: int
    next_agent: str                
    final_response: str            


    agent_messages: list[AgentMessage]


    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
