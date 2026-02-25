"""
Dashboard Router — AI-driven schema-aware analytics dashboard.

Flow:
  1. Fetch schema from the connected database
  2. Ask the LLM to analyze the schema and decide what is meaningful
  3. Execute the LLM-suggested SQL queries
  4. Return a structured payload of widgets tailored to THIS database
"""

import asyncio
import json
import logging
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from langchain_core.messages import SystemMessage, HumanMessage

from app.dependencies import DbSession, CurrentUser
from app.models.database_connection import DatabaseConnection
from app.services.encryption import get_encryption_service
from app.services.connection_manager import ConnectionManager
from app.agents.llm import get_llm
from app.services import cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connections", tags=["dashboard"])
encryption = get_encryption_service()


# ── Response models ─────────────────────────────────────────────

class StatCard(BaseModel):
    label: str
    value: str | int | float
    subtitle: str | None = None
    icon: str | None = None


class Widget(BaseModel):
    id: str
    title: str
    widget_type: str          # "stat", "bar", "line", "pie", "table"
    data: list[dict] | None = None
    config: dict | None = None
    stat: StatCard | None = None


class DashboardPayload(BaseModel):
    connection_id: str
    connection_name: str
    db_type: str              # "sales", "users", "finance", "general", etc.
    summary: str              # one-line LLM-written summary of the database
    overview: list[StatCard]
    widgets: list[Widget]


# ── Endpoint ────────────────────────────────────────────────────

