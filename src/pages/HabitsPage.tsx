import { useEffect, useId, useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChoiceChips, Segmented } from "@/components/ui/Choice";
import { Notice } from "@/components/ui/Feedback";
import { NumberField, TextAreaField, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Sheet } from "@/components/ui/Sheet";
import { HABIT_ALTERNATIVES, HABIT_LABELS, SUPPORT_INFO, TRIGGER_LABELS } from "@/data/guidance";
import { useRunner } from "@/hooks/useAppData";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/layouts/AppLayout";
import { baselinePerDay, habitSeries, habitStats, logFor, topTriggers } from "@/services/habits";
import { validateCraving, validateHabitAmount, validateTracker, type FieldErrors, type TrackerForm } from "@/services/validation";
import { addCraving, deleteCraving, deleteTracker, restoreRecord, saveTracker, setHabitLog } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import type { CravingTrigger, DateKey, HabitKind, HabitTracker } from "@/types";
import { formatDateShort, formatRelativeDay, formatWeekdayShort, nowTime } from "@/utils/date";
import { formatCurrency, formatNumber, plural } from "@/utils/format";

function TrackerSheet({ open, kind, tracker, onClose }: { open: boolean; kind: HabitKind; tracker: HabitTracker | null; onClose: () => void }) {
  const today = useToday();
  const run = useRunner();
  const [form, setForm] = useState<TrackerForm>({ kind, mode: "quit", baseline: "", limit: "", price: "", packSize: "20", startDate: today, motivation: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (tracker) {
      const isTobacco = tracker.kind === "tobacco";
      setForm({
        kind: tracker.kind,
        mode: tracker.mode,
        baseline: formatNumber(tracker.baselineAmount, 1),
        limit: tracker.limitAmount !== undefined ? formatNumber(tracker.limitAmount, 1) : "",
        price: formatNumber(isTobacco ? tracker.unitCost * 20 : tracker.unitCost, 2),
        packSize: "20",
        startDate: tracker.startDate,
        motivation: tracker.motivation ?? "",
      });
    } else {
      setForm({ kind, mode: "quit", baseline: "", limit: "", price: "", packSize: "20", startDate: today, motivation: "" });
    }
  }, [open, tracker, kind, today]);

  const set = <K extends keyof TrackerForm>(k: K, v: TrackerForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const labels = HABIT_LABELS[form.kind];
  const isTobacco = form.kind === "tobacco";

  const save = async () => {
    const r = validateTracker(form, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    const ok = await run(() => saveTracker(r.value, tracker?.id), tracker ? "Acompanhamento atualizado." : "Acompanhamento iniciado. Um dia de cada vez.");
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <>
      <Sheet
        open={open && !confirmEnd}
        onClose={onClose}
        title={tracker ? `Editar acompanhamento: ${labels.name.toLowerCase()}` : `Acompanhar ${labels.name.toLowerCase()}`}
        description="Os números servem para você ver sua evolução. Ajuste quando quiser."
        footer={
          <div className="flex flex-col gap-2">
            <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
              {tracker ? "Salvar alterações" : "Começar acompanhamento"}
            </Button>
            {tracker && (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmEnd(true)}>
                Encerrar acompanhamento
              </Button>
            )}
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
          <Segmented
            label="Objetivo"
            value={form.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "quit", label: `Parar de ${labels.verb}` },
              { value: "reduce", label: "Reduzir" },
            ]}
          />
          <NumberField
            label={isTobacco ? "Quantos cigarros você fumava por dia, em média?" : "Quantas doses você tomava por semana, em média?"}
            suffix={isTobacco ? "por dia" : "por semana"}
            value={form.baseline}
            onChange={(v) => set("baseline", v)}
            error={errors.baseline}
            hint={isTobacco ? undefined : "Conte como uma dose cada lata de cerveja, taça de vinho ou dose de destilado."}
          />
          {form.mode === "reduce" && (
            <NumberField
              label={isTobacco ? "Limite desejado por dia" : "Limite desejado por semana"}
              suffix={labels.unitPlural}
              value={form.limit}
              onChange={(v) => set("limit", v)}
              error={errors.limit}
            />
          )}
          {isTobacco ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Preço do maço" optional suffix="R$" value={form.price} onChange={(v) => set("price", v)} error={errors.price} />
              <NumberField integer label="Cigarros por maço" value={form.packSize} onChange={(v) => set("packSize", v)} error={errors.packSize} />
            </div>
          ) : (
            <NumberField label="Preço médio de uma dose" optional suffix="R$" value={form.price} onChange={(v) => set("price", v)} error={errors.price} />
          )}
          <TextField type="date" label="Começou em" max={today} value={form.startDate} onChange={(v) => set("startDate", v)} error={errors.startDate} />
          <TextField
            label="Sua motivação"
            optional
            value={form.motivation}
            onChange={(v) => set("motivation", v)}
            error={errors.motivation}
            maxLength={140}
            placeholder="Ex.: ter mais fôlego, economizar para uma viagem"
          />
        </form>
      </Sheet>
      <ConfirmDialog
        open={confirmEnd}
        title="Encerrar acompanhamento?"
        description="Os registros diários e as vontades anotadas deste acompanhamento serão apagados."
        confirmLabel="Encerrar e apagar registros"
        busy={busy}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          if (!tracker) return;
          setBusy(true);
          void run(() => deleteTracker(tracker.id), "Acompanhamento encerrado.").then(() => {
            setBusy(false);
            setConfirmEnd(false);
            onClose();
          });
        }}
      />
    </>
  );
}

