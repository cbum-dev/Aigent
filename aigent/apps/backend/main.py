import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import (
    auth_router,
    users_router,
    companies_router,
    connections_router,
    conversations_router,
    health_router,
    agent_router,
    chat_router,
)

settings = get_settings()
if settings.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true" if settings.langsmith_tracing else "false"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""

    await init_db()
    yield

    pass


app = FastAPI(
    title="Aigent API",
    description="Agentic Data Analytics Platform - AI-powered business intelligence",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
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

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Aigent API",
        "version": "0.1.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
