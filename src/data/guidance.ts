import type { CravingTrigger, GoalMetric, GoalPeriod, CustomGoalKind, HabitKind } from "@/types";

/** Modelos de metas oferecidos na criação. O alvo de água vem da estimativa do perfil. */
export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  metric: GoalMetric;
  period: GoalPeriod;
  /** null = usar a meta de água estimada para o perfil. */
  target: number | null;
  unit: string;
  customKind?: CustomGoalKind;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "water",
    title: "Beber água ao longo do dia",
    description: "Usa a sua meta diária de água.",
    metric: "water_ml",
    period: "daily",
    target: null,
    unit: "ml",
  },
  {
    id: "move-30",
    title: "Me movimentar 30 minutos",
    description: "Qualquer atividade registrada conta.",
    metric: "activity_minutes",
    period: "daily",
    target: 30,
    unit: "min",
  },
  {
    id: "who-150",
    title: "150 minutos de atividade na semana",
    description: "Referência da OMS para adultos: minuto vigoroso vale dois, leve não conta.",
    metric: "who_minutes",
    period: "weekly",
    target: 150,
    unit: "min",
  },
  {
    id: "active-days",
    title: "Treinar 3 dias na semana",
    description: "Dias com pelo menos uma atividade nos últimos 7 dias.",
    metric: "active_days",
    period: "weekly",
    target: 3,
    unit: "dias",
  },
  {
    id: "fruit-veg",
    title: "400 g de frutas, legumes e verduras",
    description: "Referência da OMS. Batata e mandioca não entram na conta.",
    metric: "fruit_veg_g",
    period: "daily",
    target: 400,
    unit: "g",
  },
  {
    id: "log-meals",
    title: "Registrar 3 refeições",
    description: "Conta os tipos de refeição registrados no dia.",
    metric: "meals_logged",
    period: "daily",
    target: 3,
    unit: "refeições",
  },
  {
    id: "sleep",
    title: "Dormir 7 horas ou mais",
    description: "Você informa as horas a cada dia.",
    metric: "custom",
    period: "daily",
    target: 7,
    unit: "h",
    customKind: "amount",
  },
  {
    id: "stretch",
    title: "Alongar o corpo",
    description: "Marque quando fizer.",
    metric: "custom",
    period: "daily",
    target: 1,
    unit: "",
    customKind: "check",
  },
];

export const METRIC_LABELS: Record<GoalMetric, string> = {
  water_ml: "Água",
  activity_minutes: "Minutos de atividade",
  who_minutes: "Minutos ativos (conta da OMS)",
  active_days: "Dias com atividade",
  fruit_veg_g: "Frutas, legumes e verduras",
  meals_logged: "Refeições registradas",
  custom: "Personalizada",
};

export const METRIC_UNITS: Record<Exclude<GoalMetric, "custom">, string> = {
  water_ml: "ml",
  activity_minutes: "min",
  who_minutes: "min",
  active_days: "dias",
  fruit_veg_g: "g",
  meals_logged: "refeições",
};

/* --------------------------------------------------- Redução de cigarro/álcool */

export const HABIT_LABELS: Record<HabitKind, { name: string; unit: string; unitPlural: string; verb: string }> = {
  tobacco: { name: "Cigarro", unit: "cigarro", unitPlural: "cigarros", verb: "fumar" },
  alcohol: { name: "Álcool", unit: "dose", unitPlural: "doses", verb: "beber" },
};

export const TRIGGER_LABELS: Record<CravingTrigger, string> = {
  stress: "Estresse",
  anxiety: "Ansiedade",
  social: "Com amigos ou em festa",
  after_meal: "Depois de comer",
  routine: "Rotina ou costume",
  boredom: "Tédio",
  other: "Outro motivo",
};

/** Alternativas para atravessar a vontade. Não são orientações de tratamento. */
export const COMMON_ALTERNATIVES = [
  "Beber um copo de água devagar",
  "Caminhar por 5 minutos",
  "Respirar devagar por 2 minutos",
  "Mandar mensagem para alguém",
  "Mudar de ambiente por um tempo",
  "Ocupar as mãos com outra tarefa",
];

export const HABIT_ALTERNATIVES: Record<HabitKind, string[]> = {
  tobacco: [
    "Mascar chiclete sem açúcar",
    "Escovar os dentes",
    "Guardar cigarro e isqueiro longe da vista",
    ...COMMON_ALTERNATIVES,
  ],
  alcohol: [
    "Pedir uma bebida sem álcool",
    "Combinar um limite antes de sair",
    "Comer algo antes ou durante o encontro",
    ...COMMON_ALTERNATIVES,
  ],
};

/** Onde buscar apoio profissional gratuito (sem orientação clínica). */
export const SUPPORT_INFO: Record<HabitKind, string> = {
  tobacco:
    "Se quiser apoio profissional, o SUS oferece tratamento gratuito para parar de fumar nas Unidades Básicas de Saúde. Informações pelo Disque Saúde 136.",
  alcohol:
    "Se quiser apoio profissional, as Unidades Básicas de Saúde e os CAPS AD (Centros de Atenção Psicossocial Álcool e Drogas) oferecem acolhimento gratuito pelo SUS. Informações pelo Disque Saúde 136.",
};
