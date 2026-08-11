from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.scheduling import router as scheduling_router
from app.routers.insights import router as insights_router
from app.routers.chat import router as chat_router
from app.routers.data import router as data_router

__all__ = [
    "auth_router",
    "dashboard_router",
    "scheduling_router",
    "insights_router",
    "chat_router",
    "data_router"
]
