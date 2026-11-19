/**
 * Tipos de domínio do FitFlow.
 *
 * Mapeamento a partir do modelo SQL original (FitFlow.sql):
 * - USUARIO + PERFIL        -> Profile (sem e-mail e senha: o app é local e não tem login)
 * - ALIMENTO                -> FoodItem (TACO) e CustomFood (cadastrado pelo usuário), sempre por 100 g
 * - REGISTRO_ALIMENTAR      -> FoodEntry (quantidade em gramas + cópia dos nutrientes usados)
 * - HIDRATACAO              -> WaterEntry
 * - ATIVIDADE_FISICA        -> ActivityModality/ActivityVariant (valores MET, não "kcal por minuto")
 * - REGISTRO_ATIVIDADE      -> ActivityEntry
 * - META                    -> Goal (com métrica, período e unidade)
 * - PROGRESSO_META          -> GoalCheckin (para metas registradas manualmente)
 * - (novo)                  -> HabitTracker, HabitLog, CravingLog (redução de cigarro e álcool)
 * - DISPOSITIVO/MEDICAO     -> fora do escopo desta versão (sem integração com dispositivos)
 */

/** Data local no formato AAAA-MM-DD, no fuso horário do aparelho. */
export type DateKey = string;
/** Horário local no formato HH:mm. */
export type TimeOfDay = string;
/** Data e hora em ISO 8601 (UTC). */
export type ISODateTime = string;

