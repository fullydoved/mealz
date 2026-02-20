from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meal_plan import WeekPlan
from app.schemas.grocery import GroceryList
from app.services.grocery import generate_grocery_list

router = APIRouter(prefix="/api/meal-plans", tags=["grocery"])


@router.get("/{plan_id}/grocery-list", response_model=GroceryList)
def get_grocery_list(plan_id: int, db: Session = Depends(get_db)) -> GroceryList:
    plan = db.query(WeekPlan).get(plan_id)
    if not plan:
        raise HTTPException(404, "Week plan not found")
    return generate_grocery_list(db, plan)
