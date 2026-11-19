import { describe, expect, it } from "vitest";
import type { FoodEntry, Nutrients } from "@/types";
import {
  dayKcal,
  dayNutrition,
  macroEnergyShare,
  perPortionToPer100g,
  scaleNutrients,
  suggestMealType,
  sumNutrients,
} from "./nutrition";

const arroz: Nutrients = { kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, fiber: 1.6, sodium: 1 };
const alface: Nutrients = { kcal: 11, protein: 1.3, carbs: 1.7, fat: 0.2, fiber: 1.8, sodium: 3 };

function entry(partial: Partial<FoodEntry>): FoodEntry {
  return {
    id: Math.random().toString(36),
    profileId: "p1",
    date: "2026-11-18",
    time: "12:30",
    mealType: "lunch",
    foodId: "taco:3",
    source: "taco",
    foodName: "Arroz, tipo 1, cozido",
    per100g: arroz,
    countsAsFruitVeg: false,
    quantityG: 100,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("quantidades", () => {
  it("escala os valores por 100 g para a quantidade em gramas", () => {
    const n = scaleNutrients(arroz, 150);
    expect(n.kcal).toBeCloseTo(192, 5);
    expect(n.carbs).toBeCloseTo(42.15, 5);
  });

  it("mantém valores desconhecidos como desconhecidos e marca o total", () => {
    const semFibra = { ...arroz, fiber: null };
    expect(scaleNutrients(semFibra, 200).fiber).toBeNull();
    const totals = sumNutrients([scaleNutrients(semFibra, 100), scaleNutrients(alface, 50)]);
    expect(totals.incomplete.fiber).toBe(true);
    expect(totals.incomplete.kcal).toBe(false);
    expect(totals.values.kcal).toBeCloseTo(133.5, 5);
  });

  it("converte valores de uma porção para a base de 100 g", () => {
    const per100 = perPortionToPer100g({ kcal: 120, protein: 3, carbs: 18, fat: 4, fiber: 1, sodium: 90 }, 30);
    expect(per100.kcal).toBeCloseTo(400, 5);
    expect(per100.sodium).toBeCloseTo(300, 5);
    expect(() => perPortionToPer100g(arroz, 0)).toThrow();
  });
});

describe("resumo do dia", () => {
  const entries = [
    entry({ mealType: "breakfast", time: "07:30", quantityG: 50 }),
    entry({ mealType: "lunch", quantityG: 150 }),
    entry({ mealType: "lunch", foodId: "taco:78", foodName: "Alface", per100g: alface, countsAsFruitVeg: true, quantityG: 40 }),
    entry({ date: "2026-11-17", quantityG: 500 }),
  ];

  it("agrupa por refeição e soma só o dia pedido", () => {
    const day = dayNutrition(entries, "2026-11-18");
    expect(day.entries).toHaveLength(3);
    expect(day.mealsLogged).toBe(2);
    expect(day.meals.find((m) => m.type === "lunch")!.entries).toHaveLength(2);
    expect(day.totals.values.kcal).toBeCloseTo(64 + 192 + 4.4, 5);
    expect(dayKcal(entries, "2026-11-18")).toBeCloseTo(260.4, 5);
  });

  it("conta frutas, legumes e verduras em gramas", () => {
    expect(dayNutrition(entries, "2026-11-18").fruitVegG).toBe(40);
  });

  it("calcula a distribuição de energia dos macronutrientes", () => {
    const share = macroEnergyShare(dayNutrition(entries, "2026-11-18").totals)!;
    expect(share.carbs + share.protein + share.fat).toBeCloseTo(1, 10);
    expect(share.carbs).toBeGreaterThan(0.8);
  });
});

describe("suggestMealType", () => {
  it("sugere a refeição pelo horário", () => {
    expect(suggestMealType("07:10")).toBe("breakfast");
    expect(suggestMealType("12:40")).toBe("lunch");
    expect(suggestMealType("16:00")).toBe("snack");
    expect(suggestMealType("20:15")).toBe("dinner");
  });
});