function DayLogSheet({ tracker, date, onClose }: { tracker: HabitTracker; date: DateKey | null; onClose: () => void }) {
  const today = useToday();
  const logs = useAppState((s) => s.data.habitLogs);
  const run = useRunner();
  const labels = HABIT_LABELS[tracker.kind];
  const existing = date ? logFor(logs, tracker.id, date) : undefined;
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (date) {
      setAmount(existing && existing.amount > 0 ? formatNumber(existing.amount, 1) : "");
      setError(undefined);
    }
  }, [date, existing]);

  const saveAmount = async (value: number) => {
    if (!date) return;
    const ok = await run(
      () => setHabitLog(tracker.id, date, value),
      value === 0 ? `Registrado: ${formatRelativeDay(date, today).toLowerCase()} sem ${labels.unitPlural}.` : "Registro salvo.",
    );
    if (ok !== undefined) onClose();
  };

  return (
    <Sheet
      open={date !== null}
      onClose={onClose}
      title={date ? formatRelativeDay(date, today) : ""}
      description={`Registre o consumo de ${labels.unitPlural} deste dia.`}
    >
      <div className="space-y-5">
        <Button full size="lg" variant={existing?.amount === 0 ? "primary" : "secondary"} icon="check" onClick={() => void saveAmount(0)}>
          Sem {labels.unitPlural} neste dia
        </Button>
        <form
          noValidate
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = validateHabitAmount(amount);
            if (!r.ok) {
              setError(r.errors.amount);
              return;
            }
            void saveAmount(r.value);
          }}
        >
          <div className="flex-1">
            <NumberField label={`Quantos ${labels.unitPlural}?`} value={amount} onChange={setAmount} error={error} suffix={labels.unitPlural} />
          </div>
          <Button type="submit" variant="secondary">
            Salvar
          </Button>
        </form>
        {existing && (
          <Button
            variant="ghost"
            onClick={() => {
              if (!date) return;
              void run(() => setHabitLog(tracker.id, date, null), "Registro do dia removido.").then(onClose);
            }}
          >
            Remover o registro deste dia
          </Button>
        )}
        <p className="text-sm text-muted">Dias com consumo fazem parte do processo. O registro ajuda a entender o que acontece.</p>
      </div>
    </Sheet>
  );
}

