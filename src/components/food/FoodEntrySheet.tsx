import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useRunner } from "@/hooks/useAppData";
import { validateFoodEntry, type FieldErrors, type FoodEntryForm } from "@/services/validation";
import { deleteFoodEntry, restoreRecord, updateFoodEntry } from "@/store/actions";
import type { DateKey, FoodEntry } from "@/types";
import { formatNumber } from "@/utils/format";
import { FoodAmountForm } from "./FoodAmountForm";

/** Editar ou excluir um alimento registrado. */
export function FoodEntrySheet({ entry, onClose, today }: { entry: FoodEntry | null; onClose: () => void; today: DateKey }) {
  const [form, setForm] = useState<FoodEntryForm>({ quantity: "", unit: "g", mealType: "lunch", date: today, time: "12:00" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const run = useRunner();
  const formId = useId();

  useEffect(() => {
    if (!entry) return;
    setForm({ quantity: formatNumber(entry.quantityG, 1), unit: "g", mealType: entry.mealType, date: entry.date, time: entry.time });
    setErrors({});
  }, [entry]);

  if (!entry) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const set = <K extends keyof FoodEntryForm>(k: K, v: FoodEntryForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const result = validateFoodEntry(form, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    const ok = await run(() => updateFoodEntry(entry.id, result.value), "Registro atualizado.");
    setBusy(false);
    if (ok) onClose();
  };

  const remove = async () => {
    setBusy(true);
    const removed = await run(
      () => deleteFoodEntry(entry.id),
      "Alimento excluído.",
      (r) => (r ? () => restoreRecord("foodEntries", r) : undefined),
    );
    setBusy(false);
    if (removed !== undefined) onClose();
  };

  return (
    <Sheet
      open={Boolean(entry)}
      onClose={onClose}
      title={entry.foodName}
      description={entry.source === "taco" ? "Valores da TACO por 100 g" : "Alimento cadastrado por você"}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" icon="trash" onClick={() => void remove()} disabled={busy} className="text-danger">
            Excluir
          </Button>
          <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
            Salvar alterações
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FoodAmountForm
          food={{ name: entry.foodName, per100g: entry.per100g, source: entry.source }}
          form={form}
          set={set}
          errors={errors}
          today={today}
          showDate
        />
      </form>
    </Sheet>
  );
}
