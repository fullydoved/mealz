import { useDroppable } from "@dnd-kit/core";
import type { MealSlot } from "../../types";
import MealSlotCard from "./MealSlotCard";

interface Props {
  date: string;
  dayNum: string;
  inMonth: boolean;
  isToday: boolean;
  slots: MealSlot[];
  onAddMeal: () => void;
  onToggleLeftover: (slot: MealSlot) => void;
  onDeleteSlot: (slot: MealSlot) => void;
  onViewRecipe: (recipeId: number) => void;
}

export default function DayCell({
  date,
  dayNum,
  inMonth,
  isToday,
  slots,
  onAddMeal,
  onToggleLeftover,
  onDeleteSlot,
  onViewRecipe,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: date });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-24 rounded-lg border p-1.5 transition-colors ${
        isOver
          ? "border-amber-500 bg-amber-900/30"
          : isToday
            ? "border-amber-600 bg-amber-900/20"
            : inMonth
              ? "border-stone-700 bg-stone-800"
              : "border-stone-800 bg-stone-900/50"
      }`}
    >
      <div
        className={`text-xs font-medium mb-1 ${
          isToday
            ? "text-amber-500"
            : inMonth
              ? "text-stone-300"
              : "text-stone-600"
        }`}
      >
        {dayNum}
      </div>

      <div className="space-y-0.5">
        {slots.map((slot) => (
          <MealSlotCard
            key={slot.id}
            slot={slot}
            compact
            onToggleLeftover={() => onToggleLeftover(slot)}
            onDelete={() => onDeleteSlot(slot)}
            onViewRecipe={
              slot.recipe_id
                ? () => onViewRecipe(slot.recipe_id!)
                : undefined
            }
          />
        ))}
      </div>

      {inMonth && (
        <button
          onClick={onAddMeal}
          className="w-full mt-1 py-0.5 text-[10px] text-stone-500 hover:text-amber-400 hover:bg-amber-900/30 rounded transition-colors"
        >
          +
        </button>
      )}
    </div>
  );
}
