from pydantic import BaseModel


class GroceryItem(BaseModel):
    ingredient_id: int
    ingredient_name: str
    category: str
    total_quantity: float
    unit: str
    recipes: list[str]  # recipe names that need this ingredient


class GroceryList(BaseModel):
    week_plan_id: int
    categories: dict[str, list[GroceryItem]]
