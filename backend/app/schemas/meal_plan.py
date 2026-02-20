import datetime as dt
from typing import Optional

from pydantic import BaseModel


class MealSlotBase(BaseModel):
    date: dt.date
    meal_type: str = "dinner"
    recipe_id: Optional[int] = None
    is_leftover: bool = False
    leftover_source_id: Optional[int] = None
    notes: Optional[str] = None
    sort_order: int = 0


class MealSlotCreate(MealSlotBase):
    pass


class MealSlotUpdate(BaseModel):
    date: Optional[dt.date] = None
    meal_type: Optional[str] = None
    recipe_id: Optional[int] = None
    is_leftover: Optional[bool] = None
    leftover_source_id: Optional[int] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class MealSlotRead(MealSlotBase):
    id: int
    week_plan_id: int
    recipe_name: Optional[str] = None

    model_config = {"from_attributes": True}


class WeekPlanBase(BaseModel):
    week_start: dt.date
    notes: Optional[str] = None


class WeekPlanCreate(WeekPlanBase):
    pass


class WeekPlanUpdate(BaseModel):
    notes: Optional[str] = None


class WeekPlanRead(WeekPlanBase):
    id: int
    slots: list[MealSlotRead] = []
    created_at: dt.datetime

    model_config = {"from_attributes": True}
