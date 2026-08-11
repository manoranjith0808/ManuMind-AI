from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    capacity_per_hour = Column(Integer, nullable=False)
    status = Column(String, default="idle")
    health_score = Column(Float, default=100.0)
    location = Column(String, nullable=True)
    installed_date = Column(DateTime(timezone=True), nullable=True)
    last_maintenance = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
