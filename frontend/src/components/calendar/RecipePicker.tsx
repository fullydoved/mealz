import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchRecipes } from "../../api";
import type { RecipeSummary } from "../../types";
import Modal from "../ui/Modal";

interface Props {
  onSelect: (recipe: RecipeSummary) => void;
  onClose: () => void;
}

export default function RecipePicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes", search],
    queryFn: () => fetchRecipes(search || undefined),
  });

  return (
    <Modal open onClose={onClose} title="Pick a Recipe">
      <input
        type="text"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg mb-3 text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        autoFocus
      />
      <div className="max-h-80 overflow-auto space-y-1">
        {recipes.length === 0 ? (
          <p className="text-stone-500 text-center py-4">
            No recipes found. Create some first!
          </p>
        ) : (
          recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelect(recipe)}
              className="w-full text-left p-3 rounded-lg hover:bg-amber-900/30 transition-colors"
            >
              <div className="font-medium text-stone-100">{recipe.name}</div>
              {recipe.description && (
                <div className="text-sm text-stone-400 truncate">
                  {recipe.description}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
