from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class QualityMetric(Base):
    __tablename__ = "quality_metrics"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, ForeignKey("machines.machine_id"), nullable=False)
    product_type = Column(String, nullable=False)
    defect_count = Column(Integer, default=0)
    defect_rate = Column(Float, default=0.0)
    defect_types = Column(JSON, nullable=True)
    inspection_count = Column(Integer, default=0)
    pass_count = Column(Integer, default=0)
    rework_count = Column(Integer, default=0)
    scrap_count = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
