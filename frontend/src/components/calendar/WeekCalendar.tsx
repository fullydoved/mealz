import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMealSlot,
  createWeekPlan,
  deleteMealSlot,
  fetchWeekPlan,
  updateMealSlot,
} from "../../api";
import type { MealSlot, RecipeSummary, WeekPlan } from "../../types";
import Button from "../ui/Button";
import DayCell from "./DayColumn";
import MealSlotCard from "./MealSlotCard";
import RecipePicker from "./RecipePicker";

interface Props {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const DAY_HEADERS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

export default function MonthCalendar({
  currentMonth,
  onPrev,
  onNext,
  onToday,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeSlot, setActiveSlot] = useState<MealSlot | null>(null);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Compute grid dates and week starts
  const { days, weekStartDates } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 6 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });

    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const starts: string[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      starts.push(format(allDays[i], "yyyy-MM-dd"));
    }

    return { days: allDays, weekStartDates: starts };
  }, [currentMonth]);

  // Query all relevant week plans
  const weekPlanQueries = useQueries({
    queries: weekStartDates.map((ws) => ({
      queryKey: ["weekPlan", ws],
      queryFn: () => fetchWeekPlan(ws),
    })),
  });

  // Build slot lookup and plan lookup
  const { slotsByDate, planForWeekStart } = useMemo(() => {
    const sbd: Record<string, MealSlot[]> = {};
    const pws: Record<string, WeekPlan> = {};

    weekPlanQueries.forEach((query, idx) => {
      const plan = query.data;
      if (!plan) return;
      pws[weekStartDates[idx]] = plan;

      for (const slot of plan.slots) {
        if (!sbd[slot.date]) sbd[slot.date] = [];
        sbd[slot.date].push(slot);
      }
    });

    for (const date of Object.keys(sbd)) {
      sbd[date].sort((a, b) => a.sort_order - b.sort_order);
    }

    return { slotsByDate: sbd, planForWeekStart: pws };
  }, [weekPlanQueries, weekStartDates]);

  const getWeekStartForDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return format(startOfWeek(d, { weekStartsOn: 6 }), "yyyy-MM-dd");
  };

  const ensurePlan = async (dateStr: string) => {
    const ws = getWeekStartForDate(dateStr);
    const existing = planForWeekStart[ws];
    if (existing) return existing;
    return createWeekPlan({ week_start: ws });
  };

  const invalidateAll = () => {
    weekStartDates.forEach((ws) =>
      queryClient.invalidateQueries({ queryKey: ["weekPlan", ws] }),
    );
  };

  const addSlotMutation = useMutation({
    mutationFn: async ({
      date,
      recipe,
    }: {
      date: string;
      recipe: RecipeSummary;
    }) => {
      const plan = await ensurePlan(date);
      const existing = slotsByDate[date] || [];
      return addMealSlot(plan.id, {
        date,
        meal_type: "dinner",
        recipe_id: recipe.id,
        sort_order: existing.length,
      });
    },
    onSuccess: invalidateAll,
  });

  const updateSlotMutation = useMutation({
    mutationFn: async ({
      slot,
      data,
    }: {
      slot: MealSlot;
      data: Partial<MealSlot>;
    }) => {
      return updateMealSlot(slot.week_plan_id, slot.id, data);
    },
    onSuccess: invalidateAll,
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slot: MealSlot) => {
      return deleteMealSlot(slot.week_plan_id, slot.id);
    },
    onSuccess: invalidateAll,
  });

  const handleDragStart = (event: DragStartEvent) => {
    for (const slots of Object.values(slotsByDate)) {
      const found = slots.find((s) => s.id === event.active.id);
      if (found) {
        setActiveSlot(found);
        return;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSlot(null);
    const { active, over } = event;
    if (!over) return;

    const slotId = active.id as number;
    const targetDate = over.id as string;

    let foundSlot: MealSlot | null = null;
    for (const slots of Object.values(slotsByDate)) {
      const found = slots.find((s) => s.id === slotId);
      if (found) {
        foundSlot = found;
        break;
      }
    }
    if (!foundSlot || foundSlot.date === targetDate) return;

    updateSlotMutation.mutate({ slot: foundSlot, data: { date: targetDate } });
  };

  const isLoading = weekPlanQueries.some((q) => q.isLoading);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onPrev}>
            &larr;
          </Button>
          <h2 className="text-lg font-semibold text-stone-200">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="sm" onClick={onNext}>
            &rarr;
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
      </div>

      {isLoading ? (
        <p className="text-stone-400">Loading...</p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-stone-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const slots = slotsByDate[dateStr] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <DayCell
                  key={dateStr}
                  date={dateStr}
                  dayNum={format(day, "d")}
                  inMonth={inMonth}
                  isToday={today}
                  slots={slots}
                  onAddMeal={() => setPickerTarget(dateStr)}
                  onToggleLeftover={(slot) =>
                    updateSlotMutation.mutate({
                      slot,
                      data: { is_leftover: !slot.is_leftover },
                    })
                  }
                  onDeleteSlot={(slot) => deleteSlotMutation.mutate(slot)}
                  onViewRecipe={(recipeId) => navigate(`/recipes/${recipeId}`)}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeSlot && (
              <MealSlotCard slot={activeSlot} isDragging compact />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {pickerTarget && (
        <RecipePicker
          onSelect={(recipe) => {
            addSlotMutation.mutate({ date: pickerTarget, recipe });
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
