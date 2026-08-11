"""Dashboard Pydantic schemas for API responses."""
from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime


class DashboardOverview(BaseModel):
    """Overview metrics for the dashboard header."""
    oee: float
    total_production: int
    machine_counts: Dict[str, int]
    downtime_hours: float
    energy_consumption: float
    production_progress_percentage: float


class KPI(BaseModel):
    """Single KPI card data."""
    title: str
    value: float
    unit: str
    trend: float  # positive = improvement, negative = decline


class DashboardKPIs(BaseModel):
    """All KPI cards for the dashboard."""
    production_rate: KPI
    quality_rate: KPI
    availability: KPI
    performance: KPI


class ProductionTrendPoint(BaseModel):
    """Single data point for production trend line chart."""
    date: str
    actual: int = 0
    target: int = 0


class MachineUtilization(BaseModel):
    """Machine utilization for bar chart."""
    machine_id: str
    name: str = ""
    utilization: float
    capacity: int = 0


class DefectAnalysis(BaseModel):
    """Defect breakdown for pie chart."""
    defect_type: str
    count: int


class ShiftPerformance(BaseModel):
    """Shift-wise performance data."""
    shift: str
    production: int
    defects: int


class MachineStatus(BaseModel):
    """Machine status with latest sensor readings."""
    machine_id: str
    name: str
    type: str
    status: str
    health_score: float
    latest_sensors: Dict[str, float] = {}


class SensorHeatmapPoint(BaseModel):
    """Sensor data point for heatmap visualization."""
    machine_id: str
    temperature: float
    vibration: float
    timestamp: datetime
