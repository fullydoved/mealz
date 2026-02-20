import { useState } from "react";
import { Route, Routes, NavLink, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, addMonths } from "date-fns";
import RecipeList from "./components/recipes/RecipeList";
import RecipeDetail from "./components/recipes/RecipeDetail";
import RecipeForm from "./components/recipes/RecipeForm";
import MonthCalendar from "./components/calendar/WeekCalendar";
import GroceryListView from "./components/grocery/GroceryListView";
import ChatSidebar from "./components/chat/ChatSidebar";
import { useWeekNavigation } from "./hooks/useWeekNavigation";
import { fetchWeekPlan } from "./api";

function RecipesPage() {
  const [view, setView] = useState<
    { type: "list" } | { type: "detail"; id: number } | { type: "form"; id?: number }
  >({ type: "list" });

  switch (view.type) {
    case "list":
      return (
        <RecipeList
          onSelect={(id) => setView({ type: "detail", id })}
          onCreateNew={() => setView({ type: "form" })}
        />
      );
    case "detail":
      return (
        <RecipeDetail
          recipeId={view.id}
          onBack={() => setView({ type: "list" })}
          onEdit={(id) => setView({ type: "form", id })}
        />
      );
    case "form":
      return (
        <RecipeForm
          recipeId={view.id}
          onDone={() =>
            view.id
              ? setView({ type: "detail", id: view.id })
              : setView({ type: "list" })
          }
        />
      );
  }
}

function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const recipeId = Number(id);

  if (editing) {
    return (
      <div className="p-6">
        <RecipeForm recipeId={recipeId} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <RecipeDetail
        recipeId={recipeId}
        onBack={() => navigate(-1)}
        onEdit={() => setEditing(true)}
      />
    </div>
  );
}

function PlannerPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  return (
    <div className="flex-1 overflow-auto p-6">
      <MonthCalendar
        currentMonth={currentMonth}
        onPrev={() => setCurrentMonth((d) => addMonths(d, -1))}
        onNext={() => setCurrentMonth((d) => addMonths(d, 1))}
        onToday={() => setCurrentMonth(startOfMonth(new Date()))}
      />
    </div>
  );
}

function GroceryPage() {
  const { weekStart, currentDate, goToPrevWeek, goToNextWeek, goToCurrentWeek } =
    useWeekNavigation();

  const { data: plan } = useQuery({
    queryKey: ["weekPlan", weekStart],
    queryFn: () => fetchWeekPlan(weekStart),
  });

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={goToPrevWeek}
          className="text-stone-400 hover:text-stone-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-stone-200">
          Grocery List &mdash; Week of{" "}
          {currentDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={goToNextWeek}
          className="text-stone-400 hover:text-stone-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={goToCurrentWeek}
          className="ml-2 text-sm text-amber-500 hover:text-amber-400"
        >
          This week
        </button>
      </div>
      <GroceryListView planId={plan?.id ?? null} />
    </div>
  );
}

const CalendarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2H7v1a1 1 0 11-2 0v-1H4a1 1 0 110-2h1V8a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);

const CartIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
  </svg>
);

const ChefHatIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.5 2 7.5 3.5 7 5.5C5 5.5 3 7.5 3 10c0 2 1.5 3.5 3 4v6c0 .5.5 1 1 1h10c.5 0 1-.5 1-1v-6c1.5-.5 3-2 3-4 0-2.5-2-4.5-4-4.5C16.5 3.5 14.5 2 12 2z" />
  </svg>
);

const navLinks = [
  { to: "/", label: "Plan", icon: CalendarIcon },
  { to: "/recipes", label: "Recipes", icon: BookIcon },
  { to: "/grocery", label: "Grocery", icon: CartIcon },
];

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);

  // Week plan context for the chat — always track the current week
  const { weekStart } = useWeekNavigation();
  const { data: plan } = useQuery({
    queryKey: ["weekPlan", weekStart],
    queryFn: () => fetchWeekPlan(weekStart),
  });

  return (
    <div className="h-screen bg-stone-950 flex flex-col overflow-hidden">
      <nav className="h-16 bg-stone-900 border-b border-stone-700 flex items-center px-6 gap-8 shrink-0">
        <span className="flex items-center gap-2 text-xl font-bold text-amber-500">
          <ChefHatIcon />
          Mealz
        </span>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-amber-500 border-b-2 border-amber-500 pb-0.5"
                  : "text-stone-400 hover:text-stone-200"
              }`
            }
          >
            <link.icon />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<PlannerPage />} />
            <Route
              path="/recipes"
              element={
                <div className="p-6">
                  <RecipesPage />
                </div>
              }
            />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/grocery" element={<GroceryPage />} />
          </Routes>
        </main>

        {/* Chat sidebar — persists across all pages */}
        {chatOpen && (
          <div className="w-96 border-l border-stone-700 bg-stone-900 flex flex-col shrink-0">
            <div className="p-3 border-b border-stone-700 flex items-center justify-between">
              <h3 className="font-semibold text-stone-200">Sous Chef</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-stone-500 hover:text-stone-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <ChatSidebar
              contextType={plan ? "week_plan" : "general"}
              weekPlanId={plan?.id}
            />
          </div>
        )}
      </div>

      {/* Chat toggle button — hidden when sidebar is open */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-20 w-12 h-12 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 flex items-center justify-center"
          title="Chat with sous chef"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}
