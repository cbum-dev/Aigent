"""
Dashboard Router — AI-enhanced but fundamentally deterministic analytics dashboard.

Strategy:
  1. Fetch schema + row counts (always works)
  2. Auto-detect DB domain from table/column names (pattern matching)
  3. Run domain-specific pre-defined queries
  4. Summarize with one LLM call for human-readable titles only
  5. Return clean, guaranteed-to-render widgets
"""

import asyncio
import json
import logging
import re
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
    widget_type: str           # "bar", "line", "pie", "table"
    data: list[dict] | None = None
    config: dict | None = None


class DashboardPayload(BaseModel):
    connection_id: str
    connection_name: str
    db_type: str
    summary: str
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
    cache_key = f"dashboard:{connection_id}"
    if not refresh:
        cached = await cache.get_json(cache_key)
        if cached is not None:
            return cached

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
            overview=[StatCard(label="Tables", value=0, icon="table")],
            widgets=[],
        )

    # ── 2. Row counts for all tables (deterministic) ─────────────
    row_counts_raw = await asyncio.gather(*[
        _safe_query(creds, f"SELECT COUNT(*) AS _cnt FROM {_quote(t['schema'], t['name'])}")
        for t in tables
    ])
    table_rows: dict[str, int] = {}
    for t, res in zip(tables, row_counts_raw):
        table_rows[t["name"]] = int(res[0]["_cnt"]) if res else 0

    total_rows = sum(table_rows.values())

    # ── 3. Detect DB domain by pattern matching ──────────────────
    all_names = " ".join(t["name"] for t in tables)
    all_col_names = " ".join(
        c["name"]
        for t in tables
        for c in t.get("columns", [])
    )
    combined = (all_names + " " + all_col_names).lower()

    db_type = _detect_domain(combined)

    # ── 4. Build widgets based on domain ────────────────────────
    # Pick the top 3 tables by row count
    sorted_tables = sorted(table_rows.items(), key=lambda x: x[1], reverse=True)
    top_table_names = [n for n, _ in sorted_tables if _ > 0][:3]
    top_tables_info = {t["name"]: t for t in tables}

    widgets: list[Widget] = []
    overview: list[StatCard] = []

    # Always: stat card for each non-empty table row count
    for tname, cnt in sorted_tables[:4]:
        overview.append(StatCard(
            label=_humanize(tname) + " Count",
            value=_fmt_num(cnt),
            icon="rows",
        ))

    # Domain-specific widgets
    domain_widgets = await _build_domain_widgets(creds, tables, table_rows, db_type, top_table_names, top_tables_info)
    widgets.extend(domain_widgets)

    # Fallback: if no domain widgets, at least show a row counts bar chart
    if not widgets:
        bar_data = [{"table": n, "rows": c} for n, c in sorted_tables if c > 0]
        if bar_data:
            widgets.append(Widget(
                id="row_counts",
                title="Records per Table",
                widget_type="bar",
                data=bar_data,
                config={"x_key": "table", "y_key": "rows", "color_each": True},
            ))

        # For each table, show a sample
        for tname in top_table_names[:2]:
            t_info = top_tables_info.get(tname)
            if not t_info:
                continue
            rows = await _safe_query(creds, f"SELECT * FROM {_quote(t_info['schema'], tname)} LIMIT 10")
            if rows:
                widgets.append(Widget(
                    id=f"sample_{tname}",
                    title=f"{_humanize(tname)} — Sample Data",
                    widget_type="table",
                    data=rows,
                    config={},
                ))

    schema_brief = "; ".join(
        f"{t['name']}({', '.join(c['name'] for c in t.get('columns', [])[:5])})"
        for t in tables[:6]
    )
    
    user_api_key = None
    if current_user.gemini_api_key_encrypted:
        try:
            user_api_key = encryption.decrypt(current_user.gemini_api_key_encrypted)
        except Exception as e:
            logger.error(f"Failed to decrypt user API key: {e}")

    summary, ai_widgets = await _agent_enrich_dashboard(conn.name, db_type, schema_brief, creds, user_api_key)
    widgets.extend(ai_widgets)

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


