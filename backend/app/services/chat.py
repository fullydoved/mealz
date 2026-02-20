import json
import traceback
from collections.abc import AsyncGenerator
from datetime import date

import anthropic
from sqlalchemy.orm import Session

from app.config import settings
from app.models.chat import ChatMessage, ChatSession
from app.models.meal_plan import MealSlot, WeekPlan
from app.models.recipe import Recipe
from app.services.tool_executor import (
    execute_add_to_plan,
    execute_create_recipe,
    execute_update_recipe,
)

SYSTEM_PROMPT = """You are a helpful sous chef assistant for a couple planning their weekly meals. Your role is to:

- Help plan meals for 2 people
- Suggest recipes based on preferences, seasons, and variety
- All measurements should be in grams (metric system)
- Explain cooking processes clearly and in detail
- Help modify existing recipes or suggest alternatives
- Consider variety - avoid suggesting the same cuisine/protein back to back
- Be friendly, encouraging, and practical

When suggesting recipes, include:
- Name and brief description
- Approximate prep and cook times
- Key ingredients with quantities in grams
- Clear step-by-step instructions

You have tools to create recipes, update existing recipes, and add meals to the weekly plan. When the user asks you to save a recipe, plan a meal, or add something to the calendar, use the appropriate tool proactively. When the user asks to modify an existing recipe (change ingredients, remove something, adjust quantities), use the update_recipe tool instead of creating a new one. After using a tool, confirm what you did in your response text."""

TOOLS = [
    {
        "name": "create_recipe",
        "description": "Create and save a new recipe with ingredients to the database. Use this when the user asks to save, create, or keep a recipe.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Recipe name",
                },
                "description": {
                    "type": "string",
                    "description": "Short description of the dish",
                },
                "servings": {
                    "type": "integer",
                    "description": "Number of servings (default 2)",
                    "default": 2,
                },
                "prep_time_min": {
                    "type": "integer",
                    "description": "Preparation time in minutes",
                },
                "cook_time_min": {
                    "type": "integer",
                    "description": "Cooking time in minutes",
                },
                "instructions": {
                    "type": "string",
                    "description": "Step-by-step cooking instructions in markdown",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tags like 'chicken', 'quick', 'asian'",
                },
                "ingredients": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Ingredient name",
                            },
                            "category": {
                                "type": "string",
                                "enum": [
                                    "produce",
                                    "meat",
                                    "dairy",
                                    "pantry",
                                    "frozen",
                                    "bakery",
                                    "other",
                                ],
                                "description": "Grocery category",
                            },
                            "quantity": {
                                "type": "number",
                                "description": "Amount needed",
                            },
                            "unit": {
                                "type": "string",
                                "enum": ["g", "ml", "unit"],
                                "description": "Unit of measurement",
                            },
                            "preparation": {
                                "type": "string",
                                "description": "How to prepare, e.g. 'diced', 'minced'",
                            },
                            "optional": {
                                "type": "boolean",
                                "description": "Whether the ingredient is optional",
                                "default": False,
                            },
                        },
                        "required": ["name", "quantity", "unit"],
                    },
                    "description": "List of ingredients with quantities",
                },
            },
            "required": ["name", "instructions", "ingredients"],
        },
    },
    {
        "name": "update_recipe",
        "description": "Update an existing recipe. Use this when the user wants to modify, change, or fix a recipe that already exists — for example removing an ingredient, changing quantities, or updating instructions. Do NOT create a new recipe when the user wants to change an existing one.",
        "input_schema": {
            "type": "object",
            "properties": {
                "recipe_name": {
                    "type": "string",
                    "description": "Current name of the recipe to update",
                },
                "new_name": {
                    "type": "string",
                    "description": "New name for the recipe (only if renaming)",
                },
                "description": {
                    "type": "string",
                    "description": "Updated description",
                },
                "servings": {
                    "type": "integer",
                    "description": "Updated number of servings",
                },
                "prep_time_min": {
                    "type": "integer",
                    "description": "Updated prep time in minutes",
                },
                "cook_time_min": {
                    "type": "integer",
                    "description": "Updated cook time in minutes",
                },
                "instructions": {
                    "type": "string",
                    "description": "Updated instructions in markdown",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Updated tags",
                },
                "ingredients": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Ingredient name",
                            },
                            "category": {
                                "type": "string",
                                "enum": [
                                    "produce",
                                    "meat",
                                    "dairy",
                                    "pantry",
                                    "frozen",
                                    "bakery",
                                    "other",
                                ],
                                "description": "Grocery category",
                            },
                            "quantity": {
                                "type": "number",
                                "description": "Amount needed",
                            },
                            "unit": {
                                "type": "string",
                                "enum": ["g", "ml", "unit"],
                                "description": "Unit of measurement",
                            },
                            "preparation": {
                                "type": "string",
                                "description": "How to prepare, e.g. 'diced', 'minced'",
                            },
                            "optional": {
                                "type": "boolean",
                                "description": "Whether the ingredient is optional",
                                "default": False,
                            },
                        },
                        "required": ["name", "quantity", "unit"],
                    },
                    "description": "Complete updated ingredient list (replaces all existing ingredients)",
                },
            },
            "required": ["recipe_name"],
        },
    },
    {
        "name": "add_to_plan",
        "description": "Add a recipe to the weekly meal plan on a specific date. The recipe must already exist (create it first if needed).",
        "input_schema": {
            "type": "object",
            "properties": {
                "recipe_name": {
                    "type": "string",
                    "description": "Name of the recipe to add (must match an existing recipe)",
                },
                "date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format",
                },
                "meal_type": {
                    "type": "string",
                    "enum": ["breakfast", "lunch", "dinner"],
                    "description": "Which meal slot",
                    "default": "dinner",
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes for this meal slot",
                },
            },
            "required": ["recipe_name", "date"],
        },
    },
]

