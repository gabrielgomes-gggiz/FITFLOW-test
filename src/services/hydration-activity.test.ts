import { describe, expect, it } from "vitest";
import type { ActivityEntry } from "@/types";
import {
  activityWeek,
  estimateActivityKcal,
  intensityOf,
  moderateEquivalentMinutes,
  restingKcalDuring,
} from "./activity";
import { estimateWaterGoal, waterTotalOn } from "./hydration";

describe("meta de água", () => {
  it("usa 35 ml/kg arredondado para 50 ml", () => {
    expect(estimateWaterGoal({ weightKg: 64, sex: "female" }).goalMl).toBe(2250);
  });

  it("respeita os limites mínimo e máximo", () => {
    expect(estimateWaterGoal({ weightKg: 40, sex: "female" }).goalMl).toBe(1600);
    expect(estimateWaterGoal({ weightKg: 130, sex: "male" }).goalMl).toBe(4000);
  });

  it("usa a referência por sexo quando falta o peso", () => {
    expect(estimateWaterGoal({ sex: "male" })).toMatchObject({ goalMl: 2000, source: "reference" });
    expect(estimateWaterGoal({ sex: "unspecified" }).goalMl).toBe(1800);
  });

  it("prioriza a meta ajustada pelo usuário", () => {
    expect(estimateWaterGoal({ weightKg: 64, sex: "female", waterGoalOverride: 2000 })).toMatchObject({
      goalMl: 2000,
      estimatedMl: 2250,
      source: "manual",
    });
  });

  it("soma apenas o dia pedido", () => {
    const entries = [
      { date: "2026-11-18", amountMl: 300 },
      { date: "2026-11-18", amountMl: 500 },
      { date: "2026-11-17", amountMl: 900 },
    ] as Parameters<typeof waterTotalOn>[0];
    expect(waterTotalOn(entries, "2026-11-18")).toBe(800);
  });
});

function act(date: string, met: number, durationMin: number, kcal: number | null = 100): ActivityEntry {
  return {
    id: `${date}-${met}`,
    profileId: "p1",
    date,
    time: "07:00",
    modalityId: "x",
    variantId: "y",
    name: "x",
    variantLabel: "y",
    met,
    compendiumCode: "00000",
    durationMin,
    kcalEstimated: kcal,
    weightKgUsed: 64,
    createdAt: "",
    updatedAt: "",
  };
}

describe("atividades", () => {
  it("estima kcal por MET × 3,5 × peso ÷ 200 × minutos", () => {
    expect(estimateActivityKcal(9.3, 64, 30)).toBe(312);
    expect(estimateActivityKcal(3.5, 64, 50)).toBe(196);
    expect(restingKcalDuring(64, 30)).toBe(34);
  });

  it("classifica intensidade pelos limites de MET", () => {
    expect(intensityOf(2.9)).toBe("light");
    expect(intensityOf(3)).toBe("moderate");
    expect(intensityOf(5.9)).toBe("moderate");
    expect(intensityOf(6)).toBe("vigorous");
  });

  it("calcula minutos equivalentes da OMS (vigorosa vale dobrado, leve não conta)", () => {
    expect(moderateEquivalentMinutes([act("a", 9.3, 30), act("b", 3.5, 50), act("c", 2.3, 45)])).toBe(110);
  });

  it("usa uma janela móvel de 7 dias", () => {
    const entries = [act("2026-11-18", 4, 30), act("2026-11-12", 4, 20), act("2026-11-11", 4, 60, null)];
    const week = activityWeek(entries, "2026-11-18");
    expect(week.minutes).toBe(50);
    expect(week.activeDays).toBe(2);
    expect(week.kcalIncomplete).toBe(false);
  });
});
