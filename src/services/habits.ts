import type { CravingLog, DateKey, HabitLog, HabitTracker } from "@/types";
import { addDays, diffDays, lastNDays } from "@/utils/date";

/**
 * Acompanhamento de redução de cigarro e álcool.
 *
 * Princípios: sem julgamento e sem "sequência perdida". Contamos dias sem consumo no
 * total (não exigimos dias seguidos) e só usamos dias que o usuário registrou — dias sem
 * registro não viram "sem consumo" nem "com consumo".
 *
 * Economia estimada = Σ max(0, consumo habitual diário − consumo registrado no dia) × custo
 * por unidade, considerando apenas os dias registrados desde o início.
 */

export function baselinePerDay(tracker: Pick<HabitTracker, "baselineAmount" | "baselinePeriod">): number {
  return tracker.baselinePeriod === "week" ? tracker.baselineAmount / 7 : tracker.baselineAmount;
}

/** Limite diário desejado (0 no modo "parar"). */
export function limitPerDay(tracker: Pick<HabitTracker, "mode" | "limitAmount" | "baselinePeriod">): number {
  if (tracker.mode === "quit") return 0;
  const limit = tracker.limitAmount ?? 0;
  return tracker.baselinePeriod === "week" ? limit / 7 : limit;
}

export function logFor(logs: HabitLog[], trackerId: string, date: DateKey): HabitLog | undefined {
  return logs.find((l) => l.trackerId === trackerId && l.date === date);
}

export interface HabitStats {
  daysSinceStart: number;
  daysLogged: number;
  daysWithout: number;
  daysWithinLimit: number;
  unitsAvoided: number;
  moneySaved: number;
  consumedTotal: number;
  cravingsTotal: number;
  /** Dias sem consumo entre os últimos 7 registrados no período. */
  lastWeekWithout: number;
  lastWeekLogged: number;
}

export function habitStats(tracker: HabitTracker, allLogs: HabitLog[], cravings: CravingLog[], today: DateKey): HabitStats {
  const logs = allLogs.filter((l) => l.trackerId === tracker.id && l.date >= tracker.startDate && l.date <= today);
  const baseline = baselinePerDay(tracker);
  const limit = limitPerDay(tracker);
  const weekStart = addDays(today, -6);
  const lastWeek = logs.filter((l) => l.date >= weekStart);
  const unitsAvoided = logs.reduce((s, l) => s + Math.max(0, baseline - l.amount), 0);
  return {
    daysSinceStart: Math.max(0, diffDays(today, tracker.startDate)) + 1,
    daysLogged: logs.length,
    daysWithout: logs.filter((l) => l.amount === 0).length,
    daysWithinLimit: logs.filter((l) => l.amount <= limit).length,
    unitsAvoided,
    moneySaved: unitsAvoided * tracker.unitCost,
    consumedTotal: logs.reduce((s, l) => s + l.amount, 0),
    cravingsTotal: cravings.filter((c) => c.trackerId === tracker.id && c.date >= tracker.startDate && c.date <= today).length,
    lastWeekWithout: lastWeek.filter((l) => l.amount === 0).length,
    lastWeekLogged: lastWeek.length,
  };
}

export interface HabitSeriesPoint {
  date: DateKey;
  /** null = dia sem registro (não presumimos nada). */
  amount: number | null;
}

export function habitSeries(tracker: HabitTracker, logs: HabitLog[], endDate: DateKey, days: number): HabitSeriesPoint[] {
  return lastNDays(endDate, days).map((date) => ({
    date,
    amount: date < tracker.startDate ? null : (logFor(logs, tracker.id, date)?.amount ?? null),
  }));
}

/** Gatilhos mais frequentes nas vontades registradas (para ajudar a reconhecer padrões). */
export function topTriggers(cravings: CravingLog[], trackerId: string, limit = 3): { trigger: CravingLog["trigger"]; count: number }[] {
  const counts = new Map<CravingLog["trigger"], number>();
  for (const c of cravings) {
    if (c.trackerId !== trackerId) continue;
    counts.set(c.trigger, (counts.get(c.trigger) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
