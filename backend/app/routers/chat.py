"""AI Chatbot API endpoint - conversational manufacturing copilot."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.machine import Machine
from app.models.production import ProductionLog
from app.models.sensor import SensorData
from app.services.auth import get_current_user
from app.services import gemini
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


async def _gather_chat_context(db: AsyncSession) -> dict:
    """Gather current factory status for chat context."""
    now = datetime.utcnow()
    
    # Use latest data timestamp as "now" if available
    latest_prod = (await db.execute(select(func.max(ProductionLog.start_time)))).scalar()
    if latest_prod:
        now = latest_prod
        
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Machine statuses
    machines = (await db.execute(select(Machine))).scalars().all()
    machine_info = []
    for m in machines:
        sensor = (await db.execute(
            select(SensorData).where(SensorData.machine_id == m.machine_id)
            .order_by(SensorData.timestamp.desc()).limit(1)
        )).scalar_one_or_none()

        info = {
            "id": m.machine_id, "name": m.name, "type": m.type,
            "status": m.status, "health": m.health_score,
            "capacity_per_hour": m.capacity_per_hour,
        }
        if sensor:
            info["latest_temp"] = round(sensor.temperature, 1)
            info["latest_vibration"] = round(sensor.vibration, 2)
            info["latest_power"] = round(sensor.power_consumption, 1)
        machine_info.append(info)

    # Today's production
    prod = await db.execute(
        select(
            func.sum(ProductionLog.quantity_produced),
            func.sum(ProductionLog.target_quantity),
            func.sum(ProductionLog.defect_count),
            func.sum(ProductionLog.energy_consumed),
        ).where(ProductionLog.start_time >= today_start)
    )
    p = prod.one()
    total_prod = int(p[0]) if p[0] else 0
    total_target = int(p[1]) if p[1] else 0

    # Per shift today
    shift_data = await db.execute(
        select(
            ProductionLog.shift,
            func.sum(ProductionLog.quantity_produced),
        ).where(ProductionLog.start_time >= today_start)
        .group_by(ProductionLog.shift)
    )
    shifts = {r[0]: int(r[1]) for r in shift_data.all()}

    running = sum(1 for m in machines if m.status == "running")
    oee = round((running / max(len(machines), 1)) * (total_prod / max(total_target, 1)) * 100, 1) if total_target > 0 else 0

    return {
        "timestamp": now.isoformat(),
        "oee": oee,
        "today_production": total_prod,
        "today_target": total_target,
        "today_defects": int(p[2]) if p[2] else 0,
        "today_energy_kwh": round(float(p[3]) if p[3] else 0, 1),
        "machines": machine_info,
        "running_machines": running,
        "total_machines": len(machines),
        "shift_production": shifts,
    }


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to the ManuMind AI manufacturing copilot."""
    context_data = await _gather_chat_context(db)
    history_dicts = [{"role": m.role, "content": m.content} for m in req.conversation_history]
    reply = await gemini.chat_response(req.message, history_dicts, context_data)
    return ChatResponse(reply=reply)
