import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { deleteRecipe, fetchRecipe } from "../../api";
import Button from "../ui/Button";

interface Props {
  recipeId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
}

export default function RecipeDetail({ recipeId, onBack, onEdit }: Props) {
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => fetchRecipe(recipeId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      onBack();
    },
  });

  if (isLoading || !recipe) return <p className="text-stone-400">Loading...</p>;

  return (
    <div>
      <button
        onClick={onBack}
        className="text-amber-500 hover:text-amber-400 mb-4 inline-block"
      >
        &larr; Back to recipes
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-100">{recipe.name}</h2>
          {recipe.description && (
            <p className="text-stone-400 mt-1">{recipe.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(recipeId)}>
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm("Delete this recipe?")) deleteMutation.mutate();
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-stone-400 mb-6">
        <span>{recipe.servings} servings</span>
        {recipe.prep_time_min && <span>{recipe.prep_time_min}m prep</span>}
        {recipe.cook_time_min && <span>{recipe.cook_time_min}m cook</span>}
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-amber-900/40 text-amber-400 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {recipe.ingredients.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-stone-200 mb-2">Ingredients</h3>
          <ul className="space-y-1">
            {recipe.ingredients.map((ri) => (
              <li key={ri.id} className="text-stone-300">
                <span className="font-medium">
                  {ri.quantity}
                  {ri.unit}
                </span>{" "}
                {ri.ingredient_name}
                {ri.preparation && (
                  <span className="text-stone-500">, {ri.preparation}</span>
                )}
                {ri.optional && (
                  <span className="text-stone-400 italic"> (optional)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.instructions && (
        <div>
          <h3 className="font-semibold text-stone-200 mb-2">Instructions</h3>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
