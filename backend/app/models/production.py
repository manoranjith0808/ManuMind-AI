from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class ProductionLog(Base):
    __tablename__ = "production_logs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, ForeignKey("machines.machine_id"), nullable=False)
    product_type = Column(String, nullable=False)
    quantity_produced = Column(Integer, nullable=False)
    target_quantity = Column(Integer, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    shift = Column(String, nullable=False)
    operator_name = Column(String, nullable=True)
    defect_count = Column(Integer, default=0)
    energy_consumed = Column(Float, default=0.0)
    status = Column(String, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
