import type { ActivityEntry, DateKey, IntensityClass } from "@/types";
import { addDays, isWithin } from "@/utils/date";

/**
 * Gasto energético estimado de atividades físicas.
 *
 * kcal = MET × 3,5 × peso(kg) ÷ 200 × minutos
 * (equação do American College of Sports Medicine; 1 MET = 3,5 ml O₂/kg/min).
 *
 * O valor é BRUTO: inclui o que o corpo gastaria em repouso no mesmo período
 * (≈ 1 MET). É uma média populacional para adultos de 19 a 59 anos; condicionamento,
 * técnica, terreno e clima podem mudar bastante o gasto real.
 *
 * Intensidade pelo MET: leve < 3, moderada 3 a 5,9, vigorosa ≥ 6.
 * Recomendação da OMS (2020) para adultos: 150 a 300 min/semana de atividade moderada,
 * ou 75 a 150 min de vigorosa, ou combinação equivalente (1 min vigoroso = 2 moderados).
 */

export const WHO_WEEKLY_MIN = 150;
export const WHO_WEEKLY_UPPER = 300;

export function estimateActivityKcal(met: number, weightKg: number, durationMin: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * durationMin);
}

/** Parte do gasto que o corpo teria em repouso no mesmo tempo (1 MET). */
export function restingKcalDuring(weightKg: number, durationMin: number): number {
  return Math.round(((1 * 3.5 * weightKg) / 200) * durationMin);
}

export function intensityOf(met: number): IntensityClass {
  if (met < 3) return "light";
  if (met < 6) return "moderate";
  return "vigorous";
}

export const INTENSITY_LABELS: Record<IntensityClass, string> = {
  light: "Leve",
  moderate: "Moderada",
  vigorous: "Vigorosa",
};

/** Minutos equivalentes de atividade moderada (vigorosa conta em dobro; leve não conta). */
export function moderateEquivalentMinutes(entries: Pick<ActivityEntry, "met" | "durationMin">[]): number {
  return entries.reduce((sum, e) => {
    const intensity = intensityOf(e.met);
    if (intensity === "moderate") return sum + e.durationMin;
    if (intensity === "vigorous") return sum + 2 * e.durationMin;
    return sum;
  }, 0);
}

export interface ActivitySummary {
  count: number;
  minutes: number;
  moderateEquivalentMin: number;
  /** Soma das estimativas conhecidas. */
  kcal: number;
  /** Algum registro ficou sem estimativa (peso não informado na hora). */
  kcalIncomplete: boolean;
  activeDays: number;
}

export function summarizeActivities(entries: ActivityEntry[], start: DateKey, end: DateKey): ActivitySummary {
  const inRange = entries.filter((e) => isWithin(e.date, start, end));
  return {
    count: inRange.length,
    minutes: inRange.reduce((s, e) => s + e.durationMin, 0),
    moderateEquivalentMin: moderateEquivalentMinutes(inRange),
    kcal: inRange.reduce((s, e) => s + (e.kcalEstimated ?? 0), 0),
    kcalIncomplete: inRange.some((e) => e.kcalEstimated === null),
    activeDays: new Set(inRange.map((e) => e.date)).size,
  };
}

export function activityDay(entries: ActivityEntry[], date: DateKey): ActivitySummary {
  return summarizeActivities(entries, date, date);
}

/** Janela móvel de 7 dias terminando em `end` (inclusive). */
export function activityWeek(entries: ActivityEntry[], end: DateKey): ActivitySummary {
  return summarizeActivities(entries, addDays(end, -6), end);
}
