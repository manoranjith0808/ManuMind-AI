"""Scheduling Pydantic schemas."""
from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime


class ScheduleGenerateRequest(BaseModel):
    """Request to generate a new production schedule."""
    production_target: int
    product_type: str
    delivery_deadline: datetime
    machine_ids: List[str]
    machine_capacities: Dict[str, int] = {}
    shift_timings: Dict[str, Any] = {}
    maintenance_windows: List[Dict[str, Any]] = []


class ScheduleRescheduleRequest(BaseModel):
    """Request to reschedule after machine failure."""
    schedule_id: int
    failed_machine_id: str
    failure_time: datetime


class ScheduleResponse(BaseModel):
    """Full schedule response with AI data."""
    id: int
    name: str
    production_target: int
    product_type: str
    delivery_deadline: Optional[datetime] = None
    status: str = "active"
    schedule_data: Any = None  # JSON - can be list or dict
    ai_reasoning: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RescheduleResponse(BaseModel):
    """Response for rescheduling showing before/after."""
    original_schedule: ScheduleResponse
    new_schedule: ScheduleResponse
    delay_analysis: Any = None  # Can be string or dict from Gemini
    production_impact: Any = None
    change_log: Any = None
    ai_reasoning: str = ""
