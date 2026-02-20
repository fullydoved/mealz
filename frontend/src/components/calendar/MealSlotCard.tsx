import { useDraggable } from "@dnd-kit/core";
import type { MealSlot } from "../../types";

interface Props {
  slot: MealSlot;
  isDragging?: boolean;
  compact?: boolean;
  onToggleLeftover?: () => void;
  onDelete?: () => void;
  onViewRecipe?: () => void;
}

export default function MealSlotCard({
  slot,
  isDragging,
  compact,
  onToggleLeftover,
  onDelete,
  onViewRecipe,
}: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: slot.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`group rounded px-1.5 py-0.5 text-[11px] cursor-grab active:cursor-grabbing flex items-center justify-between gap-1 ${
          isDragging
            ? "shadow-lg opacity-80"
            : slot.is_leftover
              ? "bg-green-900/40 text-green-300"
              : "bg-amber-900/40 text-amber-200"
        }`}
      >
        <span
          className={`truncate ${onViewRecipe ? "hover:underline cursor-pointer" : ""}`}
          onClick={(e) => {
            if (!onViewRecipe) return;
            e.stopPropagation();
            onViewRecipe();
          }}
        >
          {slot.recipe_name || slot.notes || "No recipe"}
        </span>
        {!isDragging && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="hidden group-hover:block text-stone-500 hover:text-stone-300 shrink-0"
            title="Remove"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md p-2 text-xs cursor-grab active:cursor-grabbing ${
        isDragging
          ? "shadow-lg opacity-80"
          : slot.is_leftover
            ? "bg-green-900/40 text-green-300 border border-green-800"
            : "bg-amber-900/40 text-amber-200 border border-amber-800"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`font-medium truncate ${onViewRecipe ? "hover:underline cursor-pointer" : ""}`}
          onClick={(e) => {
            if (!onViewRecipe) return;
            e.stopPropagation();
            onViewRecipe();
          }}
        >
          {slot.recipe_name || slot.notes || "No recipe"}
        </span>
        {!isDragging && (
          <div className="flex gap-1 shrink-0">
            {onToggleLeftover && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLeftover();
                }}
                className="hover:opacity-70"
                title={slot.is_leftover ? "Unmark leftover" : "Mark as leftover"}
              >
                {slot.is_leftover ? "🍱" : "🔄"}
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="hover:opacity-70"
                title="Remove"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>
      {slot.is_leftover && (
        <div className="text-[10px] text-green-400 mt-0.5">leftover</div>
      )}
    </div>
  );
}
