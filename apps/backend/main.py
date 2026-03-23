import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.services.cache import init_redis, close_redis
from app.routers import (
    auth_router,
    users_router,
    companies_router,
    connections_router,
    conversations_router,
    health_router,
    agent_router,
    chat_router,
    reports_router,
    dashboard_router,
)

settings = get_settings()
if settings.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true" if settings.langsmith_tracing else "false"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project


@asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        from urllib.parse import urlparse
        p = urlparse(settings.database_url)
        user_creds = f"{p.username}:***" if p.username else "none"
        safe_url = f"{p.scheme}://{user_creds}@{p.hostname}:{p.port}{p.path}{p.params}{p.query}"
        print(f"DEBUG: Using database URL: {safe_url}")
    except Exception as e:
        print(f"DEBUG: Could not parse database URL for logging: {e}")


    print(f"DEBUG: CORS_ORIGINS: {settings.cors_origins}")
    print(f"DEBUG: PORT: {os.getenv('PORT', '8000 (default)')}")
    print(f"DEBUG: Using Redis URL: {settings.redis_url}")

    await init_db()
    await init_redis(settings.redis_url)
    yield
    await close_redis()


app = FastAPI(
    title="Aigent API",
    description="Agentic Data Analytics Platform - AI-powered business intelligence",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)



_allow_origins = settings.cors_origins
_allow_credentials = True

if "*" in _allow_origins:
    _allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(companies_router)
app.include_router(connections_router)
app.include_router(conversations_router)
app.include_router(agent_router)
app.include_router(chat_router)
app.include_router(reports_router)
app.include_router(dashboard_router)

@app.get("/")
async def root():

    return {
        "name": "Aigent API",
        "version": "0.1.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.debug
    )
