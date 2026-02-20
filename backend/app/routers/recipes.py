import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe, RecipeIngredient
from app.schemas.recipe import (
    RecipeCreate,
    RecipeRead,
    RecipeIngredientRead,
    RecipeSummary,
    RecipeUpdate,
)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _recipe_to_read(recipe: Recipe) -> RecipeRead:
    return RecipeRead(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        servings=recipe.servings,
        prep_time_min=recipe.prep_time_min,
        cook_time_min=recipe.cook_time_min,
        instructions=recipe.instructions,
        tags=recipe.tag_list,
        ingredients=[
            RecipeIngredientRead(
                id=ri.id,
                ingredient_id=ri.ingredient_id,
                quantity=ri.quantity,
                unit=ri.unit,
                preparation=ri.preparation,
                optional=ri.optional,
                ingredient_name=ri.ingredient.name,
                ingredient_category=ri.ingredient.category,
            )
            for ri in recipe.ingredients
        ],
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
    )


def _recipe_to_summary(recipe: Recipe) -> RecipeSummary:
    return RecipeSummary(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        servings=recipe.servings,
        prep_time_min=recipe.prep_time_min,
        cook_time_min=recipe.cook_time_min,
        tags=recipe.tag_list,
    )


@router.get("", response_model=list[RecipeSummary])
def list_recipes(
    search: str | None = Query(None),
    tag: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[RecipeSummary]:
    q = db.query(Recipe)
    if search:
        q = q.filter(Recipe.name.ilike(f"%{search}%"))
    if tag:
        q = q.filter(Recipe.tags.ilike(f'%"{tag}"%'))
    recipes = q.order_by(Recipe.name).all()
    return [_recipe_to_summary(r) for r in recipes]


@router.post("", response_model=RecipeRead, status_code=201)
def create_recipe(data: RecipeCreate, db: Session = Depends(get_db)) -> RecipeRead:
    recipe = Recipe(
        name=data.name,
        description=data.description,
        servings=data.servings,
        prep_time_min=data.prep_time_min,
        cook_time_min=data.cook_time_min,
        instructions=data.instructions,
        tags=json.dumps(data.tags),
    )
    db.add(recipe)
    db.flush()

    for ing_data in data.ingredients:
        ingredient = db.query(Ingredient).get(ing_data.ingredient_id)
        if not ingredient:
            raise HTTPException(400, f"Ingredient {ing_data.ingredient_id} not found")
        ri = RecipeIngredient(
            recipe_id=recipe.id,
            **ing_data.model_dump(),
        )
        db.add(ri)

    db.commit()
    db.refresh(recipe)
    return _recipe_to_read(recipe)


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)) -> RecipeRead:
    recipe = db.query(Recipe).get(recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    return _recipe_to_read(recipe)


@router.put("/{recipe_id}", response_model=RecipeRead)
def update_recipe(
    recipe_id: int, data: RecipeUpdate, db: Session = Depends(get_db)
) -> RecipeRead:
    recipe = db.query(Recipe).get(recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    if data.name is not None:
        recipe.name = data.name
    if data.description is not None:
        recipe.description = data.description
    if data.servings is not None:
        recipe.servings = data.servings
    if data.prep_time_min is not None:
        recipe.prep_time_min = data.prep_time_min
    if data.cook_time_min is not None:
        recipe.cook_time_min = data.cook_time_min
    if data.instructions is not None:
        recipe.instructions = data.instructions
    if data.tags is not None:
        recipe.tags = json.dumps(data.tags)

    if data.ingredients is not None:
        # Replace all ingredients
        for ri in recipe.ingredients:
            db.delete(ri)
        db.flush()
        for ing_data in data.ingredients:
            ingredient = db.query(Ingredient).get(ing_data.ingredient_id)
            if not ingredient:
                raise HTTPException(
                    400, f"Ingredient {ing_data.ingredient_id} not found"
                )
            ri = RecipeIngredient(recipe_id=recipe.id, **ing_data.model_dump())
            db.add(ri)

    db.commit()
    db.refresh(recipe)
    return _recipe_to_read(recipe)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)) -> None:
    recipe = db.query(Recipe).get(recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found")
    db.delete(recipe)
    db.commit()
