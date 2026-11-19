import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Choice";
import { EmptyState } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useEnergy, useGoalContext, useWaterGoal } from "@/hooks/useAppData";
import { navigate, ROUTES } from "@/hooks/useRouter";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/layouts/AppLayout";
import { goalHistory, isGoalActiveOn, summarizeHistory } from "@/services/goals";
import { dayNutrition, entriesOn, entryKcal } from "@/services/nutrition";
import { dailySeries, summarizeSeries, type DailyPoint } from "@/services/reports";
import { useAppState } from "@/store/appStore";
import type { DateKey } from "@/types";
import { capitalize, formatDateLong, formatDateShort, formatRelativeDay, formatWeekdayShort } from "@/utils/date";
import { formatKcal, formatLiters, formatMinutes, formatMl, formatNumber, plural } from "@/utils/format";

function DayDetailSheet({ date, onClose }: { date: DateKey | null; onClose: () => void }) {
  const data = useAppState((s) => s.data);
  const today = useToday();
  if (!date) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const day = dayNutrition(data.foodEntries, date);
  const water = entriesOn(data.waterEntries, date);
  const activities = entriesOn(data.activityEntries, date);
  const go = (route: string) => {
    onClose();
    navigate(`${route}?data=${date}`);
  };
  return (
    <Sheet open onClose={onClose} title={capitalize(formatDateLong(date))} description={formatRelativeDay(date, today)}>
      <div className="space-y-6">
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">Refeições</h3>
            <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => go(ROUTES.food)}>
              Abrir
            </Button>
          </div>
          {day.entries.length === 0 ? (
            <p className="text-sm text-muted">Sem registros.</p>
          ) : (
            <ul className="mt-1 space-y-2 text-sm">
              {day.meals
                .filter((m) => m.entries.length)
                .map((m) => (
                  <li key={m.type}>
                    <p className="font-bold">
                      {m.label} <span className="font-normal text-muted">{formatKcal(m.kcal)}</span>
                    </p>
                    <ul className="text-ink-2">
                      {m.entries.map((e) => (
                        <li key={e.id} className="flex justify-between gap-3">
                          <span className="truncate">
                            {e.foodName} ({formatNumber(e.quantityG, 1)} g)
                          </span>
                          <span className="tabular shrink-0">{formatNumber(Math.round(entryKcal(e)))} kcal</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">Água {water.length > 0 && <span className="font-normal text-muted">{formatLiters(water.reduce((s, w) => s + w.amountMl, 0))}</span>}</h3>
            <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => go(ROUTES.water)}>
              Abrir
            </Button>
          </div>
          {water.length === 0 ? (
            <p className="text-sm text-muted">Sem registros.</p>
          ) : (
            <p className="text-sm text-ink-2">{water.map((w) => `${w.time} ${formatMl(w.amountMl)}`).join("; ")}</p>
          )}
        </section>
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold">Atividades</h3>
            <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => go(ROUTES.activity)}>
              Abrir
            </Button>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-muted">Sem registros.</p>
          ) : (
            <ul className="text-sm text-ink-2">
              {activities.map((a) => (
                <li key={a.id}>
                  {a.time} {a.name}, {formatMinutes(a.durationMin)}
                  {a.kcalEstimated !== null ? `, cerca de ${formatKcal(a.kcalEstimated)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}

const chartData = (points: DailyPoint[], pick: (p: DailyPoint) => number | null) =>
  points.map((p) => ({
    key: p.date,
    label: points.length > 7 ? formatDateShort(p.date).split(" ")[0] : formatWeekdayShort(p.date),
    fullLabel: `${formatWeekdayShort(p.date)}, ${formatDateShort(p.date)}`,
    value: pick(p),
  }));

export function HistoryPage() {
  const today = useToday();
  const data = useAppState((s) => s.data);
  const energy = useEnergy(today);
  const water = useWaterGoal();
  const ctx = useGoalContext();
  const [days, setDays] = useState<"7" | "30">("7");
  const [detail, setDetail] = useState<DateKey | null>(null);
  const n = Number(days);

  const points = useMemo(() => dailySeries(data, today, n), [data, today, n]);
  const summary = summarizeSeries(points, water.goalMl);
  const goals = data.goals.filter((g) => isGoalActiveOn(g, today));
  const hasAny = points.some((p) => p.hasFood || p.hasWater || p.hasActivity);

  return (
    <div>
      <PageHeader title="Histórico" description="Seus registros ao longo do tempo. As médias consideram só os dias em que houve registro.">
        <div className="max-w-xs">
          <Segmented
            label="Período"
            hideLabel
            value={days}
            onChange={setDays}
            options={[
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
            ]}
          />
        </div>
      </PageHeader>

      {!hasAny ? (
        <Card>
          <EmptyState icon="chart" title="Ainda não há registros neste período">
            Quando você registrar refeições, água e atividades, a evolução aparece aqui.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4 lg:space-y-5">
          <Card>
            <h2 className="sr-only">Resumo do período</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted">Energia média</dt>
                <dd className="text-2xl font-extrabold">{summary.avgKcal !== null ? formatKcal(summary.avgKcal) : "—"}</dd>
                <dd className="text-sm text-ink-2">em {plural(summary.daysWithFood, "dia registrado", "dias registrados")}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Meta de água atingida</dt>
                <dd className="text-2xl font-extrabold">
                  {summary.daysWaterGoalMet} <span className="text-base font-bold text-ink-2">de {n} dias</span>
                </dd>
                <dd className="text-sm text-ink-2">média de {summary.avgWaterMl !== null ? formatLiters(summary.avgWaterMl, 1) : "—"} nos dias registrados</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Atividade</dt>
                <dd className="text-2xl font-extrabold">{formatMinutes(summary.totalActivityMin)}</dd>
                <dd className="text-sm text-ink-2">
                  em {plural(summary.activeDays, "dia", "dias")}
                  {summary.totalActivityKcal > 0 ? `, cerca de ${formatKcal(summary.totalActivityKcal)}` : ""}
                </dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2 lg:gap-5">
            <Card className="lg:col-span-2">
              <CardHeader title="Energia consumida por dia" description={energy.target ? `Linha: meta estimada de ${formatKcal(energy.target)}` : undefined} />
              <BarChart
                title={`Energia consumida por dia, últimos ${n} dias`}
                domain="food"
                data={chartData(points, (p) => (p.hasFood ? Math.round(p.kcal) : null))}
                format={(v) => formatKcal(v)}
                formatAxis={(v) => formatNumber(v)}
                target={energy.target}
                targetLabel="meta estimada"
                height={190}
              />
            </Card>
            <Card>
              <CardHeader title="Água por dia" description={`Linha: meta de ${formatLiters(water.goalMl)}`} />
              <BarChart
                title={`Água por dia, últimos ${n} dias`}
                domain="water"
                data={chartData(points, (p) => (p.hasWater ? p.waterMl : null))}
                format={(v) => formatLiters(v)}
                formatAxis={(v) => formatNumber(v / 1000, 1)}
                target={water.goalMl}
              />
            </Card>
            <Card>
              <CardHeader title="Minutos de atividade por dia" />
              <BarChart
                title={`Minutos de atividade por dia, últimos ${n} dias`}
                domain="move"
                data={chartData(points, (p) => (p.hasActivity ? p.activityMin : null))}
                format={(v) => formatMinutes(v)}
                formatAxis={(v) => formatNumber(v)}
              />
            </Card>
          </div>

          <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
            <Card>
              <CardHeader title="Dia a dia" description="Toque em um dia para ver os registros. Dias sem nenhum registro ficam de fora." />
              <div className="flex items-center gap-3 border-b border-line pb-2 text-xs font-bold text-muted" aria-hidden="true">
                <span className="w-24 shrink-0 sm:w-32">Dia</span>
                <span className="grid flex-1 grid-cols-3 gap-2">
                  <span>Energia (kcal)</span>
                  <span>Água</span>
                  <span>Atividade</span>
                </span>
                <span className="w-[18px]" />
              </div>
              <ul className="divide-y divide-line">
                {[...points]
                  .reverse()
                  .filter((p) => p.hasFood || p.hasWater || p.hasActivity)
                  .map((p) => (
                  <li key={p.date}>
                    <button
                      type="button"
                      onClick={() => setDetail(p.date)}
                      aria-label={`${formatRelativeDay(p.date, today)}: ${p.hasFood ? `${formatNumber(Math.round(p.kcal))} kcal` : "sem refeições"}, ${p.hasWater ? formatLiters(p.waterMl, 1) : "sem água"}, ${p.hasActivity ? formatMinutes(p.activityMin) : "sem atividade"}. Ver detalhes`}
                      className="flex w-full items-center gap-3 py-3 text-left hover:bg-mist/60"
                    >
                      <span className="w-24 shrink-0 font-bold sm:w-32">{formatRelativeDay(p.date, today)}</span>
                      <span className="tabular grid flex-1 grid-cols-3 gap-2 text-sm text-ink-2">
                        <span>{p.hasFood ? formatNumber(Math.round(p.kcal)) : "—"}</span>
                        <span>{p.hasWater ? formatLiters(p.waterMl, 1) : "—"}</span>
                        <span>{p.hasActivity ? formatMinutes(p.activityMin) : "—"}</span>
                      </span>
                      <Icon name="chevronRight" size={18} className="text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Metas no período" />
              {goals.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma meta ativa.</p>
              ) : (
                <ul className="space-y-3">
                  {goals.map((g) => {
                    const points = g.period === "daily" ? n : Math.max(1, Math.floor(n / 7));
                    const s = summarizeHistory(goalHistory(g, ctx, today, points));
                    return (
                      <li key={g.id}>
                        <p className="font-bold">{g.title}</p>
                        <p className="text-sm text-ink-2">
                          {s.counted === 0
                            ? "Criada hoje."
                            : `Atingida em ${s.met} de ${s.counted} ${g.period === "daily" ? (s.counted === 1 ? "dia" : "dias") : s.counted === 1 ? "semana" : "semanas"}.`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
      <DayDetailSheet date={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
