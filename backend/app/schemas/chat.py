from datetime import datetime

from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    context_type: str = "general"
    week_plan_id: int | None = None
    recipe_id: int | None = None


class ChatSessionRead(BaseModel):
    id: int
    context_type: str
    week_plan_id: int | None = None
    recipe_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageRead(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
