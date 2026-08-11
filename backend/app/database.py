"""Database configuration using SQLAlchemy 2.0 with async support.

Supports both PostgreSQL (production) and SQLite (development).
Set DATABASE_URL in .env to switch between them.
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Determine if we're using SQLite or PostgreSQL
db_url = settings.DATABASE_URL
if "sqlite" in db_url:
    # SQLite requires special connect_args for async
    engine = create_async_engine(db_url, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_async_engine(db_url, echo=False)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    """FastAPI dependency that provides a database session."""
    async with AsyncSessionLocal() as session:
        yield session

async def create_tables():
    """Create all database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
