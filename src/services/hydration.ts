import type { DateKey, Profile, Sex, WaterEntry } from "@/types";
import { roundTo } from "@/utils/format";

/**
 * Meta de água (bebidas) — estimativa ajustável, nunca uma regra universal.
 *
 * - Com peso informado: 35 ml por kg de peso corporal, regra prática usada em nutrição
 *   para adultos saudáveis, arredondada para 50 ml.
 * - Limites: não fica abaixo da parcela de bebidas das referências da EFSA (2010) —
 *   cerca de 1,6 L/dia para mulheres e 2,0 L/dia para homens, já que os alimentos
 *   fornecem parte da água total (2,0 L e 2,5 L) — nem acima de 4 L.
 * - Sem peso: usamos essas referências diretamente (1,8 L quando o sexo não é informado).
 *
 * Calor, exercícios, gestação, amamentação e condições de saúde (ex.: doenças renais ou
 * cardíacas) mudam a necessidade. Nesses casos vale a orientação de um profissional.
 */

export const WATER_ML_PER_KG = 35;
export const WATER_REFERENCE_ML: Record<Sex, number> = { female: 1600, male: 2000, unspecified: 1800 };
export const WATER_MAX_ML = 4000;
export const QUICK_WATER_AMOUNTS = [200, 300, 500] as const;

export interface WaterGoalEstimate {
  goalMl: number;
  estimatedMl: number;
  source: "manual" | "weight" | "reference";
}

export function estimateWaterGoal(profile: Pick<Profile, "weightKg" | "sex" | "waterGoalOverride">): WaterGoalEstimate {
  const reference = WATER_REFERENCE_ML[profile.sex];
  const estimatedMl = profile.weightKg
    ? Math.min(WATER_MAX_ML, Math.max(reference, roundTo(profile.weightKg * WATER_ML_PER_KG, 50)))
    : reference;
  if (typeof profile.waterGoalOverride === "number") {
    return { goalMl: profile.waterGoalOverride, estimatedMl, source: "manual" };
  }
  return { goalMl: estimatedMl, estimatedMl, source: profile.weightKg ? "weight" : "reference" };
}

export function waterTotalOn(entries: WaterEntry[], date: DateKey): number {
  return entries.reduce((sum, e) => (e.date === date ? sum + e.amountMl : sum), 0);
}

export function waterProgress(totalMl: number, goalMl: number): number {
  return goalMl > 0 ? totalMl / goalMl : 0;
}
