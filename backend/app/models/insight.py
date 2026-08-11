from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False) # production, quality, energy, maintenance, scheduling
    priority = Column(String, nullable=False) # high, medium, low
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    action_items = Column(JSON, nullable=True)
    data_evidence = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