export interface Timestamps {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/* ------------------------------------------------------------------ Perfil */

/** Sexo usado apenas nas equações fisiológicas. */
export type Sex = "female" | "male" | "unspecified";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "intense";
export type Objective = "maintain" | "lose" | "gain" | "fitness";
export type TrackedHabit = "food" | "water" | "activity" | "sleep" | "tobacco" | "alcohol";

export interface Profile extends Timestamps {
  id: string;
  /** Perfis de demonstração podem ser restaurados; perfis pessoais nunca são tocados pela restauração. */
  isDemo: boolean;
  name: string;
  /** Data de nascimento (opcional). Quando existe, tem prioridade sobre a idade informada. */
  birthDate?: DateKey;
  /** Idade informada diretamente e o dia em que foi informada (para envelhecer com o tempo). */
  ageYears?: number;
  ageRecordedOn?: DateKey;
  sex: Sex;
  weightKg?: number;
  heightCm?: number;
  activityLevel: ActivityLevel;
  objective: Objective;
  trackedHabits: TrackedHabit[];
  /** Meta de energia definida manualmente (kcal/dia). Substitui a estimativa. */
  energyTargetOverride?: number;
  /** Meta de água definida manualmente (ml/dia). Substitui a estimativa. */
  waterGoalOverride?: number;
}

/* --------------------------------------------------------------- Alimentos */

export interface Nutrients {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  /** Sódio em miligramas. */
  sodium: number | null;
}

export type NutrientKey = keyof Nutrients;

export type FoodSource = "taco" | "custom";

export interface FoodPortion {
  /** Ex.: "1 pote", "1 fatia". */
  label: string;
  grams: number;
}

/** Visão unificada de um alimento pesquisável (TACO ou personalizado). */
export interface FoodItem {
  /** "taco:<número>" ou "custom:<uuid>". */
  id: string;
  source: FoodSource;
  name: string;
  category: string;
  /** Valores por 100 g de parte comestível. */
  per100g: Nutrients;
  /** Conta para a recomendação de 400 g/dia de frutas, legumes e verduras (OMS). */
  countsAsFruitVeg: boolean;
  portion?: FoodPortion;
}

export interface CustomFood extends Timestamps {
  id: string;
  profileId: string;
  name: string;
  per100g: Nutrients;
  countsAsFruitVeg: boolean;
  portion?: FoodPortion;
}

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export interface FoodEntry extends Timestamps {
  id: string;
  profileId: string;
  date: DateKey;
  time: TimeOfDay;
  mealType: MealType;
  foodId: string;
  source: FoodSource;
  /** Cópia do nome e dos nutrientes no momento do registro: o histórico não muda se o alimento for editado. */
  foodName: string;
  per100g: Nutrients;
  countsAsFruitVeg: boolean;
  quantityG: number;
}

/* -------------------------------------------------------------- Hidratação */

export interface WaterEntry extends Timestamps {
  id: string;
  profileId: string;
  date: DateKey;
  time: TimeOfDay;
  amountMl: number;
}

/* --------------------------------------------------------------- Atividades */

export type ActivityIconKey =
  | "walk"
  | "run"
  | "bike"
  | "dumbbell"
  | "bolt"
  | "water"
  | "lotus"
  | "music"
  | "ball"
  | "glove"
  | "stairs"
  | "mountain"
  | "home";

export interface ActivityVariant {
  id: string;
  label: string;
  hint?: string;
  met: number;
  /** Código da atividade no Compêndio de Atividades Físicas para Adultos 2024. */
  code: string;
  /** O Compêndio marca este valor como estimado (sem medição publicada). */
  estimated?: boolean;
}

export interface ActivityModality {
  id: string;
  name: string;
  icon: ActivityIconKey;
  defaultVariantId: string;
  variants: ActivityVariant[];
}

export type IntensityClass = "light" | "moderate" | "vigorous";

export interface ActivityEntry extends Timestamps {
  id: string;
  profileId: string;
  date: DateKey;
  time: TimeOfDay;
  modalityId: string;
  variantId: string;
  /** Cópias para manter o histórico legível mesmo se o catálogo mudar. */
  name: string;
  variantLabel: string;
  met: number;
  compendiumCode: string;
  durationMin: number;
  /** Gasto bruto estimado (inclui o gasto de repouso no período). Nulo se o peso não foi informado. */
  kcalEstimated: number | null;
  weightKgUsed: number | null;
}

/* ------------------------------------------------------------ Metas/hábitos */

export type GoalMetric =
  | "water_ml"
  | "activity_minutes"
  /** Minutos na conta da OMS: moderada vale 1, vigorosa vale 2, leve não conta. */
  | "who_minutes"
  | "active_days"
  | "fruit_veg_g"
  | "meals_logged"
  | "custom";

export type GoalPeriod = "daily" | "weekly";
export type GoalStatus = "active" | "paused" | "archived";
/** Metas personalizadas: "check" = feito/não feito; "amount" = valor numérico (ex.: horas de sono). */
export type CustomGoalKind = "check" | "amount";

export interface Goal extends Timestamps {
  id: string;
  profileId: string;
  title: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  /** Unidade exibida (ml, min, dias, g, refeições ou texto livre em metas personalizadas). */
  unit: string;
  customKind?: CustomGoalKind;
  /** "waterGoal": o alvo acompanha a meta diária de água do perfil (uma única fonte de verdade). */
  linkedTo?: "waterGoal";
  startDate: DateKey;
  endDate?: DateKey;
  status: GoalStatus;
}

export interface GoalCheckin extends Timestamps {
  id: string;
  profileId: string;
  goalId: string;
  date: DateKey;
  value: number;
}

export type HabitKind = "tobacco" | "alcohol";
export type HabitMode = "quit" | "reduce";

export interface HabitTracker extends Timestamps {
  id: string;
  profileId: string;
  kind: HabitKind;
  mode: HabitMode;
  /** Consumo habitual antes de começar (cigarros por dia ou doses por semana). */
  baselineAmount: number;
  baselinePeriod: "day" | "week";
  /** Limite desejado no modo "reduzir", no mesmo período do consumo habitual. */
  limitAmount?: number;
  /** Custo por unidade em reais (por cigarro ou por dose). */
  unitCost: number;
  startDate: DateKey;
  active: boolean;
  motivation?: string;
}

export interface HabitLog extends Timestamps {
  id: string;
  profileId: string;
  trackerId: string;
  date: DateKey;
  /** Quantidade consumida no dia (0 = dia sem consumo). */
  amount: number;
}

export type CravingTrigger =
  | "stress"
  | "social"
  | "after_meal"
  | "boredom"
  | "anxiety"
  | "routine"
  | "other";

export interface CravingLog extends Timestamps {
  id: string;
  profileId: string;
  trackerId: string;
  date: DateKey;
  time: TimeOfDay;
  intensity: 1 | 2 | 3 | 4 | 5;
  trigger: CravingTrigger;
  /** Alternativa escolhida para atravessar a vontade (opcional). */
  strategy?: string;
  note?: string;
}

/* ------------------------------------------------------------ Armazenamento */

/** Todos os registros de um perfil. Cada item carrega o profileId. */
export interface ProfileData {
  customFoods: CustomFood[];
  foodEntries: FoodEntry[];
  waterEntries: WaterEntry[];
  activityEntries: ActivityEntry[];
  goals: Goal[];
  goalCheckins: GoalCheckin[];
  habitTrackers: HabitTracker[];
  habitLogs: HabitLog[];
  cravings: CravingLog[];
}

export type RecordStoreName = keyof ProfileData;
export type RecordOf<S extends RecordStoreName> = ProfileData[S][number];

export const RECORD_STORES: readonly RecordStoreName[] = [
  "customFoods",
  "foodEntries",
  "waterEntries",
  "activityEntries",
  "goals",
  "goalCheckins",
  "habitTrackers",
  "habitLogs",
  "cravings",
] as const;

export function emptyProfileData(): ProfileData {
  return {
    customFoods: [],
    foodEntries: [],
    waterEntries: [],
    activityEntries: [],
    goals: [],
    goalCheckins: [],
    habitTrackers: [],
    habitLogs: [],
    cravings: [],
  };
}

/** Pacote exportado pelo usuário (portabilidade de dados, LGPD art. 18). */
export interface ExportBundle {
  app: "FitFlow";
  format: 1;
  exportedAt: ISODateTime;
  profile: Profile;
  data: ProfileData;
}
