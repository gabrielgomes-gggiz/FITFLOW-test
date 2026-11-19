import { describe, expect, it } from "vitest";
import { RECORD_STORES } from "@/types";
import { lastNDays, minutesOfDay } from "@/utils/date";
import { createDemoDataset, DEMO_PROFILE_ID } from "./demo";
import { estimateEnergy } from "./energy";
import { dayKcal } from "./nutrition";
import { waterTotalOn } from "./hydration";
import { activityWeek } from "./activity";
import { habitStats } from "./habits";

describe("dados de demonstração", () => {
  const now = new Date("2026-11-18T20:45:00-03:00");

  it("é um perfil de demonstração com registros só dele", async () => {
    const { profile, data } = await createDemoDataset(now);
    expect(profile).toMatchObject({ id: DEMO_PROFILE_ID, isDemo: true });
    for (const store of RECORD_STORES) {
      for (const record of data[store]) expect(record.profileId).toBe(DEMO_PROFILE_ID);
    }
  });

  it("não cria registros no futuro", async () => {
    const morning = new Date("2026-11-18T08:00:00-03:00");
    const { data } = await createDemoDataset(morning);
    const dated = [...data.foodEntries, ...data.waterEntries, ...data.activityEntries];
    expect(dated.every((e) => e.date <= "2026-11-18")).toBe(true);
    const todays = dated.filter((e) => e.date === "2026-11-18");
    expect(todays.every((e) => minutesOfDay(e.time) <= 8 * 60)).toBe(true);
    expect(data.foodEntries.some((e) => e.date === "2026-11-18" && e.mealType === "dinner")).toBe(false);
  });

  it("tem números coerentes com a pessoa fictícia", async () => {
    const { profile, data } = await createDemoDataset(now);
    const energy = estimateEnergy(profile, "2026-11-18");
    expect(energy.target).toBe(2130);
    for (const day of lastNDays("2026-11-17", 13)) {
      const kcal = dayKcal(data.foodEntries, day);
      expect(kcal).toBeGreaterThan(1300);
      expect(kcal).toBeLessThan(2500);
      expect(waterTotalOn(data.waterEntries, day)).toBeGreaterThan(1000);
    }
    const week = activityWeek(data.activityEntries, "2026-11-18");
    expect(week.moderateEquivalentMin).toBeGreaterThan(100);
    const tracker = data.habitTrackers[0];
    const stats = habitStats(tracker, data.habitLogs, data.cravings, "2026-11-18");
    expect(stats.daysWithout).toBeGreaterThanOrEqual(5);
    expect(stats.moneySaved).toBeGreaterThan(0);
  });

  it("mantém as metas na ordem de exibição", async () => {
    const { data } = await createDemoDataset(now);
    const sorted = [...data.goals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    expect(sorted.map((g) => g.metric)).toEqual(["water_ml", "who_minutes", "fruit_veg_g", "custom", "custom"]);
  });

  it("gera o mesmo padrão a cada restauração", async () => {
    const a = await createDemoDataset(now);
    const b = await createDemoDataset(now);
    const summary = (d: typeof a.data) => d.foodEntries.map((e) => `${e.date}${e.time}${e.foodId}${e.quantityG}`).join("|");
    expect(summary(a.data)).toBe(summary(b.data));
  });
});
