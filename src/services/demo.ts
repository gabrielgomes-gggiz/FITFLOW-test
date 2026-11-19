import { getModality, getVariant } from "@/data/activities";
import { loadTacoFoods } from "@/data/foods";
import type {
  ActivityEntry,
  CravingLog,
  FoodEntry,
  FoodItem,
  Goal,
  GoalCheckin,
  HabitLog,
  HabitTracker,
  MealType,
  Profile,
  ProfileData,
  TimeOfDay,
  WaterEntry,
} from "@/types";
import { addDays, fromDateKey, minutesOfDay, nowTime, timeFromMinutes, todayKey } from "@/utils/date";
import { createId } from "@/utils/id";
import { estimateActivityKcal } from "./activity";
import { estimateWaterGoal } from "./hydration";

/**
 * Dados de demonstração: uma pessoa fictícia ("Mariana") com 14 dias de registros
 * coerentes, sempre relativos à data atual. Os alimentos vêm da TACO e as atividades
 * do Compêndio, então os números seguem as mesmas regras dos registros reais.
 * Registros de hoje só aparecem até o horário atual.
 */

export const DEMO_PROFILE_ID = "demo";
const DEMO_DAYS = 14;

/** Gerador pseudoaleatório determinístico: cada restauração produz o mesmo padrão. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Meal = [tacoId: number, grams: number][];

const BREAKFASTS: Meal[] = [
  [[53, 50], [461, 30], [471, 150], [226, 150]],
  [[448, 170], [7, 30], [182, 100], [471, 150]],
  [[533, 150], [488, 50], [261, 5], [471, 150]],
  [[52, 50], [468, 20], [214, 150], [471, 150]],
];

const LUNCHES: Meal[] = [
  [[3, 220], [561, 160], [410, 140], [78, 40], [157, 60], [260, 8]],
  [[1, 200], [561, 160], [377, 120], [100, 80], [109, 60], [260, 5]],
  [[3, 190], [561, 150], [538, 200], [78, 40], [157, 60]],
  [[3, 200], [561, 150], [301, 150], [546, 120], [260, 8]],
];

const WEEKEND_LUNCH: Meal = [[540, 250], [3, 150], [116, 60], [214, 130]];

const SNACKS: Meal[] = [
  [[182, 100], [589, 15]],
  [[222, 130], [448, 170]],
  [[140, 60], [471, 100]],
  [[225, 200], [7, 20]],
];

const EXTRA_SNACK: Meal = [[13, 30], [471, 100]];

const DINNERS: Meal[] = [
  [[3, 150], [561, 120], [484, 100], [78, 30], [157, 50], [260, 5]],
  [[542, 300], [546, 100], [260, 5]],
  [[53, 100], [488, 100], [157, 60], [461, 30]],
  [[3, 150], [541, 180], [72, 100], [78, 30]],
];

/** Fruta no meio da manhã em alguns dias. */
const MORNING_FRUIT: Meal[] = [[[182, 100]], [[222, 130]], [[214, 150]]];

/** Atividade por dia da semana (0 = domingo). */
const WEEK_PLAN: Record<number, { modalityId: string; variantId: string; minutes: number; time: TimeOfDay } | null> = {
  0: { modalityId: "caminhada", variantId: "normal", minutes: 30, time: "17:00" },
  1: { modalityId: "corrida", variantId: "10", minutes: 30, time: "06:50" },
  2: { modalityId: "musculacao", variantId: "geral", minutes: 50, time: "18:30" },
  3: { modalityId: "caminhada", variantId: "rapida", minutes: 40, time: "07:10" },
  4: { modalityId: "musculacao", variantId: "geral", minutes: 50, time: "18:30" },
  5: { modalityId: "yoga", variantId: "geral", minutes: 45, time: "19:00" },
  6: { modalityId: "ciclismo", variantId: "passeio", minutes: 60, time: "09:00" },
};

const SLEEP_HOURS = [7.5, 6.5, 7, 8, 6, 7.5, 7, 8.5, 6.5, 7, 7.5, 6, 7.5];
/** Consumo de cigarros dos 12 dias anteriores a hoje (do mais antigo ao mais recente). */
const CIGARETTES = [7, 6, 4, 3, 3, 1, 0, 0, 1, 0, 0, 0];

