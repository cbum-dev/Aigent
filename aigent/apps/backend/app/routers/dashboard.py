"""
Dashboard Router — auto-generates analytics metrics from a database connection.

Returns a structured payload of widgets (stat cards, charts, tables)
computed from the connected database's schema and data.
"""

import asyncio
import logging
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.dependencies import DbSession, CurrentUser
from app.models.database_connection import DatabaseConnection
from app.services.encryption import get_encryption_service
from app.services.connection_manager import ConnectionManager
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
    widget_type: str          # "stat", "bar", "pie", "table"
    data: list[dict] | None = None
    config: dict | None = None
    stat: StatCard | None = None


class DashboardPayload(BaseModel):
    connection_id: str
    connection_name: str
    overview: list[StatCard]
    widgets: list[Widget]


# ── Endpoint ────────────────────────────────────────────────────

@router.get("/{connection_id}/dashboard", response_model=DashboardPayload)
async def get_dashboard_metrics(
    connection_id: str,
    current_user: CurrentUser,
    db: DbSession,
):
    """Auto-generate analytics dashboard for a database connection."""

    # Check cache first
    cache_key = f"dashboard:{connection_id}"
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found",
        )

    host = encryption.decrypt(conn.host_encrypted)
    database = encryption.decrypt(conn.database_encrypted)
    username = encryption.decrypt(conn.username_encrypted)
    password = encryption.decrypt(conn.password_encrypted)

    creds = dict(host=host, port=conn.port, database=database,
                 username=username, password=password)

    # ── 1. Fetch schema ─────────────────────────────────────────
    try:
        schema_info = await ConnectionManager.get_schema_info(**creds)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch schema: {e}",
        )

    tables = schema_info.get("tables", [])
    if not tables:
        # Return an empty, but valid payload
        payload = DashboardPayload(
            connection_id=connection_id,
            connection_name=conn.name,
            overview=[StatCard(label="Tables", value=0)],
            widgets=[],
        )
        return payload

    total_columns = sum(len(t.get("columns", [])) for t in tables)

    # ── 2. Run analytics queries in parallel ────────────────────
    # 2a. Row counts per table
    row_count_queries = []
    for t in tables:
        full_name = f"\"{t['schema']}\".\"{t['name']}\""
        row_count_queries.append(
            _safe_query(creds, f"SELECT COUNT(*) AS cnt FROM {full_name}")
        )

    row_counts_raw = await asyncio.gather(*row_count_queries)

    row_count_data: list[dict] = []
    total_rows = 0
    for t, result in zip(tables, row_counts_raw):
        cnt = result[0]["cnt"] if result else 0
        total_rows += cnt
        row_count_data.append({"table_name": t["name"], "row_count": cnt})

    # Sort descending by count
    row_count_data.sort(key=lambda x: x["row_count"], reverse=True)

    # 2b. Column type distribution
    type_counts: dict[str, int] = {}
    for t in tables:
        for col in t.get("columns", []):
            dtype = _classify_type(col.get("type", ""))
            type_counts[dtype] = type_counts.get(dtype, 0) + 1

    type_dist_data = [{"type": k, "count": v} for k, v in
                      sorted(type_counts.items(), key=lambda x: -x[1])]

    # 2c. Numeric stats for top 3 tables (by row count)
    numeric_widgets: list[Widget] = []
    top_tables = [t for t in row_count_data if t["row_count"] > 0][:3]

    numeric_stat_tasks = []
    numeric_stat_table_info: list[tuple[str, str, str]] = []
    for entry in top_tables:
        table_name = entry["table_name"]
        table_info = next((t for t in tables if t["name"] == table_name), None)
        if not table_info:
            continue
        numeric_cols = [c["name"] for c in table_info.get("columns", [])
                        if _classify_type(c.get("type", "")) == "Numeric"]
        if not numeric_cols:
            continue
        # Build stats query
        full_name = f"\"{table_info['schema']}\".\"{table_name}\""
        agg_parts = []
        for c in numeric_cols[:5]:  # limit to 5 cols
            agg_parts.append(
                f"MIN(\"{c}\") AS \"{c}_min\", "
                f"MAX(\"{c}\") AS \"{c}_max\", "
                f"ROUND(AVG(\"{c}\")::numeric, 2) AS \"{c}_avg\""
            )
        query = f"SELECT {', '.join(agg_parts)} FROM {full_name}"
        numeric_stat_tasks.append(_safe_query(creds, query))
        numeric_stat_table_info.append((table_name, full_name, ",".join(numeric_cols[:5])))

    numeric_results = await asyncio.gather(*numeric_stat_tasks) if numeric_stat_tasks else []

    for (tbl_name, _, col_str), result in zip(numeric_stat_table_info, numeric_results):
        if not result:
            continue
        row = result[0]
        stats_data = []
        for col_name in col_str.split(","):
            col_name = col_name.strip()
            stats_data.append({
                "column": col_name,
                "min": row.get(f"{col_name}_min"),
                "max": row.get(f"{col_name}_max"),
                "avg": row.get(f"{col_name}_avg"),
            })
        if stats_data:
            numeric_widgets.append(Widget(
                id=f"stats_{tbl_name}",
                title=f"{tbl_name} — Numeric Stats",
                widget_type="table",
                data=stats_data,
                config={"columns": ["column", "min", "max", "avg"]},
            ))

    # 2d. Null percentage for columns in the largest table
    null_widgets: list[Widget] = []
    if top_tables:
        largest = top_tables[0]
        largest_info = next((t for t in tables if t["name"] == largest["table_name"]), None)
        if largest_info and largest["row_count"] > 0:
            full_name = f"\"{largest_info['schema']}\".\"{largest_info['name']}\""
            cols = [c["name"] for c in largest_info.get("columns", [])][:10]
            null_parts = [
                f"ROUND(100.0 * COUNT(*) FILTER (WHERE \"{c}\" IS NULL) / COUNT(*), 1) AS \"{c}\""
                for c in cols
            ]
            null_query = f"SELECT {', '.join(null_parts)} FROM {full_name}"
            null_result = await _safe_query(creds, null_query)
            if null_result:
                null_data = [{"column": c, "null_pct": null_result[0].get(c, 0)} for c in cols]
                null_widgets.append(Widget(
                    id=f"nulls_{largest['table_name']}",
                    title=f"{largest['table_name']} — Null %",
                    widget_type="bar",
                    data=null_data,
                    config={"x_key": "column", "y_key": "null_pct",
                            "y_label": "Null %", "color": "#ef4444"},
                ))

    # ── 3. Assemble payload ─────────────────────────────────────
    overview = [
        StatCard(label="Tables", value=len(tables), icon="table"),
        StatCard(label="Total Rows", value=_format_number(total_rows), icon="rows"),
        StatCard(label="Columns", value=total_columns, icon="columns"),
        StatCard(label="Database", value=database, icon="database"),
    ]

    widgets: list[Widget] = [
        Widget(
            id="row_counts",
            title="Row Count by Table",
            widget_type="bar",
            data=row_count_data,
            config={"x_key": "table_name", "y_key": "row_count",
                    "x_label": "Table", "y_label": "Rows"},
        ),
        Widget(
            id="column_types",
            title="Column Type Distribution",
            widget_type="pie",
            data=type_dist_data,
            config={"name_key": "type", "value_key": "count"},
        ),
    ]
    widgets.extend(numeric_widgets)
    widgets.extend(null_widgets)

    payload = DashboardPayload(
        connection_id=connection_id,
        connection_name=conn.name,
        overview=overview,
        widgets=widgets,
    )

    # Cache for 10 minutes
    await cache.set_json(cache_key, payload.model_dump(), ttl=600)
    return payload


# ── Helpers ─────────────────────────────────────────────────────

async def _safe_query(creds: dict, query: str) -> list[dict]:
    """Execute a query and return rows as dicts. Never raises."""
    try:
        result = await ConnectionManager.execute_query(**creds, query=query)
        return result.get("rows", [])
    except Exception as e:
        logger.warning("Dashboard query failed: %s | %s", query[:80], e)
        return []


def _classify_type(pg_type: str) -> str:
    """Classify a PostgreSQL type into a high-level category."""
    pg_type = pg_type.lower()
    if any(t in pg_type for t in ("int", "float", "double", "numeric", "decimal", "real", "serial")):
        return "Numeric"
    if any(t in pg_type for t in ("char", "text", "varchar", "citext")):
        return "Text"
    if any(t in pg_type for t in ("timestamp", "date", "time")):
        return "Date/Time"
    if "bool" in pg_type:
        return "Boolean"
    if any(t in pg_type for t in ("json", "jsonb")):
        return "JSON"
    if "uuid" in pg_type:
        return "UUID"
    return "Other"


def _format_number(n: int) -> str:
    """Format large numbers with K/M suffixes."""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)
