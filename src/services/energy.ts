import type { ActivityLevel, DateKey, Objective, Profile, Sex } from "@/types";
import { ageOn, diffDays } from "@/utils/date";
import { roundTo } from "@/utils/format";

/**
 * Estimativas de energia.
 *
 * 1. Taxa metabólica basal (TMB) — equação de Mifflin-St Jeor (Am J Clin Nutr. 1990;51:241-7):
 *      homens:   10 × peso(kg) + 6,25 × altura(cm) − 5 × idade + 5
 *      mulheres: 10 × peso(kg) + 6,25 × altura(cm) − 5 × idade − 161
 *    Sem o sexo informado usamos a média dos dois termos (−78) e avisamos o usuário.
 * 2. Gasto energético total estimado (GET) = TMB × fator de atividade.
 *    O fator já inclui a rotina e os exercícios habituais; por isso as atividades
 *    registradas NÃO são somadas à meta (seria contar o mesmo gasto duas vezes).
 * 3. Meta = GET ajustado pelo objetivo (−15% para perder peso, +10% para ganhar massa),
 *    nunca abaixo da TMB estimada.
 *
 * As equações foram desenvolvidas para adultos; para menores de 18 anos não calculamos meta.
 * Todos os resultados são estimativas arredondadas para 10 kcal.
 */

export const ACTIVITY_LEVELS: Record<ActivityLevel, { factor: number; label: string; description: string }> = {
  sedentary: {
    factor: 1.2,
    label: "Sedentário",
    description: "Passo a maior parte do dia sentado e quase não faço exercícios.",
  },
  light: {
    factor: 1.375,
    label: "Pouco ativo",
    description: "Faço exercícios leves de 1 a 3 vezes por semana.",
  },
  moderate: {
    factor: 1.55,
    label: "Ativo",
    description: "Faço exercícios moderados de 3 a 5 vezes por semana.",
  },
  intense: {
    factor: 1.725,
    label: "Muito ativo",
    description: "Treino forte quase todos os dias ou tenho trabalho físico pesado.",
  },
};

export const OBJECTIVES: Record<Objective, { label: string; adjustment: number }> = {
  maintain: { label: "Manter hábitos saudáveis", adjustment: 0 },
  fitness: { label: "Melhorar o condicionamento", adjustment: 0 },
  lose: { label: "Perder peso", adjustment: -0.15 },
  gain: { label: "Ganhar massa muscular", adjustment: 0.1 },
};

export const SEX_LABELS: Record<Sex, string> = {
  female: "Feminino",
  male: "Masculino",
  unspecified: "Prefiro não informar",
};

export const MIN_ADULT_AGE = 18;

/** Idade atual: usa a data de nascimento ou envelhece a idade informada desde o registro. */
export function currentAge(profile: Pick<Profile, "birthDate" | "ageYears" | "ageRecordedOn">, today: DateKey): number | null {
  if (profile.birthDate) return ageOn(profile.birthDate, today);
  if (typeof profile.ageYears === "number") {
    const recordedOn = profile.ageRecordedOn ?? today;
    const elapsedYears = Math.floor(Math.max(0, diffDays(today, recordedOn)) / 365.25);
    return profile.ageYears + elapsedYears;
  }
  return null;
}

export function bmrMifflinStJeor(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  const sexTerm = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexTerm;
}

export type MissingField = "idade" | "peso" | "altura";

export interface EnergyEstimate {
  /** ok: estimativa disponível; incomplete: faltam dados; underage: menor de 18 anos. */
  status: "ok" | "incomplete" | "underage";
  missing: MissingField[];
  bmr: number | null;
  tdee: number | null;
  estimatedTarget: number | null;
  /** Meta efetivamente usada: a manual tem prioridade sobre a estimada. */
  target: number | null;
  targetSource: "manual" | "estimate" | "none";
  activityFactor: number;
  objectiveAdjustment: number;
  usedSexAverage: boolean;
  floorApplied: boolean;
}

export function estimateEnergy(profile: Profile, today: DateKey): EnergyEstimate {
  const age = currentAge(profile, today);
  const activityFactor = ACTIVITY_LEVELS[profile.activityLevel].factor;
  const objectiveAdjustment = OBJECTIVES[profile.objective].adjustment;
  const manual = typeof profile.energyTargetOverride === "number" ? profile.energyTargetOverride : null;

  const missing: MissingField[] = [];
  if (age === null) missing.push("idade");
  if (!profile.weightKg) missing.push("peso");
  if (!profile.heightCm) missing.push("altura");

  const base = {
    activityFactor,
    objectiveAdjustment,
    usedSexAverage: profile.sex === "unspecified",
    floorApplied: false,
  };

  if (age !== null && age < MIN_ADULT_AGE) {
    return {
      ...base,
      status: "underage",
      missing,
      bmr: null,
      tdee: null,
      estimatedTarget: null,
      target: manual,
      targetSource: manual ? "manual" : "none",
    };
  }

  if (missing.length > 0 || age === null || !profile.weightKg || !profile.heightCm) {
    return {
      ...base,
      status: "incomplete",
      missing,
      bmr: null,
      tdee: null,
      estimatedTarget: null,
      target: manual,
      targetSource: manual ? "manual" : "none",
    };
  }

  const bmrRaw = bmrMifflinStJeor(profile.weightKg, profile.heightCm, age, profile.sex);
  const tdeeRaw = bmrRaw * activityFactor;
  let targetRaw = tdeeRaw * (1 + objectiveAdjustment);
  let floorApplied = false;
  if (targetRaw < bmrRaw) {
    targetRaw = bmrRaw;
    floorApplied = true;
  }
  const estimatedTarget = roundTo(targetRaw, 10);

  return {
    ...base,
    floorApplied,
    status: "ok",
    missing,
    bmr: roundTo(bmrRaw, 10),
    tdee: roundTo(tdeeRaw, 10),
    estimatedTarget,
    target: manual ?? estimatedTarget,
    targetSource: manual ? "manual" : "estimate",
  };
}

/* ----------------------------------------------------------------------- IMC */

export function bodyMassIndex(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export interface BmiClassification {
  label: string;
  reference: string;
}

/**
 * Classificação do IMC para adultos (OMS) e para pessoas idosas (≥ 60 anos, critério
 * adotado pelo SISVAN/Ministério da Saúde). Menores de 18 anos usam curvas por idade,
 * que não aplicamos aqui.
 */
export function classifyBmi(bmi: number, age: number | null): BmiClassification | null {
  if (age !== null && age < MIN_ADULT_AGE) return null;
  if (age !== null && age >= 60) {
    const reference = "SISVAN, pessoas com 60 anos ou mais";
    if (bmi <= 22) return { label: "Baixo peso", reference };
    if (bmi < 27) return { label: "Peso adequado", reference };
    return { label: "Sobrepeso", reference };
  }
  const reference = "OMS, adultos";
  if (bmi < 18.5) return { label: "Baixo peso", reference };
  if (bmi < 25) return { label: "Peso adequado", reference };
  if (bmi < 30) return { label: "Sobrepeso", reference };
  return { label: "Obesidade", reference };
}
