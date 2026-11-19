import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { customFoodToItem, TACO_SOURCE } from "@/data/foods";
import { useFoodCatalog, useRunner } from "@/hooks/useAppData";
import { searchFoods } from "@/services/foodSearch";
import { MEAL_LABELS, suggestMealType } from "@/services/nutrition";
import { validateFoodEntry, type FieldErrors, type FoodEntryForm } from "@/services/validation";
import { addFoodEntry, deleteFoodEntry } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import type { DateKey, FoodItem, MealType } from "@/types";
import { nowTime } from "@/utils/date";
import { formatNumber } from "@/utils/format";
import { CustomFoodSheet } from "./CustomFoodSheet";
import { FoodAmountForm } from "./FoodAmountForm";

function FoodRow({ food, onSelect }: { food: FoodItem; onSelect: (f: FoodItem) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-mist focus-visible:bg-mist"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug text-ink">{food.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {food.source === "custom" ? <Badge tone="food">Meu alimento</Badge> : food.category}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="tabular block font-bold">{food.per100g.kcal === null ? "—" : formatNumber(food.per100g.kcal)}</span>
          <span className="block text-xs text-muted">kcal/100 g</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Registrar refeição: buscar o alimento (TACO + cadastrados), escolher quantidade e
 * refeição. Depois de adicionar, volta para a busca para montar a refeição inteira.
 */
export function FoodPickerSheet({
  open,
  onClose,
  date,
  today,
  initialMeal,
}: {
  open: boolean;
  onClose: () => void;
  date: DateKey;
  today: DateKey;
  initialMeal?: MealType;
}) {
  const catalog = useFoodCatalog();
  const entries = useAppState((s) => s.data.foodEntries);
  const run = useRunner();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [form, setForm] = useState<FoodEntryForm>({ quantity: "100", unit: "g", mealType: "lunch", date, time: "12:00" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [added, setAdded] = useState<string[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    const time = date === today ? nowTime() : "12:00";
    setForm({ quantity: "100", unit: "g", mealType: initialMeal ?? suggestMealType(time), date, time });
    setQuery("");
    setSelected(null);
    setErrors({});
    setAdded([]);
  }, [open, date, today, initialMeal]);

  useEffect(() => {
    if (open && !selected) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open, selected]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const list: FoodItem[] = [];
    for (const e of [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      if (seen.has(e.foodId)) continue;
      seen.add(e.foodId);
      list.push(
        catalog.byId.get(e.foodId) ?? {
          id: e.foodId,
          source: e.source,
          name: e.foodName,
          category: e.source === "custom" ? "Meus alimentos" : "",
          per100g: e.per100g,
          countsAsFruitVeg: e.countsAsFruitVeg,
        },
      );
      if (list.length >= 6) break;
    }
    return list;
  }, [entries, catalog.byId]);

  const results = useMemo(() => (deferredQuery.trim() ? searchFoods(catalog.index, deferredQuery, 40) : []), [catalog.index, deferredQuery]);

  const select = (food: FoodItem) => {
    setSelected(food);
    setErrors({});
    setForm((f) => ({
      ...f,
      unit: food.portion ? "portion" : "g",
      quantity: food.portion ? "1" : "100",
    }));
  };

  const set = <K extends keyof FoodEntryForm>(k: K, v: FoodEntryForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = async () => {
    if (!selected) return;
    const result = validateFoodEntry({ ...form, portionGrams: selected.portion?.grams }, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    const entry = await run(
      () => addFoodEntry(selected, result.value),
      (e) => `Adicionado ao ${MEAL_LABELS[e.mealType].toLowerCase()}: ${selected.name.split(",")[0]}.`,
      (e) => () => deleteFoodEntry(e.id),
    );
    setBusy(false);
    if (entry) {
      setAdded((a) => [...a, `${entry.foodName} (${formatNumber(entry.quantityG, 1)} g)`]);
      setSelected(null);
      setQuery("");
    }
  };

  const title = selected ? selected.name : "Registrar refeição";

  return (
    <>
      <Sheet
        open={open && !customOpen}
        onClose={onClose}
        title={title}
        description={selected ? (selected.source === "taco" ? `${TACO_SOURCE}, ${selected.category.toLowerCase()}` : "Cadastrado por você") : "Busque um alimento da TACO ou um que você cadastrou."}
        footer={
          selected ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setSelected(null)} icon="chevronLeft">
                Voltar
              </Button>
              <Button type="submit" form={formId} full size="lg" busy={busy} icon="plus">
                Adicionar
              </Button>
            </div>
          ) : added.length > 0 ? (
            <Button full size="lg" variant="primary" icon="check" onClick={onClose}>
              Concluir
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <form
            id={formId}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <FoodAmountForm food={selected} form={form} set={set} errors={errors} today={today} />
          </form>
        ) : (
          <div>
            {added.length > 0 && (
              <div className="mb-4 rounded-2xl bg-ok-soft p-3 text-sm" role="status">
                <p className="font-bold">Adicionados agora</p>
                <ul className="mt-1 list-disc pl-5">
                  {added.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: arroz, banana, frango grelhado"
                aria-label="Buscar alimento"
                className="field-control pl-11"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>

            {catalog.status === "error" && (
              <div className="mt-4 rounded-2xl bg-danger-soft p-3 text-sm">
                Não foi possível carregar a tabela de alimentos.{" "}
                <button type="button" className="font-bold underline" onClick={catalog.retry}>
                  Tentar de novo
                </button>
              </div>
            )}

            {query.trim() ? (
              results.length > 0 ? (
                <ul className="-mx-3 mt-3" aria-label="Resultados da busca">
                  {results.map((f) => (
                    <FoodRow key={f.id} food={f} onSelect={select} />
                  ))}
                </ul>
              ) : catalog.status === "loading" ? (
                <p className="mt-6 text-center text-muted">Carregando alimentos…</p>
              ) : (
                <EmptyState
                  icon="search"
                  title={`Nada encontrado para “${query.trim()}”`}
                  action={
                    <Button variant="secondary" icon="plus" onClick={() => setCustomOpen(true)}>
                      Cadastrar este alimento
                    </Button>
                  }
                >
                  Tente outra palavra (ex.: “pão” em vez de “pãozinho”) ou cadastre o alimento com os dados do rótulo.
                </EmptyState>
              )
            ) : (
              <>
                {recent.length > 0 && (
                  <>
                    <h3 className="mt-5 text-sm font-bold text-ink-2">Usados recentemente</h3>
                    <ul className="-mx-3 mt-1">
                      {recent.map((f) => (
                        <FoodRow key={f.id} food={f} onSelect={select} />
                      ))}
                    </ul>
                  </>
                )}
                <h3 className="mt-5 text-sm font-bold text-ink-2">Comuns no dia a dia</h3>
                <ul className="-mx-3 mt-1">
                  {catalog.frequent
                    .filter((f) => !recent.some((r) => r.id === f.id))
                    .slice(0, 8)
                    .map((f) => (
                      <FoodRow key={f.id} food={f} onSelect={select} />
                    ))}
                </ul>
              </>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <Button variant="ghost" icon="plus" onClick={() => setCustomOpen(true)} className="-ml-2">
                Cadastrar alimento que não está na lista
              </Button>
            </div>
          </div>
        )}
      </Sheet>
      <CustomFoodSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        initialName={query.trim()}
        onSaved={(food) => select(customFoodToItem(food))}
      />
    </>
  );
}
