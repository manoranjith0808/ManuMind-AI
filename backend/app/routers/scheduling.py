"""Scheduling API endpoints for AI-powered production scheduling."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.schedule import Schedule
from app.services.auth import get_current_user
from app.services import gemini
from app.schemas.scheduling import (
    ScheduleGenerateRequest, ScheduleRescheduleRequest,
    ScheduleResponse, RescheduleResponse
)

router = APIRouter(prefix="/schedule", tags=["scheduling"])


@router.post("/generate", response_model=ScheduleResponse)
async def generate_new_schedule(
    req: ScheduleGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an optimal production schedule using Gemini AI."""
    ai_result = await gemini.generate_schedule(req.model_dump(mode='json'))

    db_schedule = Schedule(
        name=f"Schedule for {req.product_type} - {req.production_target} units",
        production_target=req.production_target,
        product_type=req.product_type,
        delivery_deadline=req.delivery_deadline,
        schedule_data=ai_result,  # Store the full AI response
        ai_reasoning=ai_result.get("ai_reasoning", ""),
        created_by=current_user.id
    )
    db.add(db_schedule)
    await db.commit()
    await db.refresh(db_schedule)

    return db_schedule


@router.post("/reschedule", response_model=RescheduleResponse)
async def reschedule(
    req: ScheduleRescheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Simulate machine failure and generate a rescheduled production plan."""
    result = await db.execute(select(Schedule).where(Schedule.id == req.schedule_id))
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Get the schedule items from the stored data
    current_schedule_data = original.schedule_data
    if isinstance(current_schedule_data, dict):
        schedule_items = current_schedule_data.get("schedule_items", [])
    else:
        schedule_items = current_schedule_data or []

    ai_result = await gemini.reschedule_production(
        {"schedule_items": schedule_items, "production_target": original.production_target},
        req.failed_machine_id,
        req.failure_time.isoformat()
    )

    # Save the new schedule
    new_schedule = Schedule(
        name=f"Rescheduled: {original.name} (after {req.failed_machine_id} failure)",
        production_target=original.production_target,
        product_type=original.product_type,
        delivery_deadline=original.delivery_deadline,
        schedule_data=ai_result,
        ai_reasoning=ai_result.get("ai_reasoning", ""),
        created_by=current_user.id
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)

    return RescheduleResponse(
        original_schedule=original,
        new_schedule=new_schedule,
        delay_analysis=ai_result.get("delay_analysis", {}),
        production_impact=ai_result.get("production_impact", {}),
        change_log=ai_result.get("change_log", []),
        ai_reasoning=ai_result.get("ai_reasoning", "")
    )


@router.get("", response_model=List[ScheduleResponse])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all saved production schedules."""
    result = await db.execute(select(Schedule).order_by(Schedule.id.desc()))
    return result.scalars().all()


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific schedule by ID."""
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule
