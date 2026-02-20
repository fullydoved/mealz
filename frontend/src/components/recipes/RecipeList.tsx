import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchRecipes } from "../../api";
import Card from "../ui/Card";
import Button from "../ui/Button";

interface Props {
  onSelect: (id: number) => void;
  onCreateNew: () => void;
}

export default function RecipeList({ onSelect, onCreateNew }: Props) {
  const [search, setSearch] = useState("");
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes", search],
    queryFn: () => fetchRecipes(search || undefined),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <Button onClick={onCreateNew}>+ New Recipe</Button>
      </div>

      {isLoading ? (
        <p className="text-stone-400">Loading recipes...</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <p className="text-lg mb-2">No recipes yet</p>
          <p>Create your first recipe to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              onClick={() => onSelect(recipe.id)}
              className="p-4"
            >
              <h3 className="font-semibold text-stone-100 mb-1">
                {recipe.name}
              </h3>
              {recipe.description && (
                <p className="text-sm text-stone-400 mb-2 line-clamp-2">
                  {recipe.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span>{recipe.servings} servings</span>
                {recipe.prep_time_min && (
                  <span>{recipe.prep_time_min}m prep</span>
                )}
                {recipe.cook_time_min && (
                  <span>{recipe.cook_time_min}m cook</span>
                )}
              </div>
              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-amber-900/40 text-amber-400 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
