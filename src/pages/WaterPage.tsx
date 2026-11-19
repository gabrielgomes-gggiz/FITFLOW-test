import { useEffect, useId, useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChoiceChips } from "@/components/ui/Choice";
import { DateNav } from "@/components/ui/DateNav";
import { EmptyState, EstimateNote, Meter } from "@/components/ui/Feedback";
import { NumberField, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useProfile, useRunner, useWaterGoal } from "@/hooks/useAppData";
import { usePageDate } from "@/hooks/usePageDate";
import { href, linkHandler, ROUTES } from "@/hooks/useRouter";
import { PageHeader } from "@/layouts/AppLayout";
import { QUICK_WATER_AMOUNTS, WATER_ML_PER_KG, waterTotalOn } from "@/services/hydration";
import { entriesOn } from "@/services/nutrition";
import { validateManualTargets, validateWater, type FieldErrors } from "@/services/validation";
import { addWater, deleteWater, restoreRecord, updateProfile, updateWater } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import type { DateKey, WaterEntry } from "@/types";
import { formatDateShort, formatWeekdayShort, lastNDays, nowTime } from "@/utils/date";
import { formatLiters, formatMl, formatNumber } from "@/utils/format";

function WaterEntrySheet({
  open,
  entry,
  date,
  today,
  onClose,
}: {
  open: boolean;
  entry: WaterEntry | null;
  date: DateKey;
  today: DateKey;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("250");
  const [time, setTime] = useState("12:00");
  const [day, setDay] = useState(date);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const run = useRunner();
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    setAmount(entry ? String(entry.amountMl) : "250");
    setTime(entry ? entry.time : date === today ? nowTime() : "12:00");
    setDay(entry ? entry.date : date);
    setErrors({});
  }, [open, entry, date, today]);

  const save = async () => {
    const result = validateWater({ amount, date: day, time }, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    const saved = entry
      ? await run(() => updateWater(entry.id, result.value), "Registro atualizado.")
      : await run(
          () => addWater(result.value),
          (e) => `${formatMl(e.amountMl)} de água adicionados.`,
          (e) => () => deleteWater(e.id),
        );
    setBusy(false);
    if (saved) onClose();
  };

  const remove = async () => {
    if (!entry) return;
    setBusy(true);
    const removed = await run(() => deleteWater(entry.id), "Registro excluído.", (r) => (r ? () => restoreRecord("waterEntries", r) : undefined));
    setBusy(false);
    if (removed !== undefined) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? "Editar registro de água" : "Adicionar água"}
      footer={
        <div className="flex gap-2">
          {entry && (
            <Button variant="secondary" icon="trash" onClick={() => void remove()} disabled={busy} className="text-danger">
              Excluir
            </Button>
          )}
          <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
            {entry ? "Salvar alterações" : "Adicionar"}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div>
          <NumberField integer label="Quantidade" suffix="ml" value={amount} onChange={setAmount} error={errors.amount} />
          <div className="mt-2">
            <ChoiceChips
              label="Quantidades rápidas"
              hideLabel
              value={amount}
              onChange={setAmount}
              options={["150", "200", "250", "300", "500", "750"].map((v) => ({ value: v, label: `${v} ml` }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField type="time" label="Horário" value={time} onChange={setTime} error={errors.time} />
          <TextField type="date" label="Data" max={today} value={day} onChange={setDay} error={errors.date} />
        </div>
      </form>
    </Sheet>
  );
}

export function WaterGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const water = useWaterGoal();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const run = useRunner();
  const formId = useId();

  useEffect(() => {
    if (open) {
      setValue(String(water.goalMl));
      setError(undefined);
    }
  }, [open, water.goalMl]);

  const save = async (useEstimate = false) => {
    let override: number | undefined;
    if (!useEstimate) {
      const r = validateManualTargets("", value);
      if (!r.ok) {
        setError(r.errors.water);
        return;
      }
      override = r.value.waterGoalOverride;
    }
    setBusy(true);
    const ok = await run(() => updateProfile({ waterGoalOverride: override }), useEstimate ? "A meta voltou para a estimativa." : "Meta de água atualizada.");
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajustar meta de água"
      description={`Estimativa para você: ${formatLiters(water.estimatedMl)} por dia.`}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
            Salvar meta
          </Button>
          {water.source === "manual" && (
            <Button variant="secondary" disabled={busy} onClick={() => void save(true)}>
              Usar a estimativa
            </Button>
          )}
        </div>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <NumberField integer label="Meta diária" suffix="ml" value={value} onChange={setValue} error={error} hint="Entre 500 e 6.000 ml." />
        <EstimateNote>
          {profile.weightKg
            ? `A estimativa usa ${WATER_ML_PER_KG} ml por kg de peso, dentro de limites seguros.`
            : "Sem o peso, usamos a referência de bebidas para adultos."}{" "}
          Calor, exercícios, gestação, amamentação e condições de saúde mudam a necessidade — nesses casos, siga a orientação de um profissional.
        </EstimateNote>
      </form>
    </Sheet>
  );
}

export function WaterPage() {
  const { date, setDate, today, openRequested, clearOpenRequest } = usePageDate();
  const entries = useAppState((s) => s.data.waterEntries);
  const profile = useProfile();
  const water = useWaterGoal();
  const run = useRunner();
  const [sheet, setSheet] = useState<{ open: boolean; entry: WaterEntry | null }>({ open: false, entry: null });
  const [goalOpen, setGoalOpen] = useState(false);

  useEffect(() => {
    if (openRequested) {
      setSheet({ open: true, entry: null });
      clearOpenRequest();
    }
  }, [openRequested, clearOpenRequest]);

  const dayEntries = useMemo(() => entriesOn(entries, date), [entries, date]);
  const total = waterTotalOn(entries, date);
  const remaining = Math.max(0, water.goalMl - total);
  const week = lastNDays(today, 7).map((d) => {
    const v = waterTotalOn(entries, d);
    return { key: d, label: formatWeekdayShort(d), fullLabel: `${formatWeekdayShort(d)}, ${formatDateShort(d)}`, value: v > 0 ? v : null };
  });

  const quickAdd = (amountMl: number) =>
    run(
      () => addWater({ amountMl, date, time: date === today ? nowTime() : "12:00" }),
      `${formatMl(amountMl)} de água adicionados.`,
      (e) => () => deleteWater(e.id),
    );

  const goalBasis =
    water.source === "manual"
      ? `Definida por você. A estimativa seria ${formatLiters(water.estimatedMl)}.`
      : water.source === "weight"
        ? `Estimativa: ${WATER_ML_PER_KG} ml × ${formatNumber(profile.weightKg ?? 0, 1)} kg, arredondada.`
        : "Referência para adultos. Informe seu peso no perfil para personalizar.";

  return (
    <div>
      <PageHeader
        title="Água"
        description="Some cada copo ao longo do dia. A meta é uma estimativa que você pode ajustar."
        action={
          <Button size="lg" icon="plus" onClick={() => setSheet({ open: true, entry: null })}>
            Outra quantidade
          </Button>
        }
      >
        <DateNav date={date} today={today} onChange={setDate} />
      </PageHeader>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
        <div className="space-y-4">
          <Card>
            <h2 className="sr-only">Total do dia</h2>
            <p className="text-5xl font-extrabold tracking-[-0.02em]">
              {formatLiters(total)}
              <span className="ml-2 text-xl font-bold text-ink-2">de {formatLiters(water.goalMl)}</span>
            </p>
            <div className="mt-4">
              <Meter value={total / water.goalMl} domain="water" label="Água do dia em relação à meta" />
            </div>
            <p className="mt-2 text-ink-2">{remaining > 0 ? `Faltam ${formatMl(remaining)} para a meta.` : "Meta do dia alcançada."}</p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {QUICK_WATER_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => void quickAdd(amount)}
                  className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white px-1 py-3 font-bold transition-colors hover:border-water hover:bg-water-soft active:bg-water-soft"
                >
                  <Icon name="water" size={amount >= 500 ? 28 : amount >= 300 ? 24 : 21} className="text-water" />
                  <span className="text-base sm:text-lg">+{amount} ml</span>
                  <span className="text-xs font-normal text-muted">{amount === 200 ? "copo" : amount === 500 ? "garrafa" : "copo grande"}</span>
                </button>
              ))}
            </div>
            {date !== today && <p className="mt-2 text-sm text-muted">Os botões adicionam ao dia selecionado, às 12:00.</p>}
          </Card>

          <Card>
            <CardHeader title="Registros do dia" description={dayEntries.length ? `${dayEntries.length} registros` : undefined} />
            {dayEntries.length === 0 ? (
              <EmptyState icon="water" title="Nenhum registro de água neste dia">
                Use os botões acima para somar um copo.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {dayEntries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-9 place-items-center rounded-full bg-water-soft text-water-ink">
                      <Icon name="water" size={17} />
                    </span>
                    <span className="tabular w-14 text-ink-2">{e.time}</span>
                    <span className="flex-1 font-bold">{formatMl(e.amountMl)}</span>
                    <IconButton icon="edit" label={`Editar ${formatMl(e.amountMl)} às ${e.time}`} onClick={() => setSheet({ open: true, entry: e })} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Sua meta diária"
              action={
                <Button size="sm" variant="secondary" icon="edit" onClick={() => setGoalOpen(true)}>
                  Ajustar
                </Button>
              }
            />
            <p className="text-3xl font-extrabold">{formatLiters(water.goalMl)}</p>
            <p className="mt-1 text-sm text-ink-2">{goalBasis}</p>
            <div className="mt-3">
              <EstimateNote>
                Não existe uma quantidade única para todo mundo.{" "}
                <a className="font-bold underline underline-offset-4" href={href(ROUTES.about)} onClick={linkHandler(ROUTES.about)}>
                  Como calculamos
                </a>
              </EstimateNote>
            </div>
          </Card>
          <Card>
            <CardHeader title="Últimos 7 dias" />
            <BarChart
              title="Água por dia nos últimos 7 dias"
              domain="water"
              data={week}
              format={(v) => formatLiters(v)}
              formatAxis={(v) => formatNumber(v / 1000, 1)}
              target={water.goalMl}
              targetLabel="meta"
            />
          </Card>
        </div>
      </div>

      <WaterEntrySheet open={sheet.open} entry={sheet.entry} date={date} today={today} onClose={() => setSheet({ open: false, entry: null })} />
      <WaterGoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} />
    </div>
  );
}
