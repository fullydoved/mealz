import { useState } from "react";
import { addWeeks, startOfWeek, format } from "date-fns";

export function useWeekNavigation() {
  const [currentDate, setCurrentDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 6 }),
  );

  const weekStart = format(currentDate, "yyyy-MM-dd");

  const goToPrevWeek = () => setCurrentDate((d) => addWeeks(d, -1));
  const goToNextWeek = () => setCurrentDate((d) => addWeeks(d, 1));
  const goToCurrentWeek = () =>
    setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 6 }));

  return { currentDate, weekStart, goToPrevWeek, goToNextWeek, goToCurrentWeek };
}
