from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, ForeignKey("machines.machine_id"), nullable=False)
    temperature = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    power_consumption = Column(Float, nullable=False)
    cycle_time = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
