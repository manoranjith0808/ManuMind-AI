"""AI Insights API endpoints - generates manufacturing insights using Gemini."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.insight import AIInsight
from app.models.machine import Machine
from app.models.production import ProductionLog
from app.models.sensor import SensorData
from app.services.auth import get_current_user
from app.services import gemini
from app.schemas.insight import InsightResponse

router = APIRouter(prefix="/insights", tags=["insights"])


async def _gather_kpi_data(db: AsyncSession) -> dict:
    """Gather comprehensive KPI data from the database for AI analysis."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Machine statuses
    machines = (await db.execute(select(Machine))).scalars().all()
    machine_summary = {}
    for m in machines:
        machine_summary[m.machine_id] = {
            "type": m.type, "status": m.status,
            "health_score": m.health_score, "capacity": m.capacity_per_hour
        }

    # Weekly production stats
    prod_result = await db.execute(
        select(
            func.sum(ProductionLog.quantity_produced),
            func.sum(ProductionLog.target_quantity),
            func.sum(ProductionLog.defect_count),
            func.sum(ProductionLog.energy_consumed),
            func.count(ProductionLog.id),
        ).where(ProductionLog.start_time >= week_ago)
    )
    p = prod_result.one()

    # Per-machine production
    machine_prod = await db.execute(
        select(
            ProductionLog.machine_id,
            func.sum(ProductionLog.quantity_produced).label("produced"),
            func.sum(ProductionLog.target_quantity).label("target"),
            func.sum(ProductionLog.defect_count).label("defects"),
            func.sum(ProductionLog.energy_consumed).label("energy"),
        ).where(ProductionLog.start_time >= week_ago)
        .group_by(ProductionLog.machine_id)
    )
    per_machine = {r.machine_id: {
        "produced": int(r.produced), "target": int(r.target),
        "defects": int(r.defects), "energy": round(float(r.energy), 1),
        "utilization": round(int(r.produced) / max(int(r.target), 1) * 100, 1)
    } for r in machine_prod.all()}

    # Shift comparison
    shift_result = await db.execute(
        select(
            ProductionLog.shift,
            func.sum(ProductionLog.quantity_produced),
            func.sum(ProductionLog.defect_count),
        ).where(ProductionLog.start_time >= week_ago)
        .group_by(ProductionLog.shift)
    )
    shift_data = {r[0]: {"production": int(r[1]), "defects": int(r[2])} for r in shift_result.all()}

    # Latest sensor anomalies
    sensor_anomalies = []
    for m in machines:
        sensor = (await db.execute(
            select(SensorData).where(SensorData.machine_id == m.machine_id)
            .order_by(SensorData.timestamp.desc()).limit(1)
        )).scalar_one_or_none()
        if sensor:
            if sensor.temperature > 80:
                sensor_anomalies.append(f"{m.machine_id}: High temp ({sensor.temperature:.1f}°C)")
            if sensor.vibration > 4.0:
                sensor_anomalies.append(f"{m.machine_id}: High vibration ({sensor.vibration:.2f} mm/s)")

    total_prod = int(p[0]) if p[0] else 0
    total_target = int(p[1]) if p[1] else 1
    total_defects = int(p[2]) if p[2] else 0

    return {
        "period": "last_7_days",
        "total_production": total_prod,
        "total_target": total_target,
        "production_rate_pct": round(total_prod / max(total_target, 1) * 100, 1),
        "total_defects": total_defects,
        "quality_rate_pct": round((total_prod - total_defects) / max(total_prod, 1) * 100, 1),
        "total_energy_kwh": round(float(p[3]) if p[3] else 0, 1),
        "machines": machine_summary,
        "per_machine_production": per_machine,
        "shift_performance": shift_data,
        "sensor_anomalies": sensor_anomalies,
        "running_machines": sum(1 for m in machines if m.status == "running"),
        "total_machines": len(machines),
    }


@router.post("/generate", response_model=List[InsightResponse])
async def generate_insights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI insights from current manufacturing data."""
    kpi_data = await _gather_kpi_data(db)
    insights = await gemini.generate_insights(kpi_data)

    db_insights = []
    for ins in insights:
        db_insight = AIInsight(
            category=ins.get("category", "production"),
            priority=ins.get("priority", "medium"),
            title=ins.get("title", "Insight"),
            description=ins.get("description", ""),
            action_items=ins.get("action_items", []),
            data_evidence=ins.get("data_evidence", {})
        )
        db.add(db_insight)
        db_insights.append(db_insight)

    await db.commit()
    for db_insight in db_insights:
        await db.refresh(db_insight)

    return db_insights


@router.get("", response_model=List[InsightResponse])
async def list_insights(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all generated insights, optionally filtered."""
    query = select(AIInsight).order_by(AIInsight.id.desc())
    if category:
        query = query.where(AIInsight.category == category)
    if priority:
        query = query.where(AIInsight.priority == priority)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{id}", response_model=InsightResponse)
async def get_insight(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific insight by ID."""
    result = await db.execute(select(AIInsight).where(AIInsight.id == id))
    insight = result.scalar_one_or_none()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight
