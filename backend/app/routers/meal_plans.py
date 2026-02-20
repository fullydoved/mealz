from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meal_plan import MealSlot, WeekPlan
from app.schemas.meal_plan import (
    MealSlotCreate,
    MealSlotRead,
    MealSlotUpdate,
    WeekPlanCreate,
    WeekPlanRead,
    WeekPlanUpdate,
)

router = APIRouter(prefix="/api/meal-plans", tags=["meal-plans"])


def _slot_to_read(slot: MealSlot) -> MealSlotRead:
    return MealSlotRead(
        id=slot.id,
        week_plan_id=slot.week_plan_id,
        date=slot.date,
        meal_type=slot.meal_type,
        recipe_id=slot.recipe_id,
        is_leftover=slot.is_leftover,
        leftover_source_id=slot.leftover_source_id,
        notes=slot.notes,
        sort_order=slot.sort_order,
        recipe_name=slot.recipe.name if slot.recipe else None,
    )


def _plan_to_read(plan: WeekPlan) -> WeekPlanRead:
    return WeekPlanRead(
        id=plan.id,
        week_start=plan.week_start,
        notes=plan.notes,
        slots=[_slot_to_read(s) for s in plan.slots],
        created_at=plan.created_at,
    )


@router.get("", response_model=WeekPlanRead | None)
def get_week_plan(
    week_start: date = Query(...), db: Session = Depends(get_db)
) -> WeekPlanRead | None:
    plan = db.query(WeekPlan).filter(WeekPlan.week_start == week_start).first()
    if not plan:
        return None
    return _plan_to_read(plan)


@router.post("", response_model=WeekPlanRead, status_code=201)
def create_week_plan(
    data: WeekPlanCreate, db: Session = Depends(get_db)
) -> WeekPlanRead:
    existing = (
        db.query(WeekPlan).filter(WeekPlan.week_start == data.week_start).first()
    )
    if existing:
        raise HTTPException(400, "Week plan already exists for this date")
    plan = WeekPlan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_to_read(plan)


@router.put("/{plan_id}", response_model=WeekPlanRead)
def update_week_plan(
    plan_id: int, data: WeekPlanUpdate, db: Session = Depends(get_db)
) -> WeekPlanRead:
    plan = db.query(WeekPlan).get(plan_id)
    if not plan:
        raise HTTPException(404, "Week plan not found")
    if data.notes is not None:
        plan.notes = data.notes
    db.commit()
    db.refresh(plan)
    return _plan_to_read(plan)


@router.post("/{plan_id}/slots", response_model=MealSlotRead, status_code=201)
def add_meal_slot(
    plan_id: int, data: MealSlotCreate, db: Session = Depends(get_db)
) -> MealSlotRead:
    plan = db.query(WeekPlan).get(plan_id)
    if not plan:
        raise HTTPException(404, "Week plan not found")
    slot = MealSlot(week_plan_id=plan_id, **data.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return _slot_to_read(slot)


@router.put("/{plan_id}/slots/{slot_id}", response_model=MealSlotRead)
def update_meal_slot(
    plan_id: int,
    slot_id: int,
    data: MealSlotUpdate,
    db: Session = Depends(get_db),
) -> MealSlotRead:
    slot = (
        db.query(MealSlot)
        .filter(MealSlot.id == slot_id, MealSlot.week_plan_id == plan_id)
        .first()
    )
    if not slot:
        raise HTTPException(404, "Meal slot not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(slot, field, value)

    db.commit()
    db.refresh(slot)
    return _slot_to_read(slot)


@router.delete("/{plan_id}/slots/{slot_id}", status_code=204)
def delete_meal_slot(
    plan_id: int, slot_id: int, db: Session = Depends(get_db)
) -> None:
    slot = (
        db.query(MealSlot)
        .filter(MealSlot.id == slot_id, MealSlot.week_plan_id == plan_id)
        .first()
    )
    if not slot:
        raise HTTPException(404, "Meal slot not found")
    db.delete(slot)
    db.commit()
