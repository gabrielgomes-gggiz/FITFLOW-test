import type { DateKey, ProfileData } from "@/types";
import { lastNDays } from "@/utils/date";
import { waterTotalOn } from "./hydration";
import { dayKcal } from "./nutrition";

/**
 * Séries diárias para histórico e relatórios. Dias sem registro não viram zero nas
 * médias: a média considera só os dias em que algo foi registrado.
 */

export interface DailyPoint {
  date: DateKey;
  kcal: number;
  hasFood: boolean;
  waterMl: number;
  hasWater: boolean;
  activityMin: number;
  activityKcal: number;
  hasActivity: boolean;
}

type SeriesData = Pick<ProfileData, "foodEntries" | "waterEntries" | "activityEntries">;

export function dailySeries(data: SeriesData, endDate: DateKey, days: number): DailyPoint[] {
  return lastNDays(endDate, days).map((date) => {
    const activities = data.activityEntries.filter((e) => e.date === date);
    const hasFood = data.foodEntries.some((e) => e.date === date);
    const waterMl = waterTotalOn(data.waterEntries, date);
    return {
      date,
      kcal: hasFood ? dayKcal(data.foodEntries, date) : 0,
      hasFood,
      waterMl,
      hasWater: waterMl > 0,
      activityMin: activities.reduce((s, e) => s + e.durationMin, 0),
      activityKcal: activities.reduce((s, e) => s + (e.kcalEstimated ?? 0), 0),
      hasActivity: activities.length > 0,
    };
  });
}

export interface SeriesSummary {
  days: number;
  daysWithFood: number;
  avgKcal: number | null;
  daysWithWater: number;
  avgWaterMl: number | null;
  daysWaterGoalMet: number;
  activeDays: number;
  totalActivityMin: number;
  totalActivityKcal: number;
}

export function summarizeSeries(points: DailyPoint[], waterGoalMl: number): SeriesSummary {
  const food = points.filter((p) => p.hasFood);
  const water = points.filter((p) => p.hasWater);
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  return {
    days: points.length,
    daysWithFood: food.length,
    avgKcal: avg(food.map((p) => p.kcal)),
    daysWithWater: water.length,
    avgWaterMl: avg(water.map((p) => p.waterMl)),
    daysWaterGoalMet: points.filter((p) => p.waterMl >= waterGoalMl).length,
    activeDays: points.filter((p) => p.hasActivity).length,
    totalActivityMin: points.reduce((s, p) => s + p.activityMin, 0),
    totalActivityKcal: points.reduce((s, p) => s + p.activityKcal, 0),
  };
}
