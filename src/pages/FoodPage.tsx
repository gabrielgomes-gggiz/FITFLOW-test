import { useEffect, useMemo, useState } from "react";
import { CustomFoodSheet } from "@/components/food/CustomFoodSheet";
import { FoodEntrySheet } from "@/components/food/FoodEntrySheet";
import { FoodPickerSheet } from "@/components/food/FoodPickerSheet";
import { NutrientGrid } from "@/components/food/NutritionSummary";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { DateNav } from "@/components/ui/DateNav";
import { EmptyState, EstimateNote, Meter } from "@/components/ui/Feedback";
import { TACO_SOURCE } from "@/data/foods";
import { useEnergy, useRunner } from "@/hooks/useAppData";
import { usePageDate } from "@/hooks/usePageDate";
import { href, linkHandler, ROUTES } from "@/hooks/useRouter";
import { PageHeader } from "@/layouts/AppLayout";
import { DAILY_REFERENCES, dayNutrition, entryKcal, macroEnergyShare } from "@/services/nutrition";
import { deleteCustomFood } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import type { CustomFood, FoodEntry, MealType } from "@/types";
import { formatKcal, formatNumber, formatPercent } from "@/utils/format";

export function FoodPage() {
  const { date, setDate, today, openRequested, clearOpenRequest } = usePageDate();
  const entries = useAppState((s) => s.data.foodEntries);
  const customFoods = useAppState((s) => s.data.customFoods);
  const energy = useEnergy(today);
  const run = useRunner();
  const [picker, setPicker] = useState<{ open: boolean; meal?: MealType }>({ open: false });
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [customEditing, setCustomEditing] = useState<CustomFood | null | "new">(null);
  const [customDeleting, setCustomDeleting] = useState<CustomFood | null>(null);

  useEffect(() => {
    if (openRequested) {
      setPicker({ open: true });
      clearOpenRequest();
    }
  }, [openRequested, clearOpenRequest]);

  const day = useMemo(() => dayNutrition(entries, date), [entries, date]);
  const kcal = day.totals.values.kcal;
  const share = macroEnergyShare(day.totals);
  const target = energy.target;

  return (
    <div>
      <PageHeader
        title="Refeições"
        description="Registre o que você comeu. Os valores vêm da Tabela Brasileira de Composição de Alimentos (TACO)."
        action={
          <Button size="lg" icon="plus" onClick={() => setPicker({ open: true })}>
            Registrar refeição
          </Button>
        }
      >
        <DateNav date={date} today={today} onChange={setDate} />
      </PageHeader>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
        <Card className="lg:sticky lg:top-6 lg:order-2" aria-labelledby="resumo-dia">
          <h2 id="resumo-dia" className="sr-only">
            Resumo do dia
          </h2>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Energia consumida</p>
              <p className="text-3xl font-extrabold">
                {formatNumber(Math.round(kcal))} <span className="text-lg font-bold">kcal</span>
              </p>
            </div>
            {target && <p className="pb-1 text-right text-sm text-ink-2">meta estimada {formatNumber(target)} kcal</p>}
          </div>
          {target ? (
            <div className="mt-3">
              <Meter value={kcal / target} domain="food" label="Energia consumida em relação à meta estimada" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-2">
              <a className="font-bold underline underline-offset-4" href={href(ROUTES.profile)} onClick={linkHandler(ROUTES.profile)}>
                Complete idade, peso e altura
              </a>{" "}
              para ver uma meta estimada de energia.
            </p>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <NutrientGrid values={day.totals.values} incomplete={day.totals.incomplete} />
            {share && (
              <p className="mt-3 text-sm text-ink-2">
                Energia vinda de carboidratos {formatPercent(share.carbs)}, proteínas {formatPercent(share.protein)} e gorduras {formatPercent(share.fat)}.
              </p>
            )}
            {Object.values(day.totals.incomplete).some(Boolean) && (
              <p className="mt-2 text-xs text-muted">* Algum alimento não tem esse valor na tabela; o total pode ser maior.</p>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Frutas, legumes e verduras</p>
              <p className="tabular text-sm text-ink-2">
                {formatNumber(Math.round(day.fruitVegG))} de {DAILY_REFERENCES.fruitVegG} g
              </p>
            </div>
            <div className="mt-2">
              <Meter value={day.fruitVegG / DAILY_REFERENCES.fruitVegG} domain="food" label="Frutas, legumes e verduras em relação a 400 g" />
            </div>
            <p className="mt-2 text-sm text-muted">A OMS sugere pelo menos 400 g por dia. Batata e mandioca não entram.</p>
          </div>
          <div className="mt-5">
            <EstimateNote>
              Valores estimados para as quantidades informadas.{" "}
              <a className="font-bold underline underline-offset-4" href={href(ROUTES.about)} onClick={linkHandler(ROUTES.about)}>
                Como calculamos
              </a>
            </EstimateNote>
          </div>
        </Card>

        <div className="space-y-4 lg:order-1">
          {day.entries.length === 0 && (
            <Card>
              <EmptyState
                icon="food"
                title="Nenhuma refeição neste dia"
                action={
                  <Button icon="plus" onClick={() => setPicker({ open: true })}>
                    Registrar refeição
                  </Button>
                }
              >
                Registre o que você comeu para ver energia, nutrientes e frutas, legumes e verduras do dia.
              </EmptyState>
            </Card>
          )}
          {day.meals.map((meal) => (
            <Card key={meal.type} as="section" aria-label={meal.label} className={day.entries.length === 0 ? "py-3 sm:py-3" : ""}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{meal.label}</h2>
                  {meal.entries.length > 0 && <p className="text-sm text-muted">{formatKcal(meal.kcal)}</p>}
                </div>
                <IconButton icon="plus" label={`Adicionar ao ${meal.label.toLowerCase()}`} variant="soft" onClick={() => setPicker({ open: true, meal: meal.type })} />
              </div>
              {meal.entries.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {meal.entries.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-mist/60"
                        aria-label={`${e.foodName}, ${formatNumber(e.quantityG, 1)} gramas às ${e.time}. Editar`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-bold leading-snug">{e.foodName}</span>
                          <span className="text-sm text-muted">
                            {formatNumber(e.quantityG, 1)} g, {e.time}
                          </span>
                        </span>
                        <span className="tabular shrink-0 font-bold">{formatNumber(Math.round(entryKcal(e)))} kcal</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}

          <Card>
            <CardHeader
              title="Meus alimentos"
              description="Para produtos que não estão na TACO, com os dados do rótulo."
              action={
                <Button size="sm" variant="secondary" icon="plus" onClick={() => setCustomEditing("new")}>
                  Cadastrar
                </Button>
              }
            />
            {customFoods.length === 0 ? (
              <p className="text-sm text-muted">Nenhum alimento cadastrado.</p>
            ) : (
              <ul className="divide-y divide-line">
                {customFoods.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{f.name}</span>
                      <span className="text-sm text-muted">
                        {f.per100g.kcal === null ? "—" : formatNumber(f.per100g.kcal)} kcal por 100 g
                        {f.portion ? `, ${f.portion.label} = ${formatNumber(f.portion.grams)} g` : ""}
                      </span>
                    </span>
                    <IconButton icon="edit" label={`Editar ${f.name}`} onClick={() => setCustomEditing(f)} />
                    <IconButton icon="trash" label={`Excluir ${f.name}`} onClick={() => setCustomDeleting(f)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="px-1 text-sm text-muted">Fonte dos valores: {TACO_SOURCE}. Valores por 100 g de parte comestível.</p>
        </div>
      </div>

      <FoodPickerSheet open={picker.open} onClose={() => setPicker({ open: false })} date={date} today={today} initialMeal={picker.meal} />
      <FoodEntrySheet entry={editing} onClose={() => setEditing(null)} today={today} />
      <CustomFoodSheet open={customEditing !== null} food={customEditing === "new" ? null : customEditing} onClose={() => setCustomEditing(null)} />
      <ConfirmDialog
        open={customDeleting !== null}
        title="Excluir alimento cadastrado?"
        description="Ele sai da busca. As refeições já registradas com ele continuam no histórico."
        confirmLabel="Excluir alimento"
        onCancel={() => setCustomDeleting(null)}
        onConfirm={() => {
          const food = customDeleting;
          setCustomDeleting(null);
          if (food) void run(() => deleteCustomFood(food.id), "Alimento excluído.");
        }}
      />
    </div>
  );
}
