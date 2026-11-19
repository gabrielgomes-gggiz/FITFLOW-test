import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Choice";
import { NumberField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Feedback";
import { Sheet } from "@/components/ui/Sheet";
import { useRunner } from "@/hooks/useAppData";
import { validateCustomFood, type CustomFoodForm, type FieldErrors } from "@/services/validation";
import { saveCustomFood } from "@/store/actions";
import type { CustomFood } from "@/types";
import { formatNumber } from "@/utils/format";

const EMPTY: CustomFoodForm = {
  name: "",
  basis: "portion",
  portionLabel: "",
  portionGrams: "",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  sodium: "",
  countsAsFruitVeg: false,
};

function toForm(food: CustomFood): CustomFoodForm {
  const v = (n: number | null) => (n === null ? "" : formatNumber(n, 1));
  return {
    name: food.name,
    basis: "100g",
    portionLabel: food.portion?.label ?? "",
    portionGrams: food.portion ? String(food.portion.grams) : "",
    kcal: v(food.per100g.kcal),
    protein: v(food.per100g.protein),
    carbs: v(food.per100g.carbs),
    fat: v(food.per100g.fat),
    fiber: v(food.per100g.fiber),
    sodium: v(food.per100g.sodium),
    countsAsFruitVeg: food.countsAsFruitVeg,
  };
}

/** Cadastro de alimento a partir do rótulo (por porção ou por 100 g). */
export function CustomFoodSheet({
  open,
  onClose,
  food,
  initialName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  food?: CustomFood | null;
  initialName?: string;
  onSaved?: (food: CustomFood) => void;
}) {
  const [form, setForm] = useState<CustomFoodForm>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const run = useRunner();
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    setForm(food ? toForm(food) : { ...EMPTY, name: initialName ?? "" });
    setErrors({});
  }, [open, food, initialName]);

  const set = <K extends keyof CustomFoodForm>(k: K, v: CustomFoodForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const perLabel = form.basis === "portion" ? "por porção" : "por 100 g";

  const submit = async () => {
    const result = validateCustomFood(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    const saved = await run(() => saveCustomFood(result.value, food?.id), food ? "Alimento atualizado." : "Alimento cadastrado.");
    setBusy(false);
    if (saved) {
      onSaved?.(saved);
      onClose();
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={food ? "Editar alimento" : "Cadastrar alimento"}
      description="Copie os valores do rótulo. Só a energia é obrigatória."
      footer={
        <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
          {food ? "Salvar alterações" : "Cadastrar alimento"}
        </Button>
      }
    >
      <form
        id={formId}
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField label="Nome" value={form.name} onChange={(v) => set("name", v)} error={errors.name} maxLength={80} placeholder="Ex.: Iogurte grego natural" />
        <Segmented
          label="Os valores do rótulo são"
          value={form.basis}
          onChange={(v) => set("basis", v)}
          options={[
            { value: "portion", label: "Por porção" },
            { value: "100g", label: "Por 100 g" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Nome da porção"
            optional={form.basis === "100g"}
            value={form.portionLabel}
            onChange={(v) => set("portionLabel", v)}
            error={errors.portionLabel}
            placeholder="1 pote"
            maxLength={40}
          />
          <NumberField
            label="Peso da porção"
            optional={form.basis === "100g"}
            suffix="g"
            value={form.portionGrams}
            onChange={(v) => set("portionGrams", v)}
            error={errors.portionGrams}
            placeholder="170"
          />
        </div>
        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-bold">Informação nutricional ({perLabel})</legend>
          <NumberField label="Energia" suffix="kcal" value={form.kcal} onChange={(v) => set("kcal", v)} error={errors.kcal} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Carboidratos" optional suffix="g" value={form.carbs} onChange={(v) => set("carbs", v)} error={errors.carbs} />
            <NumberField label="Proteínas" optional suffix="g" value={form.protein} onChange={(v) => set("protein", v)} error={errors.protein} />
            <NumberField label="Gorduras totais" optional suffix="g" value={form.fat} onChange={(v) => set("fat", v)} error={errors.fat} />
            <NumberField label="Fibras" optional suffix="g" value={form.fiber} onChange={(v) => set("fiber", v)} error={errors.fiber} />
          </div>
          <NumberField label="Sódio" optional suffix="mg" value={form.sodium} onChange={(v) => set("sodium", v)} error={errors.sodium} />
        </fieldset>
        <label className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
          <input
            type="checkbox"
            checked={form.countsAsFruitVeg}
            onChange={(e) => set("countsAsFruitVeg", e.target.checked)}
            className="mt-1 size-5 accent-[var(--color-ink)]"
          />
          <span>
            <span className="block font-bold">É fruta, legume ou verdura</span>
            <span className="text-sm text-muted">Conta para as 400 g diárias sugeridas pela OMS (não vale para batata e mandioca).</span>
          </span>
        </label>
        <Notice>Os valores que você cadastra são de sua responsabilidade e aparecem como “cadastrado por você”.</Notice>
      </form>
    </Sheet>
  );
}