# ── Domain Detection ─────────────────────────────────────────────

def _detect_domain(combined: str) -> str:
    patterns = {
        "sales": ["order", "invoice", "sale", "revenue", "customer", "payment", "product", "cart", "checkout"],
        "ecommerce": ["cart", "checkout", "product", "category", "inventory", "shipping", "sku"],
        "users": ["user", "profile", "account", "member", "subscriber", "role", "permission"],
        "finance": ["transaction", "account", "balance", "ledger", "expense", "income", "budget", "credit", "debit"],
        "healthcare": ["patient", "doctor", "appointment", "diagnosis", "prescription", "hospital", "clinic"],
        "analytics": ["event", "session", "pageview", "click", "conversion", "funnel", "traffic"],
        "content": ["post", "article", "comment", "author", "tag", "category", "blog", "story", "media", "project"],
        "inventory": ["stock", "warehouse", "supplier", "sku", "quantity", "shipment"],
        "hr": ["employee", "department", "salary", "leave", "attendance", "payroll"],
    }
    scores: dict[str, int] = {}
    for domain, keywords in patterns.items():
        scores[domain] = sum(1 for kw in keywords if kw in combined)
    best = max(scores, key=lambda x: scores[x])
    return best if scores[best] > 0 else "general"


# ── Domain-Specific Widgets ──────────────────────────────────────

