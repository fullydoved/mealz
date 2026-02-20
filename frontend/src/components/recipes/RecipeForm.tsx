import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  createIngredient,
  createRecipe,
  fetchIngredients,
  fetchRecipe,
  updateRecipe,
} from "../../api";
import type { RecipeIngredientInput } from "../../types";
import Button from "../ui/Button";

interface Props {
  recipeId?: number | null;
  onDone: () => void;
}

interface IngredientRow extends RecipeIngredientInput {
  _name?: string;
}

export default function RecipeForm({ recipeId, onDone }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState(2);
  const [prepTime, setPrepTime] = useState<string>("");
  const [cookTime, setCookTime] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");

  const { data: availableIngredients = [] } = useQuery({
    queryKey: ["ingredients", ingredientSearch],
    queryFn: () => fetchIngredients(ingredientSearch || undefined),
    enabled: ingredientSearch.length > 0,
  });

  // Load existing recipe for editing
  const { data: existingRecipe } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => fetchRecipe(recipeId!),
    enabled: !!recipeId,
  });

  useEffect(() => {
    if (existingRecipe) {
      setName(existingRecipe.name);
      setDescription(existingRecipe.description || "");
      setServings(existingRecipe.servings);
      setPrepTime(existingRecipe.prep_time_min?.toString() || "");
      setCookTime(existingRecipe.cook_time_min?.toString() || "");
      setInstructions(existingRecipe.instructions || "");
      setTagsStr(existingRecipe.tags.join(", "));
      setIngredients(
        existingRecipe.ingredients.map((ri) => ({
          ingredient_id: ri.ingredient_id,
          quantity: ri.quantity,
          unit: ri.unit,
          preparation: ri.preparation,
          optional: ri.optional,
          _name: ri.ingredient_name || undefined,
        })),
      );
    }
  }, [existingRecipe]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const data = {
        name,
        description: description || null,
        servings,
        prep_time_min: prepTime ? parseInt(prepTime) : null,
        cook_time_min: cookTime ? parseInt(cookTime) : null,
        instructions: instructions || null,
        tags,
        ingredients: ingredients.map(({ _name, ...rest }) => rest),
      };
      if (recipeId) {
        return updateRecipe(recipeId, data);
      }
      return createRecipe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      if (recipeId) queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      onDone();
    },
  });

  const addIngredient = async (ingredientId: number, ingredientName: string) => {
    setIngredients([
      ...ingredients,
      {
        ingredient_id: ingredientId,
        quantity: 0,
        unit: "g",
        preparation: null,
        optional: false,
        _name: ingredientName,
      },
    ]);
    setIngredientSearch("");
  };

  const createAndAddIngredient = async () => {
    const newIngredient = await createIngredient({
      name: ingredientSearch.toLowerCase(),
      category: "other",
      default_unit: "g",
    });
    addIngredient(newIngredient.id, newIngredient.name);
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const updateIngredientRow = (
    idx: number,
    field: string,
    value: string | number | boolean,
  ) => {
    setIngredients(
      ingredients.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)),
    );
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-stone-100 mb-4">
        {recipeId ? "Edit Recipe" : "New Recipe"}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Servings
            </label>
            <input
              type="number"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Prep (min)
            </label>
            <input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Cook (min)
            </label>
            <input
              type="number"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="pasta, quick, italian"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-2">
            Ingredients
          </label>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <span className="text-sm text-stone-400 w-32 truncate">
                {ing._name || `#${ing.ingredient_id}`}
              </span>
              <input
                type="number"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredientRow(idx, "quantity", parseFloat(e.target.value) || 0)
                }
                className="w-20 px-2 py-1 bg-stone-800 border border-stone-600 rounded text-sm text-stone-100"
                placeholder="qty"
              />
              <select
                value={ing.unit}
                onChange={(e) => updateIngredientRow(idx, "unit", e.target.value)}
                className="px-2 py-1 bg-stone-800 border border-stone-600 rounded text-sm text-stone-100"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="unit">unit</option>
              </select>
              <input
                type="text"
                value={ing.preparation || ""}
                onChange={(e) =>
                  updateIngredientRow(idx, "preparation", e.target.value)
                }
                className="flex-1 px-2 py-1 bg-stone-800 border border-stone-600 rounded text-sm text-stone-100"
                placeholder="prep (e.g. diced)"
              />
              <button
                onClick={() => removeIngredient(idx)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                &times;
              </button>
            </div>
          ))}

          <div className="relative mt-2">
            <input
              type="text"
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              placeholder="Search or add ingredient..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {ingredientSearch && (
              <div className="absolute z-10 mt-1 w-full bg-stone-800 border border-stone-600 rounded-lg shadow-lg max-h-40 overflow-auto">
                {availableIngredients.map((ing) => (
                  <button
                    key={ing.id}
                    onClick={() => addIngredient(ing.id, ing.name)}
                    className="w-full text-left px-3 py-2 hover:bg-stone-700 text-sm text-stone-200"
                  >
                    {ing.name}{" "}
                    <span className="text-stone-500">({ing.category})</span>
                  </button>
                ))}
                <button
                  onClick={createAndAddIngredient}
                  className="w-full text-left px-3 py-2 hover:bg-amber-900/30 text-sm text-amber-400"
                >
                  + Create &quot;{ingredientSearch}&quot;
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : recipeId ? "Update" : "Create"}
          </Button>
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
        </div>
        {saveMutation.isError && (
          <p className="text-red-400 text-sm">
            Error: {(saveMutation.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
