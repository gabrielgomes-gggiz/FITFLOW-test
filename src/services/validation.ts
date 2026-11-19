import type {
  ActivityLevel,
  CravingTrigger,
  CustomGoalKind,
  DateKey,
  GoalMetric,
  GoalPeriod,
  HabitKind,
  HabitMode,
  MealType,
  Nutrients,
  Objective,
  Sex,
  TimeOfDay,
  TrackedHabit,
} from "@/types";
import { getVariant } from "@/data/activities";
import { ageOn, isValidDateKey, isValidTime } from "@/utils/date";
import { perPortionToPer100g } from "./nutrition";

/**
 * Validação de entradas. Os formulários guardam texto; aqui convertemos, conferimos
 * limites plausíveis e devolvemos mensagens por campo.
 */

export type FieldErrors = Record<string, string>;
export type Validation<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

const ok = <T>(value: T): Validation<T> => ({ ok: true, value });
const fail = <T>(errors: FieldErrors): Validation<T> => ({ ok: false, errors });

/** Aceita "64,5", "64.5" e espaços. Retorna null para vazio ou inválido. */
export function parseDecimal(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^-?\d*\.?\d+$/.test(cleaned) && !/^-?\d+\.?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function checkRange(
  errors: FieldErrors,
  field: string,
  raw: string | number | null | undefined,
  min: number,
  max: number,
  label: string,
  opts: { required?: boolean; integer?: boolean; unit?: string } = {},
): number | undefined {
  const value = parseDecimal(raw);
  const unit = opts.unit ? ` ${opts.unit}` : "";
  if (value === null) {
    const empty = raw === null || raw === undefined || String(raw).trim() === "";
    if (opts.required || !empty) errors[field] = empty ? `Informe ${label}.` : `Digite um número válido para ${label}.`;
    return undefined;
  }
  if (opts.integer && !Number.isInteger(value)) {
    errors[field] = `Use um número inteiro para ${label}.`;
    return undefined;
  }
  if (value < min || value > max) {
    errors[field] = `${capitalizeFirst(label)} deve ficar entre ${fmt(min)} e ${fmt(max)}${unit}.`;
    return undefined;
  }
  return value;
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function checkDateTime(errors: FieldErrors, date: string, time: string, today: DateKey) {
  if (!isValidDateKey(date)) errors.date = "Escolha uma data válida.";
  else if (date > today) errors.date = "A data não pode ser no futuro.";
  if (!isValidTime(time)) errors.time = "Informe o horário no formato 00:00.";
}

/* ----------------------------------------------------------------- Perfil */

export interface ProfileForm {
  name: string;
  ageMode: "age" | "birthDate";
  age: string;
  birthDate: string;
  sex: Sex;
  weight: string;
  height: string;
  activityLevel: ActivityLevel;
  objective: Objective;
  trackedHabits: TrackedHabit[];
}

export interface ProfileInput {
  name: string;
  birthDate?: DateKey;
  ageYears?: number;
  sex: Sex;
  weightKg?: number;
  heightCm?: number;
  activityLevel: ActivityLevel;
  objective: Objective;
  trackedHabits: TrackedHabit[];
}

const SEXES: Sex[] = ["female", "male", "unspecified"];
const LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "intense"];
const OBJECTIVES: Objective[] = ["maintain", "fitness", "lose", "gain"];
const HABITS: TrackedHabit[] = ["food", "water", "activity", "sleep", "tobacco", "alcohol"];
export const MIN_AGE = 13;
export const MAX_AGE = 120;

export function validateProfile(form: ProfileForm, today: DateKey): Validation<ProfileInput> {
  const errors: FieldErrors = {};
  const name = form.name.trim().replace(/\s+/g, " ");
  if (name.length > 60) errors.name = "Use até 60 caracteres.";

  let ageYears: number | undefined;
  let birthDate: DateKey | undefined;
  if (form.ageMode === "birthDate") {
    if (form.birthDate.trim() !== "") {
      if (!isValidDateKey(form.birthDate) || form.birthDate > today) errors.birthDate = "Escolha uma data de nascimento válida.";
      else {
        const age = ageOn(form.birthDate, today);
        if (age < MIN_AGE || age > MAX_AGE) errors.birthDate = `O FitFlow é para pessoas a partir de ${MIN_AGE} anos.`;
        else birthDate = form.birthDate;
      }
    }
  } else {
    ageYears = checkRange(errors, "age", form.age, MIN_AGE, MAX_AGE, "a idade", { integer: true, unit: "anos" });
  }

  const weightKg = checkRange(errors, "weight", form.weight, 25, 350, "o peso", { unit: "kg" });
  const heightCm = checkRange(errors, "height", form.height, 100, 250, "a altura", { unit: "cm" });
  if (!SEXES.includes(form.sex)) errors.sex = "Escolha uma opção.";
  if (!LEVELS.includes(form.activityLevel)) errors.activityLevel = "Escolha seu nível de atividade.";
  if (!OBJECTIVES.includes(form.objective)) errors.objective = "Escolha um objetivo.";
  const trackedHabits = form.trackedHabits.filter((h) => HABITS.includes(h));

  if (Object.keys(errors).length) return fail(errors);
  return ok({
    name,
    ageYears,
    birthDate,
    sex: form.sex,
    weightKg,
    heightCm,
    activityLevel: form.activityLevel,
    objective: form.objective,
    trackedHabits,
  });
}

export function validateManualTargets(
  energy: string,
  water: string,
): Validation<{ energyTargetOverride?: number; waterGoalOverride?: number }> {
  const errors: FieldErrors = {};
  const e = checkRange(errors, "energy", energy, 1000, 5000, "a meta de energia", { integer: true, unit: "kcal" });
  const w = checkRange(errors, "water", water, 500, 6000, "a meta de água", { integer: true, unit: "ml" });
  if (Object.keys(errors).length) return fail(errors);
  return ok({ energyTargetOverride: e, waterGoalOverride: w });
}

/* ------------------------------------------------------------ Alimentação */

const MEALS: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export interface FoodEntryForm {
  quantity: string;
  unit: "g" | "portion";
  portionGrams?: number;
  mealType: MealType;
  date: string;
  time: string;
}

export function validateFoodEntry(
  form: FoodEntryForm,
  today: DateKey,
): Validation<{ quantityG: number; mealType: MealType; date: DateKey; time: TimeOfDay }> {
  const errors: FieldErrors = {};
  let quantityG: number | undefined;
  if (form.unit === "portion") {
    const portions = checkRange(errors, "quantity", form.quantity, 0.25, 20, "a quantidade de porções", { required: true });
    if (portions !== undefined) {
      if (!form.portionGrams) errors.quantity = "Este alimento não tem porção cadastrada. Use gramas.";
      else quantityG = Math.round(portions * form.portionGrams * 10) / 10;
    }
  } else {
    quantityG = checkRange(errors, "quantity", form.quantity, 1, 5000, "a quantidade", { required: true, unit: "g" });
  }
  if (!MEALS.includes(form.mealType)) errors.mealType = "Escolha a refeição.";
  checkDateTime(errors, form.date, form.time, today);
  if (Object.keys(errors).length || quantityG === undefined) return fail(errors);
  return ok({ quantityG, mealType: form.mealType, date: form.date, time: form.time });
}

export interface CustomFoodForm {
  name: string;
  basis: "100g" | "portion";
  portionLabel: string;
  portionGrams: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
  countsAsFruitVeg: boolean;
}

export interface CustomFoodInput {
  name: string;
  per100g: Nutrients;
  countsAsFruitVeg: boolean;
  portion?: { label: string; grams: number };
}

export function validateCustomFood(form: CustomFoodForm): Validation<CustomFoodInput> {
  const errors: FieldErrors = {};
  const name = form.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Dê um nome ao alimento.";
  else if (name.length > 80) errors.name = "Use até 80 caracteres.";

  const hasPortion = form.basis === "portion" || form.portionGrams.trim() !== "" || form.portionLabel.trim() !== "";
  let portionGrams: number | undefined;
  if (hasPortion) {
    portionGrams = checkRange(errors, "portionGrams", form.portionGrams, 1, 2000, "o peso da porção", {
      required: true,
      unit: "g",
    });
  }
  const portionLabel = form.portionLabel.trim() || "1 porção";
  if (portionLabel.length > 40) errors.portionLabel = "Use até 40 caracteres.";

  // Limites por porção são verificados depois da conversão para 100 g.
  const raw = {
    kcal: checkRange(errors, "kcal", form.kcal, 0, 9000, "a energia", { required: true, unit: "kcal" }),
    protein: checkRange(errors, "protein", form.protein, 0, 2000, "as proteínas", { unit: "g" }),
    carbs: checkRange(errors, "carbs", form.carbs, 0, 2000, "os carboidratos", { unit: "g" }),
    fat: checkRange(errors, "fat", form.fat, 0, 2000, "as gorduras", { unit: "g" }),
    fiber: checkRange(errors, "fiber", form.fiber, 0, 2000, "as fibras", { unit: "g" }),
    sodium: checkRange(errors, "sodium", form.sodium, 0, 800000, "o sódio", { unit: "mg" }),
  };
  if (Object.keys(errors).length) return fail(errors);

  const values: Nutrients = {
    kcal: raw.kcal ?? null,
    protein: raw.protein ?? null,
    carbs: raw.carbs ?? null,
    fat: raw.fat ?? null,
    fiber: raw.fiber ?? null,
    sodium: raw.sodium ?? null,
  };
  const per100g = form.basis === "portion" && portionGrams ? perPortionToPer100g(values, portionGrams) : values;

  // Limites físicos por 100 g: gordura pura tem ~900 kcal; a soma dos nutrientes não passa de 100 g.
  if ((per100g.kcal ?? 0) > 900) errors.kcal = "A energia passa de 900 kcal por 100 g. Confira os valores e a porção.";
  const grams = (per100g.protein ?? 0) + (per100g.carbs ?? 0) + (per100g.fat ?? 0) + (per100g.fiber ?? 0);
  if (grams > 100.5) errors.carbs = "Proteínas, carboidratos, gorduras e fibras somam mais que o peso do alimento. Confira a porção.";
  if ((per100g.sodium ?? 0) > 40000) errors.sodium = "O sódio passa de 40 g por 100 g. Confira o valor (em mg).";
  if (Object.keys(errors).length) return fail(errors);

  const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
  return ok({
    name,
    per100g: {
      kcal: per100g.kcal === null ? null : Math.round(per100g.kcal),
      protein: round1(per100g.protein),
      carbs: round1(per100g.carbs),
      fat: round1(per100g.fat),
      fiber: round1(per100g.fiber),
      sodium: per100g.sodium === null ? null : Math.round(per100g.sodium),
    },
    countsAsFruitVeg: form.countsAsFruitVeg,
    portion: hasPortion && portionGrams ? { label: portionLabel, grams: portionGrams } : undefined,
  });
}

/* ------------------------------------------------------------- Hidratação */

export function validateWater(
  form: { amount: string; date: string; time: string },
  today: DateKey,
): Validation<{ amountMl: number; date: DateKey; time: TimeOfDay }> {
  const errors: FieldErrors = {};
  const amountMl = checkRange(errors, "amount", form.amount, 10, 3000, "a quantidade", { required: true, integer: true, unit: "ml" });
  checkDateTime(errors, form.date, form.time, today);
  if (Object.keys(errors).length || amountMl === undefined) return fail(errors);
  return ok({ amountMl, date: form.date, time: form.time });
}

/* ------------------------------------------------------------- Atividades */

export function validateActivity(
  form: { modalityId: string; variantId: string; duration: string; date: string; time: string },
  today: DateKey,
): Validation<{ modalityId: string; variantId: string; durationMin: number; date: DateKey; time: TimeOfDay }> {
  const errors: FieldErrors = {};
  if (!getVariant(form.modalityId, form.variantId)) errors.variantId = "Escolha a atividade e a intensidade.";
  const durationMin = checkRange(errors, "duration", form.duration, 1, 720, "a duração", { required: true, integer: true, unit: "min" });
  checkDateTime(errors, form.date, form.time, today);
  if (Object.keys(errors).length || durationMin === undefined) return fail(errors);
  return ok({ modalityId: form.modalityId, variantId: form.variantId, durationMin, date: form.date, time: form.time });
}

/* ------------------------------------------------------------------ Metas */

export interface GoalForm {
  title: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: string;
  unit: string;
  customKind: CustomGoalKind;
}

const METRICS: GoalMetric[] = ["water_ml", "activity_minutes", "who_minutes", "active_days", "fruit_veg_g", "meals_logged", "custom"];

const TARGET_LIMITS: Record<GoalMetric, Record<GoalPeriod, [number, number]>> = {
  water_ml: { daily: [250, 6000], weekly: [1000, 42000] },
  activity_minutes: { daily: [5, 600], weekly: [10, 3000] },
  who_minutes: { daily: [5, 600], weekly: [10, 3000] },
  active_days: { daily: [1, 1], weekly: [1, 7] },
  fruit_veg_g: { daily: [50, 2000], weekly: [200, 14000] },
  meals_logged: { daily: [1, 4], weekly: [1, 28] },
  custom: { daily: [0.1, 1000], weekly: [0.1, 7000] },
};

export function validateGoal(
  form: GoalForm,
): Validation<{ title: string; metric: GoalMetric; period: GoalPeriod; target: number; unit: string; customKind?: CustomGoalKind }> {
  const errors: FieldErrors = {};
  const title = form.title.trim().replace(/\s+/g, " ");
  if (title.length < 2) errors.title = "Dê um nome para a meta.";
  else if (title.length > 60) errors.title = "Use até 60 caracteres.";
  if (!METRICS.includes(form.metric)) errors.metric = "Escolha o tipo de meta.";
  if (form.period !== "daily" && form.period !== "weekly") errors.period = "Escolha o período.";
  if (form.metric === "active_days" && form.period !== "weekly") errors.period = "Dias com atividade são contados por semana.";

  let target: number | undefined;
  if (form.metric === "custom" && form.customKind === "check") {
    // "Feito" vale 1 por dia; na semana, o alvo é o número de dias.
    target = form.period === "daily" ? 1 : checkRange(errors, "target", form.target, 1, 7, "o número de dias", { required: true, integer: true });
  } else if (METRICS.includes(form.metric) && (form.period === "daily" || form.period === "weekly")) {
    const [min, max] = TARGET_LIMITS[form.metric][form.period];
    target = checkRange(errors, "target", form.target, min, max, "o alvo", { required: true });
  }
  const unit = form.unit.trim();
  if (unit.length > 12) errors.unit = "Use até 12 caracteres.";

  if (Object.keys(errors).length || target === undefined) return fail(errors);
  return ok({
    title,
    metric: form.metric,
    period: form.period,
    target,
    unit,
    customKind: form.metric === "custom" ? form.customKind : undefined,
  });
}

export function validateCheckinValue(raw: string, kind: CustomGoalKind | undefined): Validation<number> {
  if (kind === "check") return ok(1);
  const errors: FieldErrors = {};
  const value = checkRange(errors, "value", raw, 0, 1000, "o valor", { required: true });
  if (value === undefined) return fail(errors);
  return ok(value);
}

/* ---------------------------------------------------------- Cigarro/álcool */

export interface TrackerForm {
  kind: HabitKind;
  mode: HabitMode;
  baseline: string;
  limit: string;
  /** Cigarro: preço do maço. Álcool: preço médio da dose. */
  price: string;
  packSize: string;
  startDate: string;
  motivation: string;
}

export function validateTracker(
  form: TrackerForm,
  today: DateKey,
): Validation<{
  kind: HabitKind;
  mode: HabitMode;
  baselineAmount: number;
  baselinePeriod: "day" | "week";
  limitAmount?: number;
  unitCost: number;
  startDate: DateKey;
  motivation?: string;
}> {
  const errors: FieldErrors = {};
  if (form.kind !== "tobacco" && form.kind !== "alcohol") errors.kind = "Escolha o hábito.";
  if (form.mode !== "quit" && form.mode !== "reduce") errors.mode = "Escolha o objetivo.";
  const isTobacco = form.kind === "tobacco";
  const baselineAmount = checkRange(errors, "baseline", form.baseline, 1, isTobacco ? 100 : 200, "o consumo habitual", {
    required: true,
  });
  let limitAmount: number | undefined;
  if (form.mode === "reduce") {
    limitAmount = checkRange(errors, "limit", form.limit, 0, isTobacco ? 100 : 200, "o limite", { required: true });
    if (limitAmount !== undefined && baselineAmount !== undefined && limitAmount >= baselineAmount) {
      errors.limit = "O limite precisa ser menor que o consumo habitual.";
    }
  }
  const price = checkRange(errors, "price", form.price, 0, 1000, "o preço", { unit: "reais" });
  let unitCost = 0;
  if (isTobacco) {
    const pack = checkRange(errors, "packSize", form.packSize || "20", 1, 100, "a quantidade por maço", { integer: true });
    if (price !== undefined && pack) unitCost = price / pack;
  } else if (price !== undefined) {
    unitCost = price;
  }
  if (!isValidDateKey(form.startDate)) errors.startDate = "Escolha uma data válida.";
  else if (form.startDate > today) errors.startDate = "A data de início não pode ser no futuro.";
  const motivation = form.motivation.trim();
  if (motivation.length > 140) errors.motivation = "Use até 140 caracteres.";

  if (Object.keys(errors).length || baselineAmount === undefined) return fail(errors);
  return ok({
    kind: form.kind,
    mode: form.mode,
    baselineAmount,
    baselinePeriod: isTobacco ? "day" : "week",
    limitAmount,
    unitCost: Math.round(unitCost * 100) / 100,
    startDate: form.startDate,
    motivation: motivation || undefined,
  });
}

export function validateHabitAmount(raw: string): Validation<number> {
  const errors: FieldErrors = {};
  const amount = checkRange(errors, "amount", raw, 0, 200, "a quantidade", { required: true });
  if (amount === undefined) return fail(errors);
  return ok(amount);
}

const TRIGGERS: CravingTrigger[] = ["stress", "anxiety", "social", "after_meal", "routine", "boredom", "other"];

export function validateCraving(
  form: { intensity: number; trigger: CravingTrigger; strategy: string; note: string; date: string; time: string },
  today: DateKey,
): Validation<{ intensity: 1 | 2 | 3 | 4 | 5; trigger: CravingTrigger; strategy?: string; note?: string; date: DateKey; time: TimeOfDay }> {
  const errors: FieldErrors = {};
  if (![1, 2, 3, 4, 5].includes(form.intensity)) errors.intensity = "Escolha a intensidade.";
  if (!TRIGGERS.includes(form.trigger)) errors.trigger = "Escolha o que estava acontecendo.";
  const note = form.note.trim();
  if (note.length > 280) errors.note = "Use até 280 caracteres.";
  checkDateTime(errors, form.date, form.time, today);
  if (Object.keys(errors).length) return fail(errors);
  return ok({
    intensity: form.intensity as 1 | 2 | 3 | 4 | 5,
    trigger: form.trigger,
    strategy: form.strategy.trim() || undefined,
    note: note || undefined,
    date: form.date,
    time: form.time,
  });
}