@router.get("/{connection_id}/dashboard", response_model=DashboardPayload)
async def get_dashboard_metrics(
    connection_id: str,
    current_user: CurrentUser,
    db: DbSession,
    refresh: bool = False,
):
    """Auto-generate a schema-aware analytics dashboard for a database connection."""

    # Check cache (skip if refresh=True)
    cache_key = f"dashboard:{connection_id}"
    if not refresh:
        cached = await cache.get_json(cache_key)
        if cached is not None:
            return cached

    # Fetch and decrypt connection
    result = await db.execute(
        select(DatabaseConnection).where(
            DatabaseConnection.id == UUID(connection_id),
            DatabaseConnection.company_id == current_user.company_id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    host = encryption.decrypt(conn.host_encrypted)
    database = encryption.decrypt(conn.database_encrypted)
    username = encryption.decrypt(conn.username_encrypted)
    password = encryption.decrypt(conn.password_encrypted)
    creds = dict(host=host, port=conn.port, database=database, username=username, password=password)

    # ── 1. Fetch schema ─────────────────────────────────────────
    try:
        schema_info = await ConnectionManager.get_schema_info(**creds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {e}")

    tables = schema_info.get("tables", [])
    if not tables:
        return DashboardPayload(
            connection_id=connection_id,
            connection_name=conn.name,
            db_type="empty",
            summary="This database appears to be empty.",
            overview=[StatCard(label="Tables", value=0)],
            widgets=[],
        )

    # ── 2. Get row counts for all tables ────────────────────────
    row_counts_raw = await asyncio.gather(*[
        _safe_query(creds, f"SELECT COUNT(*) AS cnt FROM \"{t['schema']}\".\"{t['name']}\"")
        for t in tables
    ])
    table_rows: dict[str, int] = {}
    for t, res in zip(tables, row_counts_raw):
        table_rows[t["name"]] = res[0]["cnt"] if res else 0

    total_rows = sum(table_rows.values())

    # ── 3. Build compact schema summary for the LLM ─────────────
    schema_text = _build_schema_text(tables, table_rows)

    # ── 4. Ask the LLM to plan the dashboard ────────────────────
    plan = await _ask_llm_for_dashboard_plan(schema_text, conn.name)
    db_type = plan.get("db_type", "general")
    summary = plan.get("summary", f"Database: {database}")
    widget_plans: list[dict] = plan.get("widgets", [])

    # ── 5. Execute widget queries in parallel ────────────────────
    tasks = []
    valid_plans = []
    for wp in widget_plans:
        sql = wp.get("sql", "").strip()
        if sql:
            tasks.append(_safe_query(creds, sql))
            valid_plans.append(wp)

    results = await asyncio.gather(*tasks) if tasks else []

    # ── 6. Assemble widgets ──────────────────────────────────────
    widgets: list[Widget] = []
    for wp, rows in zip(valid_plans, results):
        if not rows:
            continue
        widget = Widget(
            id=wp.get("id", f"w_{len(widgets)}"),
            title=wp.get("title", "Untitled"),
            widget_type=wp.get("type", "table"),
            data=rows,
            config=wp.get("config", {}),
        )
        widgets.append(widget)

    # ── 7. Build overview stat cards ─────────────────────────────
    overview_cards = plan.get("overview_stats", [])
    overview_tasks = []
    valid_overview = []
    for oc in overview_cards:
        sql = oc.get("sql", "").strip()
        if sql:
            overview_tasks.append(_safe_query(creds, sql))
            valid_overview.append(oc)

    overview_results = await asyncio.gather(*overview_tasks) if overview_tasks else []

    overview: list[StatCard] = []
    for oc, rows in zip(valid_overview, overview_results):
        if rows:
            raw_val = list(rows[0].values())[0] if rows[0] else None
            val = _format_value(raw_val)
        else:
            val = "N/A"
        overview.append(StatCard(
            label=oc.get("label", "Metric"),
            value=val,
            subtitle=oc.get("subtitle"),
            icon=oc.get("icon", "database"),
        ))

    # Fallback overview if LLM returned none
    if not overview:
        overview = [
            StatCard(label="Tables", value=len(tables), icon="table"),
            StatCard(label="Total Rows", value=_format_number(total_rows), icon="rows"),
        ]

    payload = DashboardPayload(
        connection_id=connection_id,
        connection_name=conn.name,
        db_type=db_type,
        summary=summary,
        overview=overview,
        widgets=widgets,
    )

    await cache.set_json(cache_key, payload.model_dump(), ttl=600)
    return payload


# ── LLM Dashboard Planner ────────────────────────────────────────

async def _ask_llm_for_dashboard_plan(schema_text: str, db_name: str) -> dict:
    """
    Ask the LLM to analyze the schema and return a JSON plan for the dashboard.
    The plan includes: db_type, summary, overview_stats (with SQL), widgets (with SQL).
    """
    llm = get_llm(temperature=0.0)

    system_prompt = """You are a data analytics expert. Given a database schema, you will design a meaningful, context-specific analytics dashboard.

Your job:
1. Classify the database type (e.g., "sales", "users", "inventory", "finance", "healthcare", "ecommerce", "blog", "general")
2. Write a ONE sentence summary of what this database is about
3. Plan 2-4 overview stat cards (key single metrics with SQL queries)
4. Plan 4-8 dashboard widgets (charts and tables) using meaningful SQL queries

RULES:
- ONLY use SELECT statements. Never DDL or DML.
- Return raw numeric values, NO formatting in SQL (no TO_CHAR, no currency symbols).
- Use actual column and table names from the schema.
- Make the dashboard SPECIFIC to this database's domain. 
  - Sales DB → revenue, top products, orders by status, monthly trends
  - Users DB → user count, age distribution, signup trend, top cities
  - Finance DB → account balances, transaction volume, income vs expense
  - Blog DB → post count, views, top authors, posts per category
  - Inventory DB → stock levels, low stock items, top categories
  - General DB → row counts, data completeness
- ALWAYS include LIMIT clauses (max 50 rows per widget)
- Widget types: "bar", "pie", "line", "table"
- For bar and line charts: config must have "x_key" and "y_key"
- For pie charts: config must have "name_key" and "value_key"
- For tables: config can have "columns" array

Return ONLY valid JSON, no markdown, no explanation:
{
  "db_type": "sales",
  "summary": "E-commerce platform with orders, products, and customer data",
  "overview_stats": [
    {
      "label": "Total Revenue",
      "sql": "SELECT SUM(total_amount) FROM orders WHERE status = 'completed'",
      "icon": "dollar",
      "subtitle": "All-time completed orders"
    }
  ],
  "widgets": [
    {
      "id": "monthly_revenue",
      "title": "Monthly Revenue Trend",
      "type": "line",
      "sql": "SELECT DATE_TRUNC('month', order_date)::date AS month, SUM(total_amount) AS revenue FROM orders WHERE status = 'completed' GROUP BY 1 ORDER BY 1 DESC LIMIT 12",
      "config": {"x_key": "month", "y_key": "revenue", "x_label": "Month", "y_label": "Revenue ($)"}
    }
  ]
}"""

    human_prompt = f"""DATABASE NAME: {db_name}

SCHEMA:
{schema_text}

Design a smart, context-specific dashboard for this database."""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt),
        ])
        text = response.content.strip()
        # Strip markdown fences if any
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()
        return json.loads(text)
    except Exception as e:
        logger.warning("LLM dashboard plan failed: %s", e)
        return {
            "db_type": "general",
            "summary": f"Database: {db_name}",
            "overview_stats": [],
            "widgets": [],
        }


# ── Helpers ─────────────────────────────────────────────────────

def _build_schema_text(tables: list[dict], row_counts: dict[str, int]) -> str:
    """Build a compact schema description with row counts."""
    parts = []
    for t in tables:
        cols = ", ".join(
            f"{c['name']} ({c['type']})" for c in t.get("columns", [])
        )
        rows = row_counts.get(t["name"], 0)
        parts.append(f"  {t['full_name']} ({rows:,} rows): {cols}")
    return "\n".join(parts)


async def _safe_query(creds: dict, query: str) -> list[dict]:
    """Execute a query and return rows as dicts. Never raises."""
    try:
        result = await ConnectionManager.execute_query(**creds, query=query)
        return result.get("rows", [])
    except Exception as e:
        logger.warning("Dashboard query failed: %s | %s", query[:80], e)
        return []


def _format_value(val) -> str:
    """Smart-format a scalar value."""
    if val is None:
        return "N/A"
    if isinstance(val, float):
        if val >= 1_000_000:
            return f"${val / 1_000_000:.1f}M"
        if val >= 1_000:
            return f"${val / 1_000:.1f}K"
        return f"${val:,.2f}"
    if isinstance(val, int):
        if val >= 1_000_000:
            return f"{val / 1_000_000:.1f}M"
        if val >= 1_000:
            return f"{val / 1_000:.1f}K"
        return str(val)
    return str(val)


def _format_number(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)