function CravingSheet({ tracker, open, onClose }: { tracker: HabitTracker; open: boolean; onClose: () => void }) {
  const today = useToday();
  const run = useRunner();
  const [intensity, setIntensity] = useState(3);
  const [trigger, setTrigger] = useState<CravingTrigger>("stress");
  const [strategy, setStrategy] = useState("");
  const [note, setNote] = useState("");
  const [time, setTime] = useState(nowTime());
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setIntensity(3);
    setTrigger("stress");
    setStrategy("");
    setNote("");
    setTime(nowTime());
    setDate(today);
    setErrors({});
  }, [open, today]);

  const save = async () => {
    const r = validateCraving({ intensity, trigger, strategy, note, date, time }, today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    const ok = await run(() => addCraving(tracker.id, r.value), "Vontade registrada. Reconhecer o momento já é um passo.");
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar vontade"
      description="Anotar quando a vontade aparece ajuda a reconhecer seus gatilhos."
      footer={
        <Button full size="lg" icon="check" onClick={() => void save()}>
          Registrar vontade
        </Button>
      }
    >
      <div className="space-y-5">
        <ChoiceChips<number>
          label="Intensidade"
          value={intensity}
          onChange={setIntensity}
          options={[
            { value: 1, label: "1 leve" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
            { value: 4, label: "4" },
            { value: 5, label: "5 muito forte" },
          ]}
        />
        <ChoiceChips<CravingTrigger>
          label="O que estava acontecendo?"
          value={trigger}
          onChange={setTrigger}
          options={(Object.keys(TRIGGER_LABELS) as CravingTrigger[]).map((t) => ({ value: t, label: TRIGGER_LABELS[t] }))}
        />
        <ChoiceChips<string>
          label="O que você tentou fazer?"
          value={strategy}
          onChange={setStrategy}
          options={[{ value: "", label: "Nada ainda" }, ...HABIT_ALTERNATIVES[tracker.kind].map((a) => ({ value: a, label: a }))]}
        />
        <TextAreaField label="Anotação" optional value={note} onChange={setNote} error={errors.note} maxLength={280} />
        <div className="grid grid-cols-2 gap-3">
          <TextField type="time" label="Horário" value={time} onChange={setTime} error={errors.time} />
          <TextField type="date" label="Data" max={today} value={date} onChange={setDate} error={errors.date} />
        </div>
      </div>
    </Sheet>
  );
}

function TrackerPanel({ tracker, onEdit }: { tracker: HabitTracker; onEdit: () => void }) {
  const today = useToday();
  const logs = useAppState((s) => s.data.habitLogs);
  const cravings = useAppState((s) => s.data.cravings);
  const run = useRunner();
  const [logDate, setLogDate] = useState<DateKey | null>(null);
  const [cravingOpen, setCravingOpen] = useState(false);
  const labels = HABIT_LABELS[tracker.kind];

  const stats = useMemo(() => habitStats(tracker, logs, cravings, today), [tracker, logs, cravings, today]);
  const series = useMemo(() => habitSeries(tracker, logs, today, 14), [tracker, logs, today]);
  const todayLog = logFor(logs, tracker.id, today);
  const triggers = topTriggers(cravings, tracker.id);
  const recentCravings = cravings
    .filter((c) => c.trackerId === tracker.id)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
    .slice(0, 5);

  return (
    <section aria-labelledby={`tracker-${tracker.id}`} className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-habit-soft text-habit-ink">
            <Icon name="sprout" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`tracker-${tracker.id}`} className="text-xl font-extrabold">
              {labels.name}
            </h2>
            <p className="text-ink-2">
              {tracker.mode === "quit" ? `Objetivo: parar de ${labels.verb}` : `Objetivo: reduzir para ${plural(tracker.limitAmount ?? 0, labels.unit, labels.unitPlural)} por ${tracker.baselinePeriod === "day" ? "dia" : "semana"}`}
              , desde {formatDateShort(tracker.startDate)}
            </p>
          </div>
          <Button size="sm" variant="ghost" icon="edit" onClick={onEdit}>
            Editar
          </Button>
        </div>
        {tracker.motivation && <p className="mt-4 rounded-2xl bg-habit-soft p-3 font-bold text-ink">“{tracker.motivation}”</p>}

        <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-muted">Dias sem {labels.verb}</dt>
            <dd className="text-3xl font-extrabold">{formatNumber(stats.daysWithout)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Economia estimada</dt>
            <dd className="text-3xl font-extrabold">{formatCurrency(stats.moneySaved)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{labels.unitPlural.charAt(0).toUpperCase() + labels.unitPlural.slice(1)} evitados</dt>
            <dd className="text-3xl font-extrabold">{formatNumber(Math.round(stats.unitsAvoided))}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Dias registrados</dt>
            <dd className="text-3xl font-extrabold">
              {stats.daysLogged}
              <span className="text-base font-bold text-ink-2"> de {stats.daysSinceStart}</span>
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">Economia e unidades evitadas consideram só os dias registrados, comparados ao seu consumo habitual.</p>

        <div className="mt-5 rounded-2xl bg-mist p-4">
          <p className="font-bold">Como foi hoje?</p>
          {todayLog ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p>{todayLog.amount === 0 ? `Sem ${labels.unitPlural} hoje.` : `Hoje: ${plural(todayLog.amount, labels.unit, labels.unitPlural)}.`}</p>
              <Button size="sm" variant="secondary" onClick={() => setLogDate(today)}>
                Alterar
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button icon="check" onClick={() => void run(() => setHabitLog(tracker.id, today, 0), `Registrado: hoje sem ${labels.unitPlural}.`)}>
                Hoje sem {labels.unitPlural}
              </Button>
              <Button variant="secondary" onClick={() => setLogDate(today)}>
                Informar quantidade
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-bold text-ink-2">Últimos 14 dias</h3>
          <ol className="mt-2 grid grid-cols-7 gap-1.5">
            {series.map((p) => {
              const before = p.date < tracker.startDate;
              return (
                <li key={p.date}>
                  <button
                    type="button"
                    disabled={before}
                    onClick={() => setLogDate(p.date)}
                    className={`flex w-full flex-col items-center rounded-xl border py-1.5 text-xs disabled:opacity-40 ${p.amount === 0 ? "border-habit bg-habit-soft" : "border-line bg-white hover:border-field"}`}
                    aria-label={`${formatRelativeDay(p.date, today)}: ${before ? "antes do início" : p.amount === null ? "sem registro" : p.amount === 0 ? `sem ${labels.unitPlural}` : plural(p.amount, labels.unit, labels.unitPlural)}`}
                  >
                    <span className="text-muted">{formatWeekdayShort(p.date)}</span>
                    <span className="mt-0.5 grid h-5 place-items-center font-bold">
                      {p.amount === 0 ? <Icon name="check" size={15} className="text-habit-ink" strokeWidth={2.4} /> : p.amount === null ? "–" : formatNumber(p.amount, 1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-muted">Toque em um dia para registrar ou corrigir. ✓ = sem consumo.</p>
        </div>
      </Card>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <Card>
          <CardHeader title="Consumo por dia" description={`Linha: seu consumo habitual (${formatNumber(baselinePerDay(tracker), 1)} por dia)`} />
          <BarChart
            title={`Consumo de ${labels.unitPlural} por dia, últimos 14 dias`}
            domain="habit"
            data={series.map((p) => ({ key: p.date, label: formatWeekdayShort(p.date), fullLabel: `${formatWeekdayShort(p.date)}, ${formatDateShort(p.date)}`, value: p.amount }))}
            format={(v) => plural(v, labels.unit, labels.unitPlural)}
            formatAxis={(v) => formatNumber(v)}
            target={baselinePerDay(tracker)}
            targetLabel="habitual"
          />
        </Card>

        <Card>
          <CardHeader
            title="Vontades"
            description={stats.cravingsTotal ? `${plural(stats.cravingsTotal, "vontade registrada", "vontades registradas")} desde o início` : "Anote quando a vontade aparecer."}
            action={
              <Button size="sm" icon="plus" onClick={() => setCravingOpen(true)}>
                Registrar
              </Button>
            }
          />
          {triggers.length > 0 && (
            <p className="mb-3 text-sm text-ink-2">
              Mais comuns: {triggers.map((t) => `${TRIGGER_LABELS[t.trigger].toLowerCase()} (${t.count})`).join(", ")}.
            </p>
          )}
          {recentCravings.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma vontade registrada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentCravings.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-habit-soft text-sm font-extrabold text-habit-ink" title="Intensidade">
                    {c.intensity}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold">
                      {TRIGGER_LABELS[c.trigger]}, {formatRelativeDay(c.date, today).toLowerCase()} às {c.time}
                    </p>
                    {c.strategy && <p className="text-ink-2">Tentou: {c.strategy.toLowerCase()}</p>}
                    {c.note && <p className="text-muted">{c.note}</p>}
                  </div>
                  <IconButton
                    icon="trash"
                    label="Excluir vontade"
                    onClick={() => void run(() => deleteCraving(c.id), "Vontade excluída.", (r) => (r ? () => restoreRecord("cravings", r) : undefined))}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader title="Quando a vontade aparecer" description="Ela costuma diminuir depois de alguns minutos. Escolha algo para atravessar esse momento:" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {HABIT_ALTERNATIVES[tracker.kind].map((a) => (
              <li key={a} className="flex items-start gap-2 rounded-xl bg-mist p-3 text-sm">
                <Icon name="spark" size={16} className="mt-0.5 text-habit-ink" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
        <Notice tone="habit" icon="info">
          <p>{SUPPORT_INFO[tracker.kind]}</p>
          <p className="mt-2 text-ink-2">O FitFlow não oferece tratamento nem orientação médica.</p>
        </Notice>
      </div>

      <DayLogSheet tracker={tracker} date={logDate} onClose={() => setLogDate(null)} />
      <CravingSheet tracker={tracker} open={cravingOpen} onClose={() => setCravingOpen(false)} />
    </section>
  );
}

export function HabitsPage() {
  const trackers = useAppState((s) => s.data.habitTrackers);
  const [sheet, setSheet] = useState<{ open: boolean; kind: HabitKind; tracker: HabitTracker | null }>({ open: false, kind: "tobacco", tracker: null });
  const active = trackers.filter((t) => t.active);
  const missing = (["tobacco", "alcohol"] as HabitKind[]).filter((k) => !active.some((t) => t.kind === k));

  return (
    <div>
      <PageHeader title="Cigarro e álcool" description="Acompanhamento opcional para reduzir ou parar, no seu ritmo e sem julgamentos." />

      {active.length === 0 && (
        <Card className="mb-4">
          <h2 className="text-lg font-bold">Quer acompanhar algum desses hábitos?</h2>
          <p className="mt-1 max-w-2xl text-ink-2">
            Registre os dias sem consumo, veja quanto dinheiro deixou de gastar e anote as vontades para conhecer seus gatilhos. Você decide o objetivo: parar ou reduzir.
          </p>
        </Card>
      )}

      <div className="space-y-8">
        {active.map((t) => (
          <TrackerPanel key={t.id} tracker={t} onEdit={() => setSheet({ open: true, kind: t.kind, tracker: t })} />
        ))}
      </div>

      {missing.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${active.length ? "mt-8" : ""}`}>
          {missing.map((k) => (
            <Button key={k} variant={active.length ? "secondary" : "primary"} size="lg" icon="plus" onClick={() => setSheet({ open: true, kind: k, tracker: null })}>
              {active.length ? `Acompanhar também ${HABIT_LABELS[k].name.toLowerCase()}` : `Acompanhar ${HABIT_LABELS[k].name.toLowerCase()}`}
            </Button>
          ))}
        </div>
      )}

      <TrackerSheet open={sheet.open} kind={sheet.kind} tracker={sheet.tracker} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </div>
  );
}