TOOL_LABELS = {
    "create_recipe": "Creating recipe...",
    "update_recipe": "Updating recipe...",
    "add_to_plan": "Adding to meal plan...",
}


def build_context_messages(db: Session, session: ChatSession) -> str:
    context_parts = []

    if session.context_type == "week_plan" and session.week_plan_id:
        plan = db.query(WeekPlan).get(session.week_plan_id)
        if plan:
            slots = (
                db.query(MealSlot)
                .filter(MealSlot.week_plan_id == plan.id)
                .order_by(MealSlot.date, MealSlot.sort_order)
                .all()
            )
            meals_text = []
            for slot in slots:
                name = slot.recipe.name if slot.recipe else "No recipe"
                leftover = " (leftover)" if slot.is_leftover else ""
                meals_text.append(
                    f"- {slot.date} {slot.meal_type}: {name}{leftover}"
                )
            if meals_text:
                context_parts.append(
                    f"Current week plan (starting {plan.week_start}):\n"
                    + "\n".join(meals_text)
                )

    elif session.context_type == "recipe" and session.recipe_id:
        recipe = db.query(Recipe).get(session.recipe_id)
        if recipe:
            ingredients_text = []
            for ri in recipe.ingredients:
                prep = f", {ri.preparation}" if ri.preparation else ""
                ingredients_text.append(
                    f"- {ri.ingredient.name}: {ri.quantity}{ri.unit}{prep}"
                )
            context_parts.append(
                f"Current recipe: {recipe.name}\n"
                f"Description: {recipe.description or 'N/A'}\n"
                f"Servings: {recipe.servings}\n"
                f"Ingredients:\n" + "\n".join(ingredients_text) + "\n"
                f"Instructions:\n{recipe.instructions or 'N/A'}"
            )

    return "\n\n".join(context_parts)


def _execute_tool(db: Session, name: str, input_data: dict) -> dict:
    if name == "create_recipe":
        return execute_create_recipe(db, input_data)
    elif name == "update_recipe":
        return execute_update_recipe(db, input_data)
    elif name == "add_to_plan":
        return execute_add_to_plan(db, input_data)
    else:
        raise ValueError(f"Unknown tool: {name}")


async def stream_chat_response(
    db: Session, session: ChatSession, user_message: str
) -> AsyncGenerator[str, None]:
    # Save user message
    user_msg = ChatMessage(
        session_id=session.id, role="user", content=user_message
    )
    db.add(user_msg)
    db.commit()

    # Build messages for API
    today = date.today()
    weekday = today.strftime("%A")
    context = build_context_messages(db, session)
    system = SYSTEM_PROMPT + f"\n\nToday is {weekday}, {today.isoformat()}. Use this to resolve relative dates like 'tomorrow', 'next Monday', 'this weekend', etc. The planning week runs Saturday through Friday."
    if context:
        system += f"\n\n{context}"

    # Get recent messages (sliding window)
    recent_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
        .all()
    )
    recent_messages.reverse()

    api_messages = [
        {"role": msg.role, "content": msg.content} for msg in recent_messages
    ]

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    full_text_response = ""

    # Tool-use loop
    while True:
        # Collect the full response (text + tool_use blocks)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=system,
            messages=api_messages,
            tools=TOOLS,
        )

        # Process content blocks — stream text, track tool calls
        assistant_content = response.content
        for block in assistant_content:
            if block.type == "text":
                # Yield text in small chunks for streaming feel
                text = block.text
                full_text_response += text
                # Send in chunks to simulate streaming
                chunk_size = 20
                for i in range(0, len(text), chunk_size):
                    chunk = text[i : i + chunk_size]
                    yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
            elif block.type == "tool_use":
                label = TOOL_LABELS.get(block.name, f"Using {block.name}...")
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': block.name, 'label': label})}\n\n"

        if response.stop_reason != "tool_use":
            break

        # Execute tool calls and build tool results
        tool_results = []
        for block in assistant_content:
            if block.type == "tool_use":
                try:
                    result = _execute_tool(db, block.name, block.input)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result),
                        }
                    )
                    yield f"data: {json.dumps({'type': 'tool_done', 'tool': block.name, 'result': result})}\n\n"
                except Exception as e:
                    error_msg = str(e)
                    traceback.print_exc()
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps({"error": error_msg}),
                            "is_error": True,
                        }
                    )
                    yield f"data: {json.dumps({'type': 'tool_error', 'tool': block.name, 'error': error_msg})}\n\n"

        # Append assistant message and tool results for next iteration
        api_messages.append({"role": "assistant", "content": response.model_dump()["content"]})
        api_messages.append({"role": "user", "content": tool_results})

    # Save assistant message (text only, no tool JSON)
    if full_text_response:
        assistant_msg = ChatMessage(
            session_id=session.id, role="assistant", content=full_text_response
        )
        db.add(assistant_msg)
        db.commit()

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
