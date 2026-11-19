import { describe, expect, it } from "vitest";
import type { ActivityEntry, FoodEntry, Goal, GoalCheckin, HabitLog, HabitTracker, WaterEntry } from "@/types";
import { formatGoalAmount, goalHistory, goalProgress, nextSmallStep, summarizeHistory, type GoalDataContext } from "./goals";
import { baselinePerDay, habitSeries, habitStats, limitPerDay } from "./habits";

const stamp = { createdAt: "", updatedAt: "", profileId: "p1" };

function goal(partial: Partial<Goal>): Goal {
  return {
    ...stamp,
    id: "g1",
    title: "Meta",
    metric: "water_ml",
    period: "daily",
    target: 2000,
    unit: "ml",
    startDate: "2026-11-10",
    status: "active",
    ...partial,
  };
}

const water = (date: string, amountMl: number): WaterEntry => ({ ...stamp, id: `${date}${amountMl}`, date, time: "10:00", amountMl });
const activity = (date: string, durationMin: number): ActivityEntry => ({
  ...stamp,
  id: `${date}${durationMin}`,
  date,
  time: "07:00",
  modalityId: "caminhada",
  variantId: "normal",
  name: "Caminhada",
  variantLabel: "Normal",
  met: 3.8,
  compendiumCode: "17190",
  durationMin,
  kcalEstimated: 100,
  weightKgUsed: 64,
});
const food = (date: string, quantityG: number, countsAsFruitVeg: boolean, mealType: FoodEntry["mealType"] = "lunch"): FoodEntry => ({
  ...stamp,
  id: `${date}${quantityG}${mealType}`,
  date,
  time: "12:00",
  mealType,
  foodId: "taco:1",
  source: "taco",
  foodName: "x",
  per100g: { kcal: 100, protein: 1, carbs: 1, fat: 1, fiber: 1, sodium: 1 },
  countsAsFruitVeg,
  quantityG,
});

const ctx: GoalDataContext = {
  waterEntries: [water("2026-11-18", 1500), water("2026-11-18", 600), water("2026-11-17", 1000)],
  activityEntries: [activity("2026-11-18", 30), activity("2026-11-15", 40), activity("2026-11-12", 50), activity("2026-11-11", 90)],
  foodEntries: [food("2026-11-18", 150, true, "breakfast"), food("2026-11-18", 200, false), food("2026-11-18", 120, true, "dinner")],
  goalCheckins: [{ ...stamp, id: "c1", goalId: "sleep", date: "2026-11-18", value: 6.5 } as GoalCheckin],
};

describe("progresso de metas", () => {
  it("meta diária de água", () => {
    const p = goalProgress(goal({}), ctx, "2026-11-18");
    expect(p).toMatchObject({ value: 2100, done: true, ratio: 1 });
    expect(goalProgress(goal({}), ctx, "2026-11-17").ratio).toBeCloseTo(0.5, 5);
  });

  it("meta semanal soma só os últimos 7 dias", () => {
    const g = goal({ metric: "activity_minutes", period: "weekly", target: 150, unit: "min" });
    const p = goalProgress(g, ctx, "2026-11-18");
    expect(p.value).toBe(120); // 30 + 40 + 50; o dia 11 fica fora da janela
    expect(p.start).toBe("2026-11-12");
    expect(p.done).toBe(false);
  });

  it("minutos na conta da OMS: vigorosa vale dobrado e leve não conta", () => {
    const vigorous = { ...activity("2026-11-17", 20), id: "v", met: 9.3 };
    const light = { ...activity("2026-11-16", 40), id: "l", met: 2.3 };
    const g = goal({ metric: "who_minutes", period: "weekly", target: 150, unit: "min" });
    const p = goalProgress(g, { ...ctx, activityEntries: [...ctx.activityEntries, vigorous, light] }, "2026-11-18");
    expect(p.value).toBe(120 + 40); // 30 + 40 + 50 moderados + 20 vigorosos × 2; os 40 leves ficam fora
  });

  it("metas de água vinculadas seguem a meta do perfil", () => {
    const linked = goal({ target: 1000, linkedTo: "waterGoal" });
    expect(goalProgress(linked, { ...ctx, waterGoalMl: 2500 }, "2026-11-18")).toMatchObject({ target: 2500, done: false });
  });

  it("dias ativos, frutas/verduras, refeições e metas personalizadas", () => {
    expect(goalProgress(goal({ metric: "active_days", period: "weekly", target: 3 }), ctx, "2026-11-18").value).toBe(3);
    expect(goalProgress(goal({ metric: "fruit_veg_g", target: 400 }), ctx, "2026-11-18").value).toBe(270);
    expect(goalProgress(goal({ metric: "meals_logged", target: 3 }), ctx, "2026-11-18").value).toBe(3);
    const sleep = goal({ id: "sleep", metric: "custom", customKind: "amount", target: 7, unit: "h" });
    expect(goalProgress(sleep, ctx, "2026-11-18")).toMatchObject({ value: 6.5, done: false });
  });

  it("histórico ignora dias anteriores à criação da meta", () => {
    const history = goalHistory(goal({ startDate: "2026-11-17" }), ctx, "2026-11-18", 7);
    expect(history).toHaveLength(7);
    expect(history.filter((h) => h.beforeStart)).toHaveLength(5);
    expect(summarizeHistory(history)).toEqual({ met: 1, counted: 2 });
  });

  it("formata valores e sugere o próximo passo sem cobrança", () => {
    expect(formatGoalAmount(goal({}), 1650)).toBe("1,65 L");
    expect(formatGoalAmount(goal({ metric: "activity_minutes" }), 75)).toBe("1 h 15 min");
    const g = goal({ target: 2500 });
    expect(nextSmallStep(g, goalProgress(g, ctx, "2026-11-18"))).toContain("400 ml");
  });
});

describe("redução de cigarro e álcool", () => {
  const tracker: HabitTracker = {
    ...stamp,
    id: "t1",
    kind: "tobacco",
    mode: "quit",
    baselineAmount: 10,
    baselinePeriod: "day",
    unitCost: 0.5,
    startDate: "2026-11-10",
    active: true,
  };
  const log = (date: string, amount: number): HabitLog => ({ ...stamp, id: date, trackerId: "t1", date, amount });
  const logs = [log("2026-11-09", 12), log("2026-11-10", 6), log("2026-11-11", 0), log("2026-11-13", 0), log("2026-11-14", 12)];

  it("conta dias sem consumo e economia só nos dias registrados", () => {
    const s = habitStats(tracker, logs, [], "2026-11-14");
    expect(s.daysSinceStart).toBe(5);
    expect(s.daysLogged).toBe(4); // dia 9 é antes do início; dia 12 não foi registrado
    expect(s.daysWithout).toBe(2);
    expect(s.unitsAvoided).toBe(4 + 10 + 10 + 0); // consumo acima do habitual não vira "dívida"
    expect(s.moneySaved).toBeCloseTo(12, 5);
  });

  it("não inventa valores para dias sem registro", () => {
    const series = habitSeries(tracker, logs, "2026-11-14", 6);
    expect(series.map((p) => p.amount)).toEqual([null, 6, 0, null, 0, 12]);
  });

  it("converte consumo semanal de álcool para diário", () => {
    const alcohol = { baselineAmount: 14, baselinePeriod: "week" as const, mode: "reduce" as const, limitAmount: 7 };
    expect(baselinePerDay(alcohol)).toBe(2);
    expect(limitPerDay(alcohol)).toBe(1);
    expect(limitPerDay({ ...alcohol, mode: "quit" })).toBe(0);
  });
});
