from typing import Dict, Any

async def calculate_oee(machine_id: str, time_range: str, db) -> float:
    # Simplified placeholder logic. In production, query the DB
    return 78.5

async def calculate_production_rate(time_range: str, db) -> Dict[str, Any]:
    return {"value": 1250, "unit": "units/hr", "trend": 5.2}

async def calculate_downtime(machine_id: str, time_range: str, db) -> Dict[str, Any]:
    return {"total_hours": 12.5, "incidents": 3}

async def get_energy_metrics(time_range: str, db) -> Dict[str, Any]:
    return {"total_kwh": 4500.5, "efficiency": "good"}

async def get_quality_metrics(time_range: str, db) -> Dict[str, Any]:
    return {"defect_rate": 2.1, "trend": -0.5}

async def get_shift_comparison(time_range: str, db) -> Dict[str, Any]:
    return {
        "Morning": {"production": 5000, "defects": 100},
        "Afternoon": {"production": 4800, "defects": 120},
        "Night": {"production": 4200, "defects": 150}
    }