async def _build_domain_widgets(
    creds: dict,
    tables: list[dict],
    table_rows: dict[str, int],
    db_type: str,
    top_names: list[str],
    info_map: dict[str, dict],
) -> list[Widget]:
    widgets: list[Widget] = []
    tbl = {t["name"]: t for t in tables}

    # Helper: find a table whose name contains substring
    def find_table(*substrings: str) -> dict | None:
        for sub in substrings:
            for name, t in tbl.items():
                if sub in name.lower():
                    return t
        return None

    # Helper: find column in table whose name contains substring
    def find_col(t: dict, *subs: str) -> str | None:
        for sub in subs:
            for c in t.get("columns", []):
                if sub in c["name"].lower():
                    return c["name"]
        return None

    if db_type in ("sales", "ecommerce"):
        orders_t = find_table("order")
        products_t = find_table("product")

        if orders_t:
            fn = _quote(orders_t["schema"], orders_t["name"])
            date_col = find_col(orders_t, "date", "created", "time", "at")
            amount_col = find_col(orders_t, "amount", "total", "price", "revenue", "value")
            status_col = find_col(orders_t, "status")

            # Monthly revenue trend
            if date_col and amount_col:
                rows = await _safe_query(creds,
                    f"SELECT DATE_TRUNC('month', \"{date_col}\")::date AS month, "
                    f"ROUND(SUM(\"{amount_col}\")::numeric, 2) AS revenue "
                    f"FROM {fn} GROUP BY 1 ORDER BY 1 DESC LIMIT 12")
                if rows and len(rows) >= 2:
                    widgets.append(Widget(
                        id="monthly_revenue",
                        title="Monthly Revenue Trend",
                        widget_type="line",
                        data=list(reversed(rows)),
                        config={"x_key": "month", "y_key": "revenue"},
                    ))

            # Orders by status
            if status_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{status_col}\" AS status, COUNT(*) AS count "
                    f"FROM {fn} GROUP BY 1 ORDER BY 2 DESC")
                if rows:
                    widgets.append(Widget(
                        id="orders_by_status",
                        title="Orders by Status",
                        widget_type="pie",
                        data=rows,
                        config={"name_key": "status", "value_key": "count"},
                    ))

        if products_t:
            fn = _quote(products_t["schema"], products_t["name"])
            cat_col = find_col(products_t, "category", "type", "group")
            price_col = find_col(products_t, "price", "amount", "cost")
            name_col = find_col(products_t, "name", "title", "product")

            if cat_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{cat_col}\" AS category, COUNT(*) AS count "
                    f"FROM {fn} WHERE \"{cat_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
                if rows:
                    widgets.append(Widget(
                        id="products_by_category",
                        title="Products by Category",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": "category", "y_key": "count", "color_each": True},
                    ))

            if price_col and name_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{name_col}\" AS product, \"{price_col}\" AS price "
                    f"FROM {fn} WHERE \"{price_col}\" IS NOT NULL "
                    f"ORDER BY \"{price_col}\" DESC LIMIT 10")
                if rows:
                    widgets.append(Widget(
                        id="top_products_by_price",
                        title="Top Products by Price",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": "product", "y_key": "price"},
                    ))

    elif db_type == "users":
        users_t = find_table("user", "member", "profile", "account")
        if users_t:
            fn = _quote(users_t["schema"], users_t["name"])
            age_col = find_col(users_t, "age", "birth", "dob")
            city_col = find_col(users_t, "city", "location", "region", "country", "state")
            created_col = find_col(users_t, "created", "joined", "signup", "registered", "at")
            role_col = find_col(users_t, "role", "type", "tier", "plan", "status")

            if age_col:
                rows = await _safe_query(creds,
                    f"SELECT "
                    f"CASE WHEN \"{age_col}\" < 18 THEN 'Under 18' "
                    f"     WHEN \"{age_col}\" < 30 THEN '18-29' "
                    f"     WHEN \"{age_col}\" < 45 THEN '30-44' "
                    f"     WHEN \"{age_col}\" < 60 THEN '45-59' "
                    f"     ELSE '60+' END AS age_group, "
                    f"COUNT(*) AS count "
                    f"FROM {fn} WHERE \"{age_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY MIN(\"{age_col}\")")
                if rows:
                    widgets.append(Widget(
                        id="age_distribution",
                        title="User Age Distribution",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": "age_group", "y_key": "count", "color_each": True},
                    ))

            if city_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{city_col}\" AS location, COUNT(*) AS users "
                    f"FROM {fn} WHERE \"{city_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
                if rows:
                    widgets.append(Widget(
                        id="users_by_location",
                        title=f"Users by {_humanize(city_col)}",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": "location", "y_key": "users", "color_each": True},
                    ))

            if role_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{role_col}\" AS segment, COUNT(*) AS count "
                    f"FROM {fn} WHERE \"{role_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 8")
                if rows:
                    widgets.append(Widget(
                        id="users_by_role",
                        title=f"Users by {_humanize(role_col)}",
                        widget_type="pie",
                        data=rows,
                        config={"name_key": "segment", "value_key": "count"},
                    ))

            if created_col:
                rows = await _safe_query(creds,
                    f"SELECT DATE_TRUNC('month', \"{created_col}\")::date AS month, COUNT(*) AS signups "
                    f"FROM {fn} GROUP BY 1 ORDER BY 1 DESC LIMIT 12")
                if rows and len(rows) >= 2:
                    widgets.append(Widget(
                        id="signup_trend",
                        title="User Signup Trend",
                        widget_type="line",
                        data=list(reversed(rows)),
                        config={"x_key": "month", "y_key": "signups"},
                    ))

            # Fallback: sample data table
            if not widgets:
                rows = await _safe_query(creds, f"SELECT * FROM {fn} LIMIT 20")
                if rows:
                    widgets.append(Widget(
                        id="users_sample",
                        title=f"{_humanize(users_t['name'])} — All Data",
                        widget_type="table",
                        data=rows,
                        config={},
                    ))

    elif db_type == "content":
        content_t = find_table("post", "article", "blog", "project", "media", "story", "content")
        if content_t:
            fn = _quote(content_t["schema"], content_t["name"])
            cat_col = find_col(content_t, "category", "type", "status", "genre", "tag")
            author_col = find_col(content_t, "author", "creator", "user", "owner")
            date_col = find_col(content_t, "created", "published", "date", "at")
            view_col = find_col(content_t, "view", "count", "like", "engagement")

            if cat_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{cat_col}\" AS category, COUNT(*) AS count "
                    f"FROM {fn} WHERE \"{cat_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
                if rows:
                    widgets.append(Widget(
                        id="content_by_category",
                        title=f"{_humanize(content_t['name'])} by {_humanize(cat_col)}",
                        widget_type="pie",
                        data=rows,
                        config={"name_key": "category", "value_key": "count"},
                    ))

            if author_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{author_col}\" AS author, COUNT(*) AS count "
                    f"FROM {fn} WHERE \"{author_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
                if rows:
                    widgets.append(Widget(
                        id="by_author",
                        title=f"{_humanize(content_t['name'])} by {_humanize(author_col)}",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": "author", "y_key": "count", "color_each": True},
                    ))

            if view_col:
                name_col = find_col(content_t, "title", "name", "slug")
                cols = f'"{name_col}", ' if name_col else ""
                rows = await _safe_query(creds,
                    f"SELECT {cols}\"{view_col}\" AS views "
                    f"FROM {fn} WHERE \"{view_col}\" IS NOT NULL "
                    f"ORDER BY \"{view_col}\" DESC LIMIT 10")
                if rows:
                    x = name_col or list(rows[0].keys())[0]
                    widgets.append(Widget(
                        id="top_by_views",
                        title=f"Top {_humanize(content_t['name'])} by {_humanize(view_col)}",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": x, "y_key": "views"},
                    ))

            # Sample table
            rows = await _safe_query(creds, f"SELECT * FROM {fn} LIMIT 10")
            if rows:
                widgets.append(Widget(
                    id=f"sample_{content_t['name']}",
                    title=f"{_humanize(content_t['name'])} — Recent Data",
                    widget_type="table",
                    data=rows,
                    config={},
                ))

    elif db_type in ("analytics",):
        event_t = find_table("event", "session", "pageview", "log", "click")
        if event_t:
            fn = _quote(event_t["schema"], event_t["name"])
            event_col = find_col(event_t, "event", "action", "type", "name")
            date_col = find_col(event_t, "created", "timestamp", "date", "time", "at")

            if event_col:
                rows = await _safe_query(creds,
                    f"SELECT \"{event_col}\" AS event_type, COUNT(*) AS count "
                    f"FROM {fn} WHERE \"{event_col}\" IS NOT NULL "
                    f"GROUP BY 1 ORDER BY 2 DESC LIMIT 10")
                if rows:
                    widgets.append(Widget(
                        id="events_by_type",
                        title="Events by Type",
                        widget_type="bar",
                        data=rows,
                        config={"x_key": "event_type", "y_key": "count", "color_each": True},
                    ))

            if date_col:
                rows = await _safe_query(creds,
                    f"SELECT DATE_TRUNC('day', \"{date_col}\")::date AS day, COUNT(*) AS events "
                    f"FROM {fn} GROUP BY 1 ORDER BY 1 DESC LIMIT 30")
                if rows and len(rows) >= 2:
                    widgets.append(Widget(
                        id="events_over_time",
                        title="Events Over Time",
                        widget_type="line",
                        data=list(reversed(rows)),
                        config={"x_key": "day", "y_key": "events"},
                    ))

    # ── Universal: show sample table for top 2 non-empty tables if we have few widgets
    if len(widgets) < 2:
        for tname in top_names[:3]:
            t_info = info_map.get(tname)
            if not t_info:
                continue
            fn = _quote(t_info["schema"], tname)
            rows = await _safe_query(creds, f"SELECT * FROM {fn} LIMIT 15")
            if rows:
                widgets.append(Widget(
                    id=f"sample_{tname}",
                    title=f"{_humanize(tname)} — Data",
                    widget_type="table",
                    data=rows,
                    config={},
                ))
            if len(widgets) >= 3:
                break

    return widgets


