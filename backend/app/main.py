import logging
from sqlalchemy.future import select
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables, AsyncSessionLocal
from app.models.machine import Machine
from app.routers import (
    auth_router,
    dashboard_router,
    scheduling_router,
    insights_router,
    chat_router,
    data_router
)

logger = logging.getLogger("manumind")

app = FastAPI(
    title="ManuMind AI API",
    version="1.0.0",
    description="Backend for ManuMind AI Manufacturing Intelligence Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(scheduling_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(data_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    await create_tables()
    try:
        from seed_data import seed_data as seed_sample_data

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Machine))
            if result.scalars().first() is None:
                seed_sample_data()
    except Exception as exc:
        logger.warning("Seed data initialization skipped: %s", exc)

@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
