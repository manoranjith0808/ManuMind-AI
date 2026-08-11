"""Dashboard API endpoints with real database queries."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case, and_
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.machine import Machine
from app.models.production import ProductionLog
from app.models.sensor import SensorData
from app.models.quality import QualityMetric
from app.services.auth import get_current_user
from app.schemas.dashboard import (
    DashboardOverview, DashboardKPIs, ProductionTrendPoint,
    MachineUtilization, DefectAnalysis, ShiftPerformance,
    MachineStatus, SensorHeatmapPoint, KPI
)

async def _get_latest_time(db: AsyncSession) -> datetime:
    latest_prod = (await db.execute(select(func.max(ProductionLog.start_time)))).scalar()
    if latest_prod:
        return latest_prod
    return datetime.utcnow()

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
async def get_overview(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get dashboard overview with OEE, production stats, machine counts."""
    now = await _get_latest_time(db)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    # Machine status counts
    machine_result = await db.execute(select(Machine))
    machines = machine_result.scalars().all()
    status_counts = {"running": 0, "idle": 0, "maintenance": 0, "breakdown": 0}
    for m in machines:
        status_counts[m.status] = status_counts.get(m.status, 0) + 1

    # Today's production
    prod_result = await db.execute(
        select(
            func.coalesce(func.sum(ProductionLog.quantity_produced), 0).label("total_produced"),
            func.coalesce(func.sum(ProductionLog.target_quantity), 0).label("total_target"),
            func.coalesce(func.sum(ProductionLog.defect_count), 0).label("total_defects"),
            func.coalesce(func.sum(ProductionLog.energy_consumed), 0).label("total_energy"),
        ).where(ProductionLog.start_time >= today_start)
    )
    row = prod_result.one()
    total_produced = int(row.total_produced)
    total_target = int(row.total_target) if row.total_target > 0 else 1
    total_defects = int(row.total_defects)
    total_energy = float(row.total_energy)

    # Calculate OEE components
    availability = status_counts["running"] / max(len(machines), 1) * 100
    performance = (total_produced / max(total_target, 1)) * 100
    quality = ((total_produced - total_defects) / max(total_produced, 1)) * 100
    oee = (availability * performance * quality) / 10000  # OEE = A * P * Q

    # Downtime estimation (machines not running * hours today)
    hours_elapsed = max((now - today_start).total_seconds() / 3600, 1)
    non_running = len(machines) - status_counts["running"]
    downtime_hours = round(non_running * hours_elapsed, 1)

    progress_pct = round((total_produced / max(total_target, 1)) * 100, 1)

    return DashboardOverview(
        oee=round(oee, 1),
        total_production=total_produced,
        machine_counts=status_counts,
        downtime_hours=downtime_hours,
        energy_consumption=round(total_energy, 1),
        production_progress_percentage=min(progress_pct, 100.0)
    )


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get KPI card data with trend comparisons."""
    now = await _get_latest_time(db)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    # Today's stats
    today_result = await db.execute(
        select(
            func.coalesce(func.sum(ProductionLog.quantity_produced), 0),
            func.coalesce(func.sum(ProductionLog.target_quantity), 0),
            func.coalesce(func.sum(ProductionLog.defect_count), 0),
            func.count(ProductionLog.id),
        ).where(ProductionLog.start_time >= today_start)
    )
    t = today_result.one()

    # Yesterday's stats for trend calculation
    yesterday_result = await db.execute(
        select(
            func.coalesce(func.sum(ProductionLog.quantity_produced), 0),
            func.coalesce(func.sum(ProductionLog.defect_count), 0),
        ).where(and_(ProductionLog.start_time >= yesterday_start, ProductionLog.start_time < today_start))
    )
    y = yesterday_result.one()

    today_prod = int(t[0])
    today_target = int(t[1]) if t[1] > 0 else 1
    today_defects = int(t[2])
    yesterday_prod = int(y[0]) if y[0] > 0 else 1
    yesterday_defects = int(y[1])

    prod_trend = round(((today_prod - yesterday_prod) / max(yesterday_prod, 1)) * 100, 1)
    quality_rate = round(((today_prod - today_defects) / max(today_prod, 1)) * 100, 1)
    yest_quality = round(((yesterday_prod - yesterday_defects) / max(yesterday_prod, 1)) * 100, 1)

    # Machine availability
    machines = (await db.execute(select(Machine))).scalars().all()
    running = sum(1 for m in machines if m.status == "running")
    availability = round((running / max(len(machines), 1)) * 100, 1)

    return DashboardKPIs(
        production_rate=KPI(title="Production Rate", value=today_prod, unit="units", trend=prod_trend),
        quality_rate=KPI(title="Quality Rate", value=quality_rate, unit="%", trend=round(quality_rate - yest_quality, 1)),
        availability=KPI(title="Availability", value=availability, unit="%", trend=0),
        performance=KPI(title="Performance", value=round((today_prod / max(today_target, 1)) * 100, 1), unit="%", trend=prod_trend)
    )


@router.get("/production-trend", response_model=List[ProductionTrendPoint])
async def get_production_trend(days: int = 30, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get daily production totals for the last N days."""
    now = await _get_latest_time(db)
    start_date = now - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(ProductionLog.start_time).label("date"),
            func.sum(ProductionLog.quantity_produced).label("produced"),
            func.sum(ProductionLog.target_quantity).label("target"),
        )
        .where(ProductionLog.start_time >= start_date)
        .group_by(func.date(ProductionLog.start_time))
        .order_by(func.date(ProductionLog.start_time))
    )
    rows = result.all()
    return [
        ProductionTrendPoint(date=str(r.date), actual=int(r.produced), target=int(r.target))
        for r in rows
    ]


@router.get("/machine-utilization", response_model=List[MachineUtilization])
async def get_machine_utilization(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get utilization percentage per machine based on production vs capacity."""
    machines = (await db.execute(select(Machine))).scalars().all()
    now = await _get_latest_time(db)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    utilizations = []
    for m in machines:
        prod_result = await db.execute(
            select(func.coalesce(func.sum(ProductionLog.quantity_produced), 0))
            .where(and_(ProductionLog.machine_id == m.machine_id, ProductionLog.start_time >= today_start))
        )
        produced = int(prod_result.scalar())
        hours_elapsed = max((now - today_start).total_seconds() / 3600, 1)
        max_capacity = m.capacity_per_hour * hours_elapsed
        utilization = round((produced / max(max_capacity, 1)) * 100, 1)
        utilizations.append(MachineUtilization(
            machine_id=m.machine_id,
            name=m.name,
            utilization=min(utilization, 100.0),
            capacity=m.capacity_per_hour
        ))
    return utilizations


@router.get("/defect-analysis", response_model=List[DefectAnalysis])
async def get_defect_analysis(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get defect breakdown by product type."""
    now = await _get_latest_time(db)
    start = now - timedelta(days=7)
    result = await db.execute(
        select(
            ProductionLog.product_type,
            func.sum(ProductionLog.defect_count).label("count")
        )
        .where(ProductionLog.start_time >= start)
        .group_by(ProductionLog.product_type)
        .order_by(func.sum(ProductionLog.defect_count).desc())
    )
    rows = result.all()
    return [DefectAnalysis(defect_type=r.product_type, count=int(r.count)) for r in rows]


@router.get("/shift-performance", response_model=List[ShiftPerformance])
async def get_shift_performance(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get production and defect totals by shift."""
    now = await _get_latest_time(db)
    start = now - timedelta(days=7)
    result = await db.execute(
        select(
            ProductionLog.shift,
            func.sum(ProductionLog.quantity_produced).label("production"),
            func.sum(ProductionLog.defect_count).label("defects"),
        )
        .where(ProductionLog.start_time >= start)
        .group_by(ProductionLog.shift)
    )
    rows = result.all()
    return [ShiftPerformance(shift=r.shift, production=int(r.production), defects=int(r.defects)) for r in rows]


@router.get("/machines", response_model=List[MachineStatus])
async def get_machines(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all machine statuses with latest sensor readings."""
    machines = (await db.execute(select(Machine))).scalars().all()
    result_list = []
    for m in machines:
        # Get latest sensor data for this machine
        sensor_result = await db.execute(
            select(SensorData)
            .where(SensorData.machine_id == m.machine_id)
            .order_by(SensorData.timestamp.desc())
            .limit(1)
        )
        sensor = sensor_result.scalar_one_or_none()
        latest_sensors = {}
        if sensor:
            latest_sensors = {
                "temperature": round(sensor.temperature, 1),
                "vibration": round(sensor.vibration, 2),
                "power_consumption": round(sensor.power_consumption, 1),
                "cycle_time": round(sensor.cycle_time, 1) if sensor.cycle_time else 0
            }
        else:
            latest_sensors = {"temperature": 0, "vibration": 0, "power_consumption": 0, "cycle_time": 0}

        result_list.append(MachineStatus(
            machine_id=m.machine_id,
            name=m.name,
            type=m.type,
            status=m.status,
            health_score=m.health_score,
            latest_sensors=latest_sensors
        ))
    return result_list


@router.get("/sensor-heatmap", response_model=List[SensorHeatmapPoint])
async def get_sensor_heatmap(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get latest sensor readings for heatmap display."""
    machines = (await db.execute(select(Machine))).scalars().all()
    points = []
    for m in machines:
        sensor_result = await db.execute(
            select(SensorData)
            .where(SensorData.machine_id == m.machine_id)
            .order_by(SensorData.timestamp.desc())
            .limit(1)
        )
        sensor = sensor_result.scalar_one_or_none()
        if sensor:
            points.append(SensorHeatmapPoint(
                machine_id=m.machine_id,
                temperature=round(sensor.temperature, 1),
                vibration=round(sensor.vibration, 2),
                timestamp=sensor.timestamp
            ))
    return points