# ── AI Dashboard Enrichment ──────────────────────────────────────

async def _agent_enrich_dashboard(db_name: str, db_type: str, schema_brief: str, creds: dict, api_key: str | None = None) -> tuple[str, list[Widget]]:
    summary = f"A {db_type} database with {schema_brief.count(';') + 1} tables."
    ai_widgets: list[Widget] = []
    
    try:
        llm = get_llm(temperature=0.0, api_key=api_key).bind(response_format={"type": "json_object"})
        prompt = f"""You are an expert data analyst. Based on this database schema, generate a concise summary and 2 advanced, insightful SQL queries that return aggregated data suitable for charts (e.g. trends, top groupings).

Database: {db_name}
Type: {db_type}
Schema: {schema_brief}

Provide ONLY a valid JSON object with this exact structure:
{{
  "summary": "One concise sentence describing what this DB is about.",
  "metrics": [
    {{
       "title": "Short descriptive title",
       "sql_query": "SELECT ... FROM ... GROUP BY ... ORDER BY ... LIMIT 10",
       "chart_type": "bar",
       "x_key": "column1",
       "y_key": "column2"
    }}
  ]
}}

PostgreSQL SQL rules:
1. Always alias columns (e.g., AS total_revenue).
2. Cast SUM/AVG to numeric: ROUND(SUM(amount)::numeric, 2).
3. Do NOT use markdown code blocks, just pure JSON.
"""
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        data = json.loads(resp.content)
        
        summary = data.get("summary", summary)
        
        for i, m in enumerate(data.get("metrics", [])):
            rows = await _safe_query(creds, m["sql_query"])
            if rows:
                ai_widgets.append(Widget(
                    id=f"ai_metric_{i}",
                    title=f"✨ {m.get('title', 'AI Metric')}",
                    widget_type=m.get("chart_type", "bar"),
                    data=rows,
                    config={"x_key": m.get("x_key"), "y_key": m.get("y_key"), "color_each": True}
                ))
    except Exception as e:
        err_msg = str(e).lower()
        if "429" in err_msg or "quota" in err_msg or "exhausted" in err_msg:
            summary = "⚠️ AI Insights are currently unavailable due to API rate limits. Please check your Gemini API quota or provide your own key in Settings."
        else:
            logger.warning(f"AI enrichment failed: {e}")
        
    return summary, ai_widgets


