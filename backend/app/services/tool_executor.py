import json
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.meal_plan import MealSlot, WeekPlan
from app.models.recipe import Recipe, RecipeIngredient


def find_or_create_ingredient(
    db: Session, name: str, category: str = "other", default_unit: str = "g"
) -> Ingredient:
    existing = (
        db.query(Ingredient)
        .filter(func.lower(Ingredient.name) == name.strip().lower())
        .first()
    )
    if existing:
        return existing
    ingredient = Ingredient(
        name=name.strip(), category=category, default_unit=default_unit
    )
    db.add(ingredient)
    db.flush()
    return ingredient


def execute_create_recipe(db: Session, input_data: dict) -> dict:
    recipe = Recipe(
        name=input_data["name"],
        description=input_data.get("description"),
        servings=input_data.get("servings", 2),
        prep_time_min=input_data.get("prep_time_min"),
        cook_time_min=input_data.get("cook_time_min"),
        instructions=input_data.get("instructions"),
        tags=json.dumps(input_data.get("tags", [])),
    )
    db.add(recipe)
    db.flush()

    for ing_data in input_data.get("ingredients", []):
        ingredient = find_or_create_ingredient(
            db,
            name=ing_data["name"],
            category=ing_data.get("category", "other"),
            default_unit=ing_data.get("unit", "g"),
        )
        ri = RecipeIngredient(
            recipe_id=recipe.id,
            ingredient_id=ingredient.id,
            quantity=ing_data.get("quantity", 0),
            unit=ing_data.get("unit", "g"),
            preparation=ing_data.get("preparation"),
            optional=ing_data.get("optional", False),
        )
        db.add(ri)

    db.commit()
    return {"recipe_id": recipe.id, "recipe_name": recipe.name}


def execute_update_recipe(db: Session, input_data: dict) -> dict:
    recipe_name = input_data["recipe_name"]
    recipe = (
        db.query(Recipe)
        .filter(func.lower(Recipe.name) == recipe_name.strip().lower())
        .first()
    )
    if not recipe:
        raise ValueError(f"Recipe '{recipe_name}' not found")

    # Update scalar fields if provided
    if "new_name" in input_data:
        recipe.name = input_data["new_name"]
    if "description" in input_data:
        recipe.description = input_data["description"]
    if "servings" in input_data:
        recipe.servings = input_data["servings"]
    if "prep_time_min" in input_data:
        recipe.prep_time_min = input_data["prep_time_min"]
    if "cook_time_min" in input_data:
        recipe.cook_time_min = input_data["cook_time_min"]
    if "instructions" in input_data:
        recipe.instructions = input_data["instructions"]
    if "tags" in input_data:
        recipe.tags = json.dumps(input_data["tags"])

    # Replace ingredients if provided
    if "ingredients" in input_data:
        # Delete existing recipe ingredients
        db.query(RecipeIngredient).filter(
            RecipeIngredient.recipe_id == recipe.id
        ).delete()
        db.flush()

        for ing_data in input_data["ingredients"]:
            ingredient = find_or_create_ingredient(
                db,
                name=ing_data["name"],
                category=ing_data.get("category", "other"),
                default_unit=ing_data.get("unit", "g"),
            )
            ri = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredient.id,
                quantity=ing_data.get("quantity", 0),
                unit=ing_data.get("unit", "g"),
                preparation=ing_data.get("preparation"),
                optional=ing_data.get("optional", False),
            )
            db.add(ri)

    db.commit()
    return {"recipe_id": recipe.id, "recipe_name": recipe.name}


def execute_add_to_plan(db: Session, input_data: dict) -> dict:
    recipe_name = input_data["recipe_name"]
    recipe = (
        db.query(Recipe)
        .filter(func.lower(Recipe.name) == recipe_name.strip().lower())
        .first()
    )
    if not recipe:
        raise ValueError(f"Recipe '{recipe_name}' not found")

    slot_date = date.fromisoformat(input_data["date"])
    # Compute Saturday start of that week (Sat-Fri weeks)
    days_since_saturday = (slot_date.weekday() - 5) % 7
    week_start = slot_date - timedelta(days=days_since_saturday)

    week_plan = (
        db.query(WeekPlan).filter(WeekPlan.week_start == week_start).first()
    )
    if not week_plan:
        week_plan = WeekPlan(week_start=week_start)
        db.add(week_plan)
        db.flush()

    meal_type = input_data.get("meal_type", "dinner")
    slot = MealSlot(
        week_plan_id=week_plan.id,
        date=slot_date,
        meal_type=meal_type,
        recipe_id=recipe.id,
        notes=input_data.get("notes"),
    )
    db.add(slot)
    db.commit()

    return {
        "meal_slot_id": slot.id,
        "date": slot_date.isoformat(),
        "recipe_name": recipe.name,
        "week_plan_id": week_plan.id,
    }
