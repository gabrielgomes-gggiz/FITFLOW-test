import { useEffect, useId, useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { ChoiceChips, RadioCards } from "@/components/ui/Choice";
import { DateNav } from "@/components/ui/DateNav";
import { EmptyState, Meter, Notice } from "@/components/ui/Feedback";
import { NumberField, TextField } from "@/components/ui/Field";
import { ACTIVITY_ICONS, Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { ACTIVITY_MODALITIES, FEATURED_MODALITY_IDS, getModality, getVariant } from "@/data/activities";
import { useProfile, useRunner } from "@/hooks/useAppData";
import { usePageDate } from "@/hooks/usePageDate";
import { href, linkHandler, ROUTES } from "@/hooks/useRouter";
import { PageHeader } from "@/layouts/AppLayout";
import {
  activityDay,
  activityWeek,
  estimateActivityKcal,
  INTENSITY_LABELS,
  intensityOf,
  restingKcalDuring,
  WHO_WEEKLY_MIN,
  WHO_WEEKLY_UPPER,
} from "@/services/activity";
import { entriesOn } from "@/services/nutrition";
import { parseDecimal, validateActivity, type FieldErrors } from "@/services/validation";
import { addActivity, deleteActivity, restoreRecord, updateActivity } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import type { ActivityEntry, DateKey } from "@/types";
import { addDays, formatDateShort, formatWeekdayShort, lastNDays, nowTime } from "@/utils/date";
import { formatKcal, formatMinutes, formatNumber } from "@/utils/format";

const intensityTone = { light: "neutral", moderate: "move", vigorous: "food" } as const;

function ActivitySheet({
  open,
  entry,
  date,
  today,
  onClose,
}: {
  open: boolean;
  entry: ActivityEntry | null;
  date: DateKey;
  today: DateKey;
  onClose: () => void;
}) {
  const profile = useProfile();
  const run = useRunner();
  const [modalityId, setModalityId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState("");
  const [duration, setDuration] = useState("30");
  const [time, setTime] = useState("07:00");
  const [day, setDay] = useState(date);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    setModalityId(entry?.modalityId ?? null);
    setVariantId(entry?.variantId ?? "");
    setDuration(entry ? String(entry.durationMin) : "30");
    setTime(entry?.time ?? (date === today ? nowTime() : "07:00"));
    setDay(entry?.date ?? date);
    setErrors({});
  }, [open, entry, date, today]);

  const modality = modalityId ? getModality(modalityId) : undefined;
  const variant = modality ? getVariant(modality.id, variantId) : undefined;
  const minutes = parseDecimal(duration);
  const weight = profile.weightKg;
  const estimate = variant && minutes && minutes > 0 && weight ? estimateActivityKcal(variant.met, weight, minutes) : null;

  const choose = (id: string) => {
    const m = getModality(id);
    if (!m) return;
    setModalityId(m.id);
    setVariantId(m.defaultVariantId);
  };

  const save = async () => {
    const result = validateActivity({ modalityId: modalityId ?? "", variantId, duration, date: day, time }, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setBusy(true);
    const saved = entry
      ? await run(() => updateActivity(entry.id, result.value), "Atividade atualizada.")
      : await run(
          () => addActivity(result.value),
          (a) => `Atividade registrada: ${a.name}, ${formatMinutes(a.durationMin)}.`,
          (a) => () => deleteActivity(a.id),
        );
    setBusy(false);
    if (saved) onClose();
  };

  const remove = async () => {
    if (!entry) return;
    setBusy(true);
    const removed = await run(() => deleteActivity(entry.id), "Atividade excluída.", (r) => (r ? () => restoreRecord("activityEntries", r) : undefined));
    setBusy(false);
    if (removed !== undefined) onClose();
  };

  const featured = FEATURED_MODALITY_IDS.map((id) => getModality(id)!).filter(Boolean);
  const others = ACTIVITY_MODALITIES.filter((m) => !(FEATURED_MODALITY_IDS as readonly string[]).includes(m.id));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={modality ? modality.name : "Registrar atividade"}
      description={modality ? "Escolha o ritmo e informe a duração." : "Qual atividade você fez?"}
      footer={
        modality ? (
          <div className="flex gap-2">
            {entry ? (
              <Button variant="secondary" icon="trash" onClick={() => void remove()} disabled={busy} className="text-danger">
                Excluir
              </Button>
            ) : (
              <Button variant="secondary" icon="chevronLeft" onClick={() => setModalityId(null)}>
                Trocar
              </Button>
            )}
            <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
              {entry ? "Salvar alterações" : "Registrar"}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!modality ? (
        <div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {featured.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => choose(m.id)}
                  className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white p-3 text-center font-bold hover:border-move hover:bg-move-soft"
                >
                  <Icon name={ACTIVITY_ICONS[m.icon]} size={26} className="text-move-ink" />
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-bold text-ink-2">Outras atividades</h3>
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
            {others.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => choose(m.id)} className="flex min-h-12 w-full items-center gap-3 px-3.5 text-left hover:bg-mist">
                  <Icon name={ACTIVITY_ICONS[m.icon]} size={20} className="text-move-ink" />
                  <span className="flex-1 font-bold">{m.name}</span>
                  <Icon name="chevronRight" size={18} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form
          id={formId}
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {modality.variants.length > 1 && (
            <RadioCards
              label="Ritmo ou tipo"
              value={variantId}
              onChange={setVariantId}
              error={errors.variantId}
              columns={2}
              options={modality.variants.map((v) => ({
                value: v.id,
                label: v.label,
                description: (
                  <>
                    {v.hint && <span className="block">{v.hint}</span>}
                    <span className="block">
                      Intensidade {INTENSITY_LABELS[intensityOf(v.met)].toLowerCase()}, {formatNumber(v.met, 1)} MET
                    </span>
                  </>
                ),
              }))}
            />
          )}
          <div>
            <NumberField integer label="Duração" suffix="min" value={duration} onChange={setDuration} error={errors.duration} />
            <div className="mt-2">
              <ChoiceChips label="Durações rápidas" hideLabel value={duration} onChange={setDuration} options={["15", "30", "45", "60", "90"].map((v) => ({ value: v, label: `${v} min` }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField type="time" label="Início" value={time} onChange={setTime} error={errors.time} />
            <TextField type="date" label="Data" max={today} value={day} onChange={setDay} error={errors.date} />
          </div>
          <section className="rounded-2xl bg-move-soft p-4" aria-live="polite">
            {variant && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={intensityTone[intensityOf(variant.met)]}>Intensidade {INTENSITY_LABELS[intensityOf(variant.met)].toLowerCase()}</Badge>
                <span className="text-sm text-ink-2">{formatNumber(variant.met, 1)} MET</span>
              </div>
            )}
            {weight ? (
              <>
                <p className="mt-2 text-2xl font-extrabold">{estimate !== null ? `${formatNumber(estimate)} kcal` : "—"}</p>
                <p className="text-sm text-ink-2">
                  Gasto estimado
                  {estimate !== null && minutes ? `, incluindo cerca de ${formatNumber(restingKcalDuring(weight, minutes))} kcal que o corpo gastaria em repouso` : ""}.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-2">
                Informe seu peso no perfil para estimar o gasto. Os minutos já contam para suas metas.
              </p>
            )}
          </section>
        </form>
      )}
    </Sheet>
  );
}

export function ActivityPage() {
  const { date, setDate, today, openRequested, clearOpenRequest } = usePageDate();
  const entries = useAppState((s) => s.data.activityEntries);
  const [sheet, setSheet] = useState<{ open: boolean; entry: ActivityEntry | null }>({ open: false, entry: null });

  useEffect(() => {
    if (openRequested) {
      setSheet({ open: true, entry: null });
      clearOpenRequest();
    }
  }, [openRequested, clearOpenRequest]);

  const dayEntries = useMemo(() => entriesOn(entries, date), [entries, date]);
  const day = useMemo(() => activityDay(entries, date), [entries, date]);
  const week = useMemo(() => activityWeek(entries, date), [entries, date]);
  const weekEntries = entries.filter((e) => e.date >= addDays(date, -6) && e.date <= date);
  const byIntensity = { light: 0, moderate: 0, vigorous: 0 };
  for (const e of weekEntries) byIntensity[intensityOf(e.met)] += e.durationMin;

  const chart = lastNDays(today, 7).map((d) => {
    const minutes = entries.filter((e) => e.date === d).reduce((s, e) => s + e.durationMin, 0);
    return { key: d, label: formatWeekdayShort(d), fullLabel: `${formatWeekdayShort(d)}, ${formatDateShort(d)}`, value: minutes > 0 ? minutes : null };
  });

  return (
    <div>
      <PageHeader
        title="Atividades"
        description="Registre seus movimentos. O gasto de energia é estimado com os valores do Compêndio de Atividades Físicas."
        action={
          <Button size="lg" icon="plus" onClick={() => setSheet({ open: true, entry: null })}>
            Registrar atividade
          </Button>
        }
      >
        <DateNav date={date} today={today} onChange={setDate} />
      </PageHeader>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
        <div className="space-y-4">
          <Card>
            <h2 className="sr-only">Resumo do dia</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted">Tempo em movimento</dt>
                <dd className="text-3xl font-extrabold">{formatMinutes(day.minutes)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Gasto estimado</dt>
                <dd className="text-3xl font-extrabold">{day.count && day.kcal ? formatKcal(day.kcal) : "—"}</dd>
              </div>
            </dl>
            {day.kcalIncomplete && <p className="mt-2 text-sm text-muted">Algumas atividades não têm estimativa porque o peso não estava informado.</p>}
          </Card>

          <Card>
            <CardHeader title="Atividades do dia" />
            {dayEntries.length === 0 ? (
              <EmptyState
                icon="activity"
                title="Nenhuma atividade neste dia"
                action={
                  <Button icon="plus" onClick={() => setSheet({ open: true, entry: null })}>
                    Registrar atividade
                  </Button>
                }
              >
                Caminhar, dançar e até arrumar a casa contam.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {dayEntries.map((e) => {
                  const m = getModality(e.modalityId);
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => setSheet({ open: true, entry: e })} className="flex w-full items-center gap-3 py-3 text-left hover:bg-mist/60">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-move-soft text-move-ink">
                          <Icon name={m ? ACTIVITY_ICONS[m.icon] : "activity"} size={21} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{e.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {e.variantLabel}, {e.time}, {formatMinutes(e.durationMin)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="tabular block font-bold">{e.kcalEstimated !== null ? `${formatNumber(e.kcalEstimated)} kcal` : "—"}</span>
                          <span className="block text-xs text-muted">estimado</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Semana" description="Últimos 7 dias, até o dia exibido" />
            <p className="text-3xl font-extrabold">
              {formatNumber(week.moderateEquivalentMin)} <span className="text-lg font-bold text-ink-2">de {WHO_WEEKLY_MIN} min</span>
            </p>
            <div className="mt-3">
              <Meter value={week.moderateEquivalentMin / WHO_WEEKLY_MIN} domain="move" label="Minutos de atividade na semana em relação a 150" />
            </div>
            <p className="mt-3 text-sm text-ink-2">
              A OMS recomenda de {WHO_WEEKLY_MIN} a {WHO_WEEKLY_UPPER} minutos por semana de atividade moderada para adultos. Cada minuto vigoroso conta como dois.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
              <div>
                <dt className="text-muted">Leve</dt>
                <dd className="font-bold">{formatMinutes(byIntensity.light)}</dd>
              </div>
              <div>
                <dt className="text-muted">Moderada</dt>
                <dd className="font-bold">{formatMinutes(byIntensity.moderate)}</dd>
              </div>
              <div>
                <dt className="text-muted">Vigorosa</dt>
                <dd className="font-bold">{formatMinutes(byIntensity.vigorous)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted">Atividades leves fazem bem, mas não entram na conta da OMS.</p>
          </Card>
          <Card>
            <CardHeader title="Minutos por dia" />
            <BarChart title="Minutos de atividade por dia, últimos 7 dias" domain="move" data={chart} format={(v) => formatMinutes(v)} formatAxis={(v) => formatNumber(v)} />
          </Card>
          <Notice>
            O gasto é uma estimativa média (MET × peso × tempo) e não uma medição.{" "}
            <a className="font-bold underline underline-offset-4" href={href(ROUTES.about)} onClick={linkHandler(ROUTES.about)}>
              Como calculamos
            </a>
          </Notice>
        </div>
      </div>

      <ActivitySheet open={sheet.open} entry={sheet.entry} date={date} today={today} onClose={() => setSheet({ open: false, entry: null })} />
    </div>
  );
}

