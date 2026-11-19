import { describe, expect, it } from "vitest";
import {
  parseDecimal,
  validateActivity,
  validateCustomFood,
  validateFoodEntry,
  validateGoal,
  validateProfile,
  validateTracker,
  validateWater,
  type CustomFoodForm,
  type ProfileForm,
} from "./validation";

const today = "2026-11-18";

describe("parseDecimal", () => {
  it("aceita vírgula e ponto", () => {
    expect(parseDecimal("64,5")).toBe(64.5);
    expect(parseDecimal(" 64.5 ")).toBe(64.5);
    expect(parseDecimal("70")).toBe(70);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("1.234,5")).toBeNull();
  });
});

const profileForm: ProfileForm = {
  name: "  Ana   Lima ",
  ageMode: "age",
  age: "29",
  birthDate: "",
  sex: "female",
  weight: "61,5",
  height: "165",
  activityLevel: "light",
  objective: "maintain",
  trackedHabits: ["water", "food"],
};

describe("perfil", () => {
  it("normaliza e converte os campos", () => {
    const r = validateProfile(profileForm, today);
    expect(r.ok && r.value).toMatchObject({ name: "Ana Lima", ageYears: 29, weightKg: 61.5, heightCm: 165 });
  });

  it("permite deixar dados opcionais em branco", () => {
    const r = validateProfile({ ...profileForm, name: "", age: "", weight: "", height: "" }, today);
    expect(r.ok).toBe(true);
  });

  it("recusa valores implausíveis com mensagens por campo", () => {
    const r = validateProfile({ ...profileForm, age: "8", weight: "700", height: "1,65" }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["age", "height", "weight"]);
  });

  it("aceita data de nascimento no lugar da idade", () => {
    const r = validateProfile({ ...profileForm, ageMode: "birthDate", birthDate: "1997-03-02" }, today);
    expect(r.ok && r.value.birthDate).toBe("1997-03-02");
    expect(validateProfile({ ...profileForm, ageMode: "birthDate", birthDate: "2030-01-01" }, today).ok).toBe(false);
  });
});

describe("registros", () => {
  it("refeição: quantidade em gramas ou porções, sem datas futuras", () => {
    const base = { quantity: "150", unit: "g" as const, mealType: "lunch" as const, date: today, time: "12:30" };
    expect(validateFoodEntry(base, today)).toMatchObject({ ok: true, value: { quantityG: 150 } });
    expect(validateFoodEntry({ ...base, unit: "portion", quantity: "1,5", portionGrams: 170 }, today)).toMatchObject({
      ok: true,
      value: { quantityG: 255 },
    });
    expect(validateFoodEntry({ ...base, quantity: "0" }, today).ok).toBe(false);
    expect(validateFoodEntry({ ...base, date: "2026-11-19" }, today).ok).toBe(false);
    expect(validateFoodEntry({ ...base, time: "25:00" }, today).ok).toBe(false);
  });

  it("água e atividade", () => {
    expect(validateWater({ amount: "250", date: today, time: "09:00" }, today).ok).toBe(true);
    expect(validateWater({ amount: "5", date: today, time: "09:00" }, today).ok).toBe(false);
    const a = { modalityId: "corrida", variantId: "10", duration: "30", date: today, time: "07:00" };
    expect(validateActivity(a, today).ok).toBe(true);
    expect(validateActivity({ ...a, variantId: "inexistente" }, today).ok).toBe(false);
    expect(validateActivity({ ...a, duration: "0" }, today).ok).toBe(false);
  });
});

describe("alimento personalizado", () => {
  const form: CustomFoodForm = {
    name: "Barra de cereal",
    basis: "portion",
    portionLabel: "1 barra",
    portionGrams: "25",
    kcal: "90",
    protein: "1,5",
    carbs: "17",
    fat: "2",
    fiber: "1",
    sodium: "40",
    countsAsFruitVeg: false,
  };

  it("converte valores da porção para 100 g", () => {
    const r = validateCustomFood(form);
    expect(r.ok && r.value.per100g).toEqual({ kcal: 360, protein: 6, carbs: 68, fat: 8, fiber: 4, sodium: 160 });
    expect(r.ok && r.value.portion).toEqual({ label: "1 barra", grams: 25 });
  });

  it("recusa combinações fisicamente impossíveis", () => {
    const r = validateCustomFood({ ...form, carbs: "30" }); // 30 g de carboidrato numa porção de 25 g
    expect(r.ok).toBe(false);
    expect(validateCustomFood({ ...form, kcal: "300" }).ok).toBe(false); // 1.200 kcal/100 g
  });

  it("exige energia e mantém campos vazios como desconhecidos", () => {
    expect(validateCustomFood({ ...form, kcal: "" }).ok).toBe(false);
    const r = validateCustomFood({ ...form, basis: "100g", portionLabel: "", portionGrams: "", fiber: "", sodium: "", kcal: "360", carbs: "68", protein: "6", fat: "8" });
    expect(r.ok && r.value.per100g.fiber).toBeNull();
    expect(r.ok && r.value.portion).toBeUndefined();
  });
});

describe("metas e hábitos", () => {
  it("valida alvos por tipo e período", () => {
    const base = { title: "Água", metric: "water_ml" as const, period: "daily" as const, target: "2000", unit: "ml", customKind: "amount" as const };
    expect(validateGoal(base).ok).toBe(true);
    expect(validateGoal({ ...base, target: "50000" }).ok).toBe(false);
    expect(validateGoal({ ...base, metric: "active_days", target: "3" }).ok).toBe(false); // precisa ser semanal
    expect(validateGoal({ ...base, metric: "custom", customKind: "check", period: "daily", target: "" })).toMatchObject({
      ok: true,
      value: { target: 1 },
    });
  });

  it("acompanhamento de cigarro calcula o custo por unidade", () => {
    const form = { kind: "tobacco" as const, mode: "reduce" as const, baseline: "15", limit: "5", price: "12", packSize: "20", startDate: today, motivation: "" };
    expect(validateTracker(form, today)).toMatchObject({ ok: true, value: { unitCost: 0.6, baselinePeriod: "day", limitAmount: 5 } });
    expect(validateTracker({ ...form, limit: "20" }, today).ok).toBe(false);
    expect(validateTracker({ ...form, kind: "alcohol", baseline: "10", limit: "4", price: "8" }, today)).toMatchObject({
      ok: true,
      value: { unitCost: 8, baselinePeriod: "week" },
    });
  });
});
