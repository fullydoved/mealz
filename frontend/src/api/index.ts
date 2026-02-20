import type {
  ChatMessage,
  ChatSession,
  ChatStreamEvent,
  GroceryList,
  Ingredient,
  MealSlot,
  MealSlotInput,
  Recipe,
  RecipeCreateInput,
  RecipeSummary,
  WeekPlan,
} from "../types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Ingredients
export const fetchIngredients = (search?: string) =>
  request<Ingredient[]>(
    `/api/ingredients${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const createIngredient = (data: {
  name: string;
  category: string;
  default_unit: string;
}) => request<Ingredient>("/api/ingredients", { method: "POST", body: JSON.stringify(data) });

export const fetchCategories = () =>
  request<string[]>("/api/ingredients/categories");

// Recipes
export const fetchRecipes = (search?: string, tag?: string) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return request<RecipeSummary[]>(`/api/recipes${qs ? `?${qs}` : ""}`);
};

export const fetchRecipe = (id: number) =>
  request<Recipe>(`/api/recipes/${id}`);

export const createRecipe = (data: RecipeCreateInput) =>
  request<Recipe>("/api/recipes", { method: "POST", body: JSON.stringify(data) });

export const updateRecipe = (id: number, data: Partial<RecipeCreateInput>) =>
  request<Recipe>(`/api/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteRecipe = (id: number) =>
  request<void>(`/api/recipes/${id}`, { method: "DELETE" });

// Meal Plans
export const fetchWeekPlan = (weekStart: string) =>
  request<WeekPlan | null>(`/api/meal-plans?week_start=${weekStart}`);

export const createWeekPlan = (data: { week_start: string; notes?: string }) =>
  request<WeekPlan>("/api/meal-plans", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWeekPlan = (id: number, data: { notes?: string }) =>
  request<WeekPlan>(`/api/meal-plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const addMealSlot = (planId: number, data: MealSlotInput) =>
  request<MealSlot>(`/api/meal-plans/${planId}/slots`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateMealSlot = (
  planId: number,
  slotId: number,
  data: Partial<MealSlotInput>,
) =>
  request<MealSlot>(`/api/meal-plans/${planId}/slots/${slotId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteMealSlot = (planId: number, slotId: number) =>
  request<void>(`/api/meal-plans/${planId}/slots/${slotId}`, {
    method: "DELETE",
  });

// Grocery
export const fetchGroceryList = (planId: number) =>
  request<GroceryList>(`/api/meal-plans/${planId}/grocery-list`);

// Chat
export const createChatSession = (data: {
  context_type: string;
  week_plan_id?: number;
  recipe_id?: number;
}) =>
  request<ChatSession>("/api/chat/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const fetchChatMessages = (sessionId: number) =>
  request<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`);

export async function* streamChatMessage(
  sessionId: number,
  content: string,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const event: ChatStreamEvent = JSON.parse(line.slice(6));
        yield event;
        if (event.type === "done") return;
      }
    }
  }
}
