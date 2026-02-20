from datetime import datetime

from pydantic import BaseModel


class RecipeIngredientBase(BaseModel):
    ingredient_id: int
    quantity: float
    unit: str = "g"
    preparation: str | None = None
    optional: bool = False


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientRead(RecipeIngredientBase):
    id: int
    ingredient_name: str | None = None
    ingredient_category: str | None = None

    model_config = {"from_attributes": True}


class RecipeBase(BaseModel):
    name: str
    description: str | None = None
    servings: int = 2
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    instructions: str | None = None
    tags: list[str] = []


class RecipeCreate(RecipeBase):
    ingredients: list[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    servings: int | None = None
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    instructions: str | None = None
    tags: list[str] | None = None
    ingredients: list[RecipeIngredientCreate] | None = None


class RecipeRead(RecipeBase):
    id: int
    ingredients: list[RecipeIngredientRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecipeSummary(BaseModel):
    id: int
    name: str
    description: str | None = None
    servings: int
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    tags: list[str] = []

    model_config = {"from_attributes": True}
