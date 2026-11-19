import type { Domain } from "@/components/ui/Feedback";
import type { IconName } from "@/components/ui/Icon";
import type { Goal, GoalMetric } from "@/types";

export const METRIC_DOMAIN: Record<GoalMetric, Domain> = {
  water_ml: "water",
  activity_minutes: "move",
  who_minutes: "move",
  active_days: "move",
  fruit_veg_g: "food",
  meals_logged: "food",
  custom: "ink",
};

export const METRIC_ICON: Record<GoalMetric, IconName> = {
  water_ml: "water",
  activity_minutes: "activity",
  who_minutes: "activity",
  active_days: "calendar",
  fruit_veg_g: "food",
  meals_logged: "list",
  custom: "target",
};

export function goalIcon(goal: Goal): IconName {
  if (goal.metric === "custom" && goal.unit === "h") return "moon";
  return METRIC_ICON[goal.metric];
}

export function periodLabel(goal: Pick<Goal, "period">): string {
  return goal.period === "daily" ? "Hoje" : "Últimos 7 dias";
}

export const DOMAIN_ICON_TONE: Record<Domain, string> = {
  water: "bg-water-soft text-water-ink",
  food: "bg-food-soft text-food-ink",
  move: "bg-move-soft text-move-ink",
  habit: "bg-habit-soft text-habit-ink",
  ink: "bg-mist text-ink",
};