# ── Helpers ─────────────────────────────────────────────────────

def _quote(schema: str, name: str) -> str:
    return f'"{schema}"."{name}"'


async def _safe_query(creds: dict, query: str) -> list[dict]:
    try:
        result = await ConnectionManager.execute_query(**creds, query=query)
        return result.get("rows", [])
    except Exception as e:
        logger.warning("Dashboard query failed [%.80s]: %s", query, e)
        return []


def _detect_domain(combined: str) -> str:
    patterns = {
        "sales":     ["order", "invoice", "sale", "revenue", "customer", "payment", "product", "cart"],
        "ecommerce": ["cart", "checkout", "product", "category", "inventory", "shipping", "sku"],
        "users":     ["user", "profile", "account", "member", "subscriber"],
        "finance":   ["transaction", "account", "balance", "ledger", "expense", "income", "budget"],
        "healthcare":["patient", "doctor", "appointment", "diagnosis", "prescription"],
        "analytics": ["event", "session", "pageview", "click", "conversion", "funnel", "traffic"],
        "content":   ["post", "article", "comment", "author", "tag", "blog", "media", "project", "story"],
        "inventory": ["stock", "warehouse", "supplier", "sku", "quantity"],
        "hr":        ["employee", "department", "salary", "leave", "attendance"],
    }
    scores = {d: sum(1 for kw in kws if kw in combined) for d, kws in patterns.items()}
    best = max(scores, key=lambda x: scores[x])
    return best if scores[best] > 0 else "general"


def _humanize(s: str) -> str:
    return re.sub(r"[_\-]+", " ", s).title()


def _fmt_num(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)