export function buildDemoProfile(now: Date): Profile {
  const stamp = now.toISOString();
  return {
    id: DEMO_PROFILE_ID,
    isDemo: true,
    name: "Mariana",
    ageYears: 31,
    ageRecordedOn: todayKey(now),
    sex: "female",
    weightKg: 64,
    heightCm: 168,
    activityLevel: "moderate",
    objective: "fitness",
    trackedHabits: ["food", "water", "activity", "sleep", "tobacco"],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function buildDemoData(now: Date, foods: Map<string, FoodItem>, profile: Profile = buildDemoProfile(now)): ProfileData {
  const today = todayKey(now);
  const nowMinutes = minutesOfDay(nowTime(now));
  const stamp = now.toISOString();
  const base = { profileId: profile.id, createdAt: stamp, updatedAt: stamp };
  const isPast = (date: string, time: TimeOfDay) => date < today || minutesOfDay(time) <= nowMinutes;

  const foodEntries: FoodEntry[] = [];
  const waterEntries: WaterEntry[] = [];
  const activityEntries: ActivityEntry[] = [];

  const addMeal = (date: string, mealType: MealType, time: TimeOfDay, meal: Meal) => {
    if (!isPast(date, time)) return;
    for (const [tacoId, grams] of meal) {
      const food = foods.get(`taco:${tacoId}`);
      if (!food) continue;
      foodEntries.push({
        ...base,
        id: createId(),
        date,
        time,
        mealType,
        foodId: food.id,
        source: "taco",
        foodName: food.name,
        per100g: food.per100g,
        countsAsFruitVeg: food.countsAsFruitVeg,
        quantityG: grams,
      });
    }
  };

  for (let offset = DEMO_DAYS - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const weekday = fromDateKey(date).getDay();
    const rand = mulberry32(1000 + offset);
    const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
    const jitter = (time: TimeOfDay, spread: number) => timeFromMinutes(minutesOfDay(time) + Math.round((rand() - 0.5) * spread));

    addMeal(date, "breakfast", jitter("07:40", 40), pick(BREAKFASTS));
    if (rand() < 0.5) addMeal(date, "snack", jitter("10:15", 30), pick(MORNING_FRUIT));
    addMeal(date, "lunch", jitter("12:35", 40), weekday === 0 ? WEEKEND_LUNCH : pick(LUNCHES));
    addMeal(date, "snack", jitter("16:00", 50), pick(SNACKS));
    if (rand() < 0.5) addMeal(date, "snack", jitter("17:40", 30), EXTRA_SNACK);
    addMeal(date, "dinner", jitter("20:00", 50), pick(DINNERS));

    for (const slot of ["07:30", "09:45", "11:20", "13:10", "15:15", "17:20", "19:40", "21:30"]) {
      if (rand() < 0.15) continue;
      const time = jitter(slot, 30);
      if (!isPast(date, time)) continue;
      waterEntries.push({ ...base, id: createId(), date, time, amountMl: pick([250, 300, 300, 350, 400]) });
    }

    const plan = WEEK_PLAN[weekday];
    // Hoje sempre tem a atividade do dia (se o horário já passou), para a demonstração mostrar a faixa de movimento.
    const skip = rand() <= 0.2 && offset !== 0;
    if (plan && !skip && isPast(date, plan.time)) {
      const modality = getModality(plan.modalityId);
      const variant = getVariant(plan.modalityId, plan.variantId);
      if (modality && variant) {
        const minutes = plan.minutes + pick([-10, -5, 0, 0, 5, 10]);
        activityEntries.push({
          ...base,
          id: createId(),
          date,
          time: plan.time,
          modalityId: modality.id,
          variantId: variant.id,
          name: modality.name,
          variantLabel: variant.label,
          met: variant.met,
          compendiumCode: variant.code,
          durationMin: minutes,
          kcalEstimated: estimateActivityKcal(variant.met, profile.weightKg ?? 0, minutes),
          weightKgUsed: profile.weightKg ?? null,
        });
      }
    }
  }

  const startDate = addDays(today, -(DEMO_DAYS - 1));
  let order = 0;
  const goal = (fields: Omit<Goal, "id" | "profileId" | "createdAt" | "updatedAt" | "startDate" | "status">): Goal => ({
    ...base,
    // Horários de criação em sequência mantêm a ordem das metas na tela.
    createdAt: new Date(now.getTime() + order++).toISOString(),
    id: createId(),
    startDate,
    status: "active",
    ...fields,
  });
  const water = estimateWaterGoal(profile);
  // Criadas na ordem em que devem aparecer.
  const waterGoal = goal({ title: "Beber água ao longo do dia", metric: "water_ml", period: "daily", target: water.goalMl, unit: "ml", linkedTo: "waterGoal" });
  const activityGoal = goal({ title: "150 minutos de atividade na semana", metric: "who_minutes", period: "weekly", target: 150, unit: "min" });
  const fruitVegGoal = goal({ title: "400 g de frutas, legumes e verduras", metric: "fruit_veg_g", period: "daily", target: 400, unit: "g" });
  const sleepGoal = goal({ title: "Dormir 7 horas ou mais", metric: "custom", period: "daily", target: 7, unit: "h", customKind: "amount" });
  const stretchGoal = goal({ title: "Alongar o corpo", metric: "custom", period: "weekly", target: 4, unit: "", customKind: "check" });
  const goals: Goal[] = [waterGoal, activityGoal, fruitVegGoal, sleepGoal, stretchGoal];

  const goalCheckins: GoalCheckin[] = [];
  SLEEP_HOURS.forEach((hours, i) => {
    goalCheckins.push({ ...base, id: createId(), goalId: sleepGoal.id, date: addDays(today, -(SLEEP_HOURS.length - i)), value: hours });
  });
  for (const offset of [12, 10, 9, 7, 5, 4, 2, 1]) {
    goalCheckins.push({ ...base, id: createId(), goalId: stretchGoal.id, date: addDays(today, -offset), value: 1 });
  }

  const tracker: HabitTracker = {
    ...base,
    id: createId(),
    kind: "tobacco",
    mode: "quit",
    baselineAmount: 10,
    baselinePeriod: "day",
    unitCost: 0.5,
    startDate: addDays(today, -CIGARETTES.length),
    active: true,
    motivation: "Ter mais fôlego para correr",
  };
  const habitLogs: HabitLog[] = CIGARETTES.map((amount, i) => ({
    ...base,
    id: createId(),
    trackerId: tracker.id,
    date: addDays(today, -(CIGARETTES.length - i)),
    amount,
  }));
  const craving = (daysAgo: number, time: TimeOfDay, intensity: CravingLog["intensity"], trigger: CravingLog["trigger"], strategy?: string, note?: string): CravingLog => ({
    ...base,
    id: createId(),
    trackerId: tracker.id,
    date: addDays(today, -daysAgo),
    time,
    intensity,
    trigger,
    strategy,
    note,
  });
  const cravings: CravingLog[] = [
    craving(10, "10:20", 4, "stress", "Respirar devagar por 2 minutos"),
    craving(8, "13:15", 3, "after_meal", "Escovar os dentes"),
    craving(6, "22:10", 4, "social", "Mandar mensagem para alguém"),
    craving(4, "16:40", 5, "stress", undefined, "Dia corrido no trabalho"),
    craving(2, "13:05", 2, "after_meal", "Beber um copo de água devagar"),
    craving(1, "08:30", 2, "routine", "Caminhar por 5 minutos"),
  ];

  return {
    customFoods: [],
    foodEntries,
    waterEntries,
    activityEntries,
    goals,
    goalCheckins,
    habitTrackers: [tracker],
    habitLogs,
    cravings,
  };
}

/** Monta perfil e registros de demonstração (carrega a TACO). */
export async function createDemoDataset(now: Date = new Date()): Promise<{ profile: Profile; data: ProfileData }> {
  const foods = new Map((await loadTacoFoods()).map((f) => [f.id, f]));
  const profile = buildDemoProfile(now);
  return { profile, data: buildDemoData(now, foods, profile) };
}
