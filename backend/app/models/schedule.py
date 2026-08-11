from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    production_target = Column(Integer, nullable=False)
    product_type = Column(String, nullable=False)
    delivery_deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="active")
    schedule_data = Column(JSON, nullable=False)
    ai_reasoning = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    machine_id = Column(String, ForeignKey("machines.machine_id"), nullable=False)
    product_type = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    quantity = Column(Integer, nullable=False)
    utilization_pct = Column(Float, default=0.0)
    status = Column(String, default="scheduled")
