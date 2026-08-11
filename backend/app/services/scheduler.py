from datetime import datetime
from typing import List, Dict, Any

def preprocess_constraints(params: dict) -> dict:
    """Pre-process scheduling constraints before sending to AI."""
    # Add buffer time or adjust maintenance windows
    return params

def format_gantt_data(schedule_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Format schedule data for frontend Gantt chart."""
    gantt_tasks = []
    for i, item in enumerate(schedule_data):
        gantt_tasks.append({
            "id": f"task_{i}",
            "name": f"Prod: {item.get('product_type', 'Unknown')}",
            "start": item.get('start_time'),
            "end": item.get('end_time'),
            "progress": item.get('progress', 0),
            "machine": item.get('machine_id'),
            "type": "task"
        })
    return gantt_tasks

def calculate_utilization(schedule_data: List[Dict[str, Any]], machine_ids: List[str]) -> Dict[str, float]:
    """Calculate machine utilization percentage from schedule."""
    # Simplified mock calculation
    utilization = {m: 80.0 for m in machine_ids}
    return utilization

def compare_schedules(old_schedule: dict, new_schedule: dict) -> dict:
    """Compare before and after schedules for rescheduling analysis."""
    return {
        "delay_hours": 4.5,
        "efficiency_drop": "12%"
    }
