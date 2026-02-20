from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ingredient import Ingredient
from app.schemas.ingredient import IngredientCreate, IngredientRead

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])

CATEGORIES = ["produce", "meat", "dairy", "pantry", "frozen", "bakery", "other"]


@router.get("", response_model=list[IngredientRead])
def list_ingredients(
    search: str | None = Query(None),
    category: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[Ingredient]:
    q = db.query(Ingredient)
    if search:
        q = q.filter(Ingredient.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Ingredient.category == category)
    return q.order_by(Ingredient.name).all()


@router.post("", response_model=IngredientRead, status_code=201)
def create_ingredient(
    data: IngredientCreate, db: Session = Depends(get_db)
) -> Ingredient:
    existing = db.query(Ingredient).filter(Ingredient.name == data.name).first()
    if existing:
        raise HTTPException(400, "Ingredient already exists")
    ingredient = Ingredient(**data.model_dump())
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient


@router.get("/categories")
def list_categories() -> list[str]:
    return CATEGORIES
