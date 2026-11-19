import { NUTRIENT_LABELS, type NutrientTotals } from "@/services/nutrition";
import type { NutrientKey, Nutrients } from "@/types";
import { formatKcal, formatNumber } from "@/utils/format";

function formatNutrient(key: NutrientKey, value: number | null, incomplete = false): string {
  if (value === null) return "—";
  const unit = NUTRIENT_LABELS[key].unit;
  const text = key === "kcal" ? formatKcal(value) : unit === "mg" ? `${formatNumber(Math.round(value))} mg` : `${formatNumber(value, 1)} g`;
  return incomplete ? `${text}*` : text;
}

/** Grade de nutrientes (sem energia). Valores desconhecidos aparecem como "—". */
export function NutrientGrid({ values, incomplete }: { values: Nutrients | NutrientTotals["values"]; incomplete?: Partial<Record<NutrientKey, boolean>> }) {
  const keys: NutrientKey[] = ["carbs", "protein", "fat", "fiber", "sodium"];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
      {keys.map((k) => (
        <div key={k} className="min-w-0">
          <dt className="text-sm text-muted">{NUTRIENT_LABELS[k].label}</dt>
          <dd className="tabular font-bold">{formatNutrient(k, values[k] as number | null, incomplete?.[k])}</dd>
        </div>
      ))}
    </dl>
  );
}

export { formatNutrient };
