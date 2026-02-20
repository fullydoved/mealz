from pydantic import BaseModel


class IngredientBase(BaseModel):
    name: str
    category: str = "other"
    default_unit: str = "g"


class IngredientCreate(IngredientBase):
    pass


class IngredientRead(IngredientBase):
    id: int

    model_config = {"from_attributes": True}
