from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.meal_plan import MealSlot, WeekPlan
from app.models.recipe import RecipeIngredient
from app.schemas.grocery import GroceryItem, GroceryList


def generate_grocery_list(db: Session, week_plan: WeekPlan) -> GroceryList:
    # Collect all non-leftover slots with recipes
    slots = (
        db.query(MealSlot)
        .filter(
            MealSlot.week_plan_id == week_plan.id,
            MealSlot.is_leftover == False,  # noqa: E712
            MealSlot.recipe_id.isnot(None),
        )
        .all()
    )

    # Aggregate ingredients: key = (ingredient_id, unit)
    aggregated: dict[tuple[int, str], dict] = {}
    for slot in slots:
        recipe_ingredients = (
            db.query(RecipeIngredient)
            .filter(RecipeIngredient.recipe_id == slot.recipe_id)
            .all()
        )
        for ri in recipe_ingredients:
            key = (ri.ingredient_id, ri.unit)
            if key not in aggregated:
                aggregated[key] = {
                    "ingredient_id": ri.ingredient_id,
                    "ingredient_name": ri.ingredient.name,
                    "category": ri.ingredient.category,
                    "total_quantity": 0.0,
                    "unit": ri.unit,
                    "recipes": set(),
                }
            aggregated[key]["total_quantity"] += ri.quantity
            aggregated[key]["recipes"].add(slot.recipe.name)

    # Group by category
    categories: dict[str, list[GroceryItem]] = defaultdict(list)
    for data in sorted(aggregated.values(), key=lambda d: d["ingredient_name"]):
        item = GroceryItem(
            ingredient_id=data["ingredient_id"],
            ingredient_name=data["ingredient_name"],
            category=data["category"],
            total_quantity=data["total_quantity"],
            unit=data["unit"],
            recipes=sorted(data["recipes"]),
        )
        categories[data["category"]].append(item)

    return GroceryList(
        week_plan_id=week_plan.id,
        categories=dict(categories),
    )
