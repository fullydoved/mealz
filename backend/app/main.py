from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, grocery, ingredients, meal_plans, recipes

app = FastAPI(title="Mealz", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes.router)
app.include_router(ingredients.router)
app.include_router(meal_plans.router)
app.include_router(grocery.router)
app.include_router(chat.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
