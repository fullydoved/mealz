import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchGroceryList } from "../../api";
import type { GroceryList } from "../../types";

const CATEGORY_ORDER = [
  "produce",
  "meat",
  "dairy",
  "bakery",
  "frozen",
  "pantry",
  "other",
];

interface Props {
  planId: number | null;
}

export default function GroceryListView({ planId }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const { data: groceryList, isLoading } = useQuery({
    queryKey: ["groceryList", planId],
    queryFn: () => fetchGroceryList(planId!),
    enabled: !!planId,
  });

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!planId) {
    return (
      <p className="text-stone-500 text-center py-8">
        Create a meal plan first to generate a grocery list.
      </p>
    );
  }

  if (isLoading) return <p className="text-stone-400">Generating list...</p>;

  if (!groceryList || Object.keys(groceryList.categories).length === 0) {
    return (
      <p className="text-stone-500 text-center py-8">
        No ingredients needed. Add some meals to your plan!
      </p>
    );
  }

  const sortedCategories = CATEGORY_ORDER.filter(
    (c) => groceryList.categories[c],
  );

  return (
    <div className="space-y-6 max-w-lg">
      {sortedCategories.map((category) => (
        <div key={category}>
          <h3 className="font-semibold text-stone-200 capitalize mb-2">
            {category}
          </h3>
          <ul className="space-y-1">
            {groceryList.categories[category].map((item) => {
              const key = `${item.ingredient_id}-${item.unit}`;
              const isChecked = checked.has(key);
              return (
                <li
                  key={key}
                  className={`flex items-center gap-3 py-1 px-2 rounded hover:bg-stone-800 ${
                    isChecked ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(key)}
                    className="accent-amber-600"
                  />
                  <span
                    className={`flex-1 ${isChecked ? "line-through text-stone-500" : "text-stone-300"}`}
                  >
                    <span className="font-medium">
                      {item.total_quantity}
                      {item.unit}
                    </span>{" "}
                    {item.ingredient_name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {item.recipes.join(", ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
