from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WeekPlan(Base):
    __tablename__ = "week_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_start: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    slots: Mapped[list["MealSlot"]] = relationship(
        back_populates="week_plan", cascade="all, delete-orphan"
    )


class MealSlot(Base):
    __tablename__ = "meal_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("week_plans.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(20), default="dinner")
    recipe_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("recipes.id", ondelete="SET NULL")
    )
    is_leftover: Mapped[bool] = mapped_column(Boolean, default=False)
    leftover_source_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("meal_slots.id", ondelete="SET NULL")
    )
    notes: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    week_plan: Mapped["WeekPlan"] = relationship(back_populates="slots")
    recipe: Mapped["Recipe | None"] = relationship(
        "Recipe", foreign_keys=[recipe_id], lazy="joined"
    )
    leftover_source: Mapped["MealSlot | None"] = relationship(
        "MealSlot", remote_side=[id], foreign_keys=[leftover_source_id]
    )


from app.models.recipe import Recipe  # noqa: E402
