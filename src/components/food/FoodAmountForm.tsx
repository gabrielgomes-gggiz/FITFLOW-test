import { ChoiceChips, Segmented } from "@/components/ui/Choice";
import { NumberField, TextField } from "@/components/ui/Field";
import { MEAL_TYPES, scaleNutrients } from "@/services/nutrition";
import { parseDecimal, type FieldErrors, type FoodEntryForm } from "@/services/validation";
import type { FoodItem, MealType } from "@/types";
import { formatNumber } from "@/utils/format";
import { NutrientGrid } from "./NutritionSummary";

/** Quantidade, refeição e horário de um alimento, com prévia dos nutrientes. */
export function FoodAmountForm({
  food,
  form,
  set,
  errors,
  today,
  showDate,
}: {
  food: Pick<FoodItem, "name" | "per100g" | "portion" | "source">;
  form: FoodEntryForm;
  set: <K extends keyof FoodEntryForm>(key: K, value: FoodEntryForm[K]) => void;
  errors: FieldErrors;
  today: string;
  showDate?: boolean;
}) {
  const amount = parseDecimal(form.quantity);
  const grams = amount === null ? null : form.unit === "portion" && food.portion ? amount * food.portion.grams : amount;
  const preview = grams && grams > 0 ? scaleNutrients(food.per100g, grams) : null;
  const chips =
    form.unit === "portion"
      ? [
          { value: "0,5", label: "½" },
          { value: "1", label: "1" },
          { value: "1,5", label: "1½" },
          { value: "2", label: "2" },
        ]
      : ["50", "100", "150", "200", "300"].map((g) => ({ value: g, label: `${g} g` }));

  return (
    <div className="space-y-5">
      {food.portion && (
        <Segmented
          label="Informar em"
          value={form.unit}
          onChange={(v) => {
            set("unit", v);
            set("quantity", v === "portion" ? "1" : String(food.portion!.grams));
          }}
          options={[
            { value: "g", label: "Gramas" },
            { value: "portion", label: `${food.portion.label} (${formatNumber(food.portion.grams)} g)` },
          ]}
        />
      )}
      <div>
        <NumberField
          label="Quantidade"
          suffix={form.unit === "portion" ? "porções" : "g"}
          value={form.quantity}
          onChange={(v) => set("quantity", v)}
          error={errors.quantity}
        />
        <div className="mt-2">
          <ChoiceChips label="Quantidades rápidas" hideLabel value={form.quantity} onChange={(v) => set("quantity", v)} options={chips} />
        </div>
        {food.source === "taco" && form.unit === "g" && (
          <p className="mt-2 text-sm text-muted">Para bebidas, 1 ml equivale a cerca de 1 g.</p>
        )}
      </div>
      <ChoiceChips<MealType>
        label="Refeição"
        value={form.mealType}
        onChange={(v) => set("mealType", v)}
        options={MEAL_TYPES.map((m) => ({ value: m.id, label: m.label }))}
      />
      <div className={`grid gap-3 ${showDate ? "grid-cols-2" : "grid-cols-1"}`}>
        <TextField type="time" label="Horário" value={form.time} onChange={(v) => set("time", v)} error={errors.time} />
        {showDate && <TextField type="date" label="Data" max={today} value={form.date} onChange={(v) => set("date", v)} error={errors.date} />}
      </div>

      <section aria-live="polite" className="rounded-2xl bg-food-soft p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-bold">{grams ? `Em ${formatNumber(grams, 1)} g` : "Informe a quantidade"}</h3>
          <p className="text-2xl font-extrabold">
            {preview?.kcal != null ? formatNumber(Math.round(preview.kcal)) : "—"} <span className="text-base font-bold">kcal</span>
          </p>
        </div>
        {preview && (
          <div className="mt-3">
            <NutrientGrid values={preview} />
          </div>
        )}
        <p className="mt-3 text-xs text-ink-2">
          Estimativa calculada a partir dos valores por 100 g {food.source === "taco" ? "da TACO" : "que você cadastrou"}.
        </p>
      </section>
    </div>
  );
}
