export interface Ingredient {
  id: number;
  name: string;
  category: string;
  default_unit: string;
}

export interface RecipeIngredient {
  id: number;
  ingredient_id: number;
  quantity: number;
  unit: string;
  preparation: string | null;
  optional: boolean;
  ingredient_name: string | null;
  ingredient_category: string | null;
}

export interface RecipeIngredientInput {
  ingredient_id: number;
  quantity: number;
  unit: string;
  preparation?: string | null;
  optional?: boolean;
}

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  instructions: string | null;
  tags: string[];
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

export interface RecipeSummary {
  id: number;
  name: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  tags: string[];
}

export interface RecipeCreateInput {
  name: string;
  description?: string | null;
  servings?: number;
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  instructions?: string | null;
  tags?: string[];
  ingredients?: RecipeIngredientInput[];
}

export interface MealSlot {
  id: number;
  week_plan_id: number;
  date: string;
  meal_type: string;
  recipe_id: number | null;
  is_leftover: boolean;
  leftover_source_id: number | null;
  notes: string | null;
  sort_order: number;
  recipe_name: string | null;
}

export interface MealSlotInput {
  date: string;
  meal_type?: string;
  recipe_id?: number | null;
  is_leftover?: boolean;
  leftover_source_id?: number | null;
  notes?: string | null;
  sort_order?: number;
}

export interface WeekPlan {
  id: number;
  week_start: string;
  notes: string | null;
  slots: MealSlot[];
  created_at: string;
}

export interface GroceryItem {
  ingredient_id: number;
  ingredient_name: string;
  category: string;
  total_quantity: number;
  unit: string;
  recipes: string[];
}

export interface GroceryList {
  week_plan_id: number;
  categories: Record<string, GroceryItem[]>;
}

export interface ChatSession {
  id: number;
  context_type: string;
  week_plan_id: number | null;
  recipe_id: number | null;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type ChatStreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_done"; tool: string; result: Record<string, unknown> }
  | { type: "tool_error"; tool: string; error: string }
  | { type: "done" };
