import type { ActivityEntry, DateKey, FoodEntry, Goal, GoalCheckin, WaterEntry } from "@/types";
import { addDays, lastNDays } from "@/utils/date";
import { formatLiters, formatMinutes, formatMl, formatNumber, plural } from "@/utils/format";
import { moderateEquivalentMinutes } from "./activity";
import { waterTotalOn } from "./hydration";
import { entriesOn } from "./nutrition";

/**
 * Progresso de metas.
 *
 * - Metas diárias olham apenas o dia consultado.
 * - Metas semanais somam os últimos 7 dias (incluindo o dia consultado). A janela é
 *   móvel: não existe "segunda-feira zerada" nem perda de sequência.
 * - Metas automáticas (água, atividade, frutas/legumes/verduras, refeições) leem os
 *   registros; metas personalizadas leem os check-ins do usuário.
 */

export interface GoalDataContext {
  foodEntries: FoodEntry[];
  waterEntries: WaterEntry[];
  activityEntries: ActivityEntry[];
  goalCheckins: GoalCheckin[];
  /** Meta diária de água atual do perfil, usada pelas metas vinculadas. */
  waterGoalMl?: number;
}

/** Alvo efetivo: metas vinculadas seguem a meta de água do perfil. */
export function goalTarget(goal: Goal, ctx: Pick<GoalDataContext, "waterGoalMl">): number {
  if (goal.linkedTo === "waterGoal" && ctx.waterGoalMl) {
    return goal.period === "weekly" ? ctx.waterGoalMl * 7 : ctx.waterGoalMl;
  }
  return goal.target;
}

export interface GoalProgress {
  value: number;
  target: number;
  /** Entre 0 e 1. */
  ratio: number;
  done: boolean;
  start: DateKey;
  end: DateKey;
}

export function goalWindow(goal: Pick<Goal, "period">, date: DateKey): { start: DateKey; end: DateKey } {
  return goal.period === "weekly" ? { start: addDays(date, -6), end: date } : { start: date, end: date };
}

export function checkinFor(checkins: GoalCheckin[], goalId: string, date: DateKey): GoalCheckin | undefined {
  return checkins.find((c) => c.goalId === goalId && c.date === date);
}

/** Valor da métrica em um único dia. */
export function dailyMetricValue(goal: Pick<Goal, "id" | "metric">, ctx: GoalDataContext, date: DateKey): number {
  switch (goal.metric) {
    case "water_ml":
      return waterTotalOn(ctx.waterEntries, date);
    case "activity_minutes":
      return ctx.activityEntries.reduce((s, e) => (e.date === date ? s + e.durationMin : s), 0);
    case "who_minutes":
      return moderateEquivalentMinutes(ctx.activityEntries.filter((e) => e.date === date));
    case "active_days":
      return ctx.activityEntries.some((e) => e.date === date) ? 1 : 0;
    case "fruit_veg_g":
      return entriesOn(ctx.foodEntries, date)
        .filter((e) => e.countsAsFruitVeg)
        .reduce((s, e) => s + e.quantityG, 0);
    case "meals_logged":
      return new Set(entriesOn(ctx.foodEntries, date).map((e) => e.mealType)).size;
    case "custom":
      return checkinFor(ctx.goalCheckins, goal.id, date)?.value ?? 0;
  }
}

export function goalProgress(goal: Goal, ctx: GoalDataContext, date: DateKey): GoalProgress {
  const { start, end } = goalWindow(goal, date);
  const value =
    goal.period === "daily"
      ? dailyMetricValue(goal, ctx, date)
      : lastNDays(end, 7).reduce((s, d) => s + dailyMetricValue(goal, ctx, d), 0);
  const target = goalTarget(goal, ctx);
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  return { value, target, ratio, done: value >= target, start, end };
}

export interface GoalHistoryPoint extends GoalProgress {
  /** Dia (meta diária) ou fim da janela de 7 dias (meta semanal). */
  date: DateKey;
  /** O ponto é anterior à criação da meta e não entra no resumo. */
  beforeStart: boolean;
}

export function goalHistory(goal: Goal, ctx: GoalDataContext, endDate: DateKey, points: number): GoalHistoryPoint[] {
  const dates =
    goal.period === "daily"
      ? lastNDays(endDate, points)
      : Array.from({ length: points }, (_, i) => addDays(endDate, -7 * (points - 1 - i)));
  return dates.map((date) => ({
    ...goalProgress(goal, ctx, date),
    date,
    beforeStart: date < goal.startDate,
  }));
}

/** Quantos pontos do histórico atingiram a meta (ignorando os anteriores à criação). */
export function summarizeHistory(history: GoalHistoryPoint[]): { met: number; counted: number } {
  const counted = history.filter((p) => !p.beforeStart);
  return { met: counted.filter((p) => p.done).length, counted: counted.length };
}

export function isGoalActiveOn(goal: Goal, date: DateKey): boolean {
  return goal.status === "active" && goal.startDate <= date && (!goal.endDate || date <= goal.endDate);
}

/** Formata um valor na unidade da meta: "1,6 L", "45 min", "3 dias", "250 g". */
export function formatGoalAmount(goal: Pick<Goal, "metric" | "unit" | "customKind">, value: number): string {
  switch (goal.metric) {
    case "water_ml":
      return value >= 1000 ? formatLiters(value) : formatMl(value);
    case "activity_minutes":
    case "who_minutes":
      return formatMinutes(value);
    case "active_days":
      return plural(value, "dia", "dias");
    case "fruit_veg_g":
      return `${formatNumber(Math.round(value))} g`;
    case "meals_logged":
      return plural(value, "refeição", "refeições");
    case "custom":
      if (goal.customKind === "check") return plural(value, "vez", "vezes");
      return `${formatNumber(value, 1)}${goal.unit ? ` ${goal.unit}` : ""}`;
  }
}

/** Uma pequena ação possível para avançar na meta hoje. Sem cobrança, só sugestão. */
export function nextSmallStep(goal: Goal, progress: GoalProgress): string {
  if (progress.done) return "Meta atingida neste período.";
  const missing = progress.target - progress.value;
  const falta = (n: number) => (n === 1 ? "Falta" : "Faltam");
  switch (goal.metric) {
    case "water_ml": {
      const cups = Math.max(1, Math.ceil(missing / 200));
      return `${falta(missing)} ${formatMl(missing)}, cerca de ${plural(cups, "copo", "copos")} de 200 ml.`;
    }
    case "activity_minutes":
      return `${falta(missing)} ${formatMinutes(missing)}. Uma caminhada curta já conta.`;
    case "who_minutes":
      return `${falta(missing)} ${formatMinutes(missing)} na conta da OMS. Uma caminhada em ritmo normal já conta.`;
    case "active_days":
      return `${falta(missing)} ${plural(missing, "dia", "dias")} com atividade nesta janela de 7 dias.`;
    case "fruit_veg_g":
      return `${falta(missing)} ${formatNumber(Math.round(missing))} g. Uma fruta no lanche ou uma salada na próxima refeição ajudam.`;
    case "meals_logged":
      return `Registre ${missing === 1 ? "mais uma refeição" : `mais ${missing} refeições`} para completar.`;
    case "custom":
      return goal.customKind === "check" ? "Marque quando fizer." : "Registre o valor de hoje quando puder.";
  }
}
