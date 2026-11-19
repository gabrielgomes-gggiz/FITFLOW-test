import type { DateKey, FoodEntry, MealType, NutrientKey, Nutrients, TimeOfDay } from "@/types";
import { minutesOfDay } from "@/utils/date";

/**
 * Cálculos nutricionais.
 *
 * Os valores de referência estão sempre por 100 g de parte comestível (padrão da TACO).
 * Para uma quantidade q em gramas: nutriente = valor_por_100g × q ÷ 100.
 * Valores desconhecidos (null) não viram zero: o total é marcado como incompleto.
 */

export const NUTRIENT_KEYS: NutrientKey[] = ["kcal", "carbs", "protein", "fat", "fiber", "sodium"];

export const NUTRIENT_LABELS: Record<NutrientKey, { label: string; unit: "kcal" | "g" | "mg" }> = {
  kcal: { label: "Energia", unit: "kcal" },
  carbs: { label: "Carboidratos", unit: "g" },
  protein: { label: "Proteínas", unit: "g" },
  fat: { label: "Gorduras totais", unit: "g" },
  fiber: { label: "Fibras", unit: "g" },
  sodium: { label: "Sódio", unit: "mg" },
};

export const MEAL_TYPES: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Café da manhã" },
  { id: "lunch", label: "Almoço" },
  { id: "snack", label: "Lanche" },
  { id: "dinner", label: "Jantar" },
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
};

/** Sugere o tipo de refeição pelo horário (o usuário pode trocar). */
export function suggestMealType(time: TimeOfDay): MealType {
  const m = minutesOfDay(time);
  if (m < 10 * 60 + 30) return "breakfast";
  if (m < 15 * 60) return "lunch";
  if (m < 18 * 60 + 30) return "snack";
  return "dinner";
}

export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const scale = (v: number | null) => (v === null ? null : v * factor);
  return {
    kcal: scale(per100g.kcal),
    protein: scale(per100g.protein),
    carbs: scale(per100g.carbs),
    fat: scale(per100g.fat),
    fiber: scale(per100g.fiber),
    sodium: scale(per100g.sodium),
  };
}

/** Converte valores informados "por porção de X g" para a base de 100 g. */
export function perPortionToPer100g(values: Nutrients, portionGrams: number): Nutrients {
  if (!(portionGrams > 0)) throw new Error("A porção precisa ter mais de 0 g.");
  return scaleNutrients(values, (100 / portionGrams) * 100);
}

export interface NutrientTotals {
  values: Record<NutrientKey, number>;
  /** true quando algum item somado não tinha o valor (o total real pode ser maior). */
  incomplete: Record<NutrientKey, boolean>;
}

export function emptyTotals(): NutrientTotals {
  const values = {} as Record<NutrientKey, number>;
  const incomplete = {} as Record<NutrientKey, boolean>;
  for (const k of NUTRIENT_KEYS) {
    values[k] = 0;
    incomplete[k] = false;
  }
  return { values, incomplete };
}

export function sumNutrients(list: Nutrients[]): NutrientTotals {
  const totals = emptyTotals();
  for (const n of list) {
    for (const k of NUTRIENT_KEYS) {
      const v = n[k];
      if (v === null) totals.incomplete[k] = true;
      else totals.values[k] += v;
    }
  }
  return totals;
}

export function entryNutrients(entry: Pick<FoodEntry, "per100g" | "quantityG">): Nutrients {
  return scaleNutrients(entry.per100g, entry.quantityG);
}

export function entryKcal(entry: Pick<FoodEntry, "per100g" | "quantityG">): number {
  return entry.per100g.kcal === null ? 0 : (entry.per100g.kcal * entry.quantityG) / 100;
}

/** Registros de um dia, em ordem de horário (e de criação, para empates). */
export function entriesOn<T extends { date: DateKey; time: TimeOfDay; createdAt?: string; id?: string }>(entries: T[], date: DateKey): T[] {
  return entries
    .filter((e) => e.date === date)
    .sort(
      (a, b) =>
        a.time.localeCompare(b.time) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || (a.id ?? "").localeCompare(b.id ?? ""),
    );
}

export interface MealSummary {
  type: MealType;
  label: string;
  entries: FoodEntry[];
  kcal: number;
}

export interface DayNutrition {
  date: DateKey;
  entries: FoodEntry[];
  totals: NutrientTotals;
  meals: MealSummary[];
  /** Tipos de refeição com pelo menos um alimento registrado. */
  mealsLogged: number;
  /** Gramas de frutas, legumes e verduras (critério da OMS). */
  fruitVegG: number;
}

export function dayNutrition(allEntries: FoodEntry[], date: DateKey): DayNutrition {
  const entries = entriesOn(allEntries, date);
  const totals = sumNutrients(entries.map(entryNutrients));
  const meals = MEAL_TYPES.map(({ id, label }) => {
    const items = entries.filter((e) => e.mealType === id);
    return { type: id, label, entries: items, kcal: items.reduce((s, e) => s + entryKcal(e), 0) };
  });
  return {
    date,
    entries,
    totals,
    meals,
    mealsLogged: meals.filter((m) => m.entries.length > 0).length,
    fruitVegG: entries.filter((e) => e.countsAsFruitVeg).reduce((s, e) => s + e.quantityG, 0),
  };
}

/** Energia consumida no dia (kcal), somando apenas valores conhecidos. */
export function dayKcal(allEntries: FoodEntry[], date: DateKey): number {
  return allEntries.filter((e) => e.date === date).reduce((s, e) => s + entryKcal(e), 0);
}

/**
 * Distribuição aproximada da energia entre macronutrientes, com os fatores gerais de
 * Atwater (4 kcal/g para carboidratos e proteínas, 9 kcal/g para gorduras).
 * É uma proporção: não substitui o valor de energia da TACO, que usa fatores específicos.
 */
export function macroEnergyShare(totals: NutrientTotals): { carbs: number; protein: number; fat: number } | null {
  const carbs = totals.values.carbs * 4;
  const protein = totals.values.protein * 4;
  const fat = totals.values.fat * 9;
  const sum = carbs + protein + fat;
  if (sum <= 0) return null;
  return { carbs: carbs / sum, protein: protein / sum, fat: fat / sum };
}

/** Faixas de distribuição aceitáveis para adultos (Institute of Medicine, 2005). */
export const MACRO_REFERENCE_RANGES = {
  carbs: [0.45, 0.65],
  protein: [0.1, 0.35],
  fat: [0.2, 0.35],
} as const;

/** Referências diárias usadas apenas para contexto educativo. */
export const DAILY_REFERENCES = {
  /** OMS: pelo menos 400 g de frutas, legumes e verduras por dia. */
  fruitVegG: 400,
  /** OMS: no máximo 2.000 mg de sódio por dia (≈ 5 g de sal). */
  sodiumMaxMg: 2000,
  /** OMS: pelo menos 25 g de fibra alimentar por dia para adultos. */
  fiberMinG: 25,
};
