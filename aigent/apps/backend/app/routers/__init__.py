# Routers Package
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.companies import router as companies_router
from app.routers.connections import router as connections_router
from app.routers.conversations import router as conversations_router
from app.routers.health import router as health_router
from app.routers.agent import router as agent_router
from app.routers.chat import router as chat_router
from app.routers.reports import router as reports_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "users_router",
    "companies_router",
    "connections_router",
    "conversations_router",
    "health_router",
    "agent_router",
    "chat_router",
    "reports_router",
    "dashboard_router",
]


