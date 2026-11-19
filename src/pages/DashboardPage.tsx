import { useMemo } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { DAY_STRIP_LANES, DayStrip } from "@/components/charts/DayStrip";
import { DOMAIN_ICON_TONE, goalIcon, METRIC_DOMAIN } from "@/components/goals/goalVisuals";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Meter, type Domain } from "@/components/ui/Feedback";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HABIT_LABELS } from "@/data/guidance";
import { useEnergy, useGoalContext, useProfile, useRunner, useWaterGoal } from "@/hooks/useAppData";
import { href, linkHandler, navigate, ROUTES } from "@/hooks/useRouter";
import { useNow, useToday } from "@/hooks/useToday";
import { activityDay, activityWeek, WHO_WEEKLY_MIN } from "@/services/activity";
import { formatGoalAmount, goalProgress, isGoalActiveOn } from "@/services/goals";
import { habitStats, logFor } from "@/services/habits";
import { waterTotalOn } from "@/services/hydration";
import { dayNutrition, entriesOn } from "@/services/nutrition";
import { dailySeries, summarizeSeries } from "@/services/reports";
import { buildSuggestions, type Suggestion } from "@/services/suggestions";
import { addWater, deleteWater } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import { capitalize, formatDateLong, formatDateShort, formatWeekdayShort, greetingFor, minutesOfDay, nowTime } from "@/utils/date";
import { formatCurrency, formatKcal, formatLiters, formatMinutes, formatNumber, plural } from "@/utils/format";

function HeroFigure({
  to,
  label,
  value,
  sub,
  ratio,
  domain,
}: {
  to: string;
  label: string;
  value: string;
  sub: string;
  ratio: number;
  domain: Domain;
}) {
  return (
    <a
      href={href(to)}
      onClick={linkHandler(to)}
      className="group flex min-w-0 flex-col rounded-2xl p-2 -m-2 transition-colors hover:bg-white/[0.06] focus-visible:outline-lime"
    >
      <span className="flex items-center gap-1 text-sm text-on-ink-muted">
        {label}
        <Icon name="chevronRight" size={14} className="opacity-60 transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="mt-0.5 text-[1.6rem] font-extrabold leading-tight text-white sm:text-3xl">{value}</span>
      <span className="mb-2 text-xs text-on-ink-muted sm:text-sm">{sub}</span>
      <span className="mt-auto">
        <span className="block h-1.5 overflow-hidden rounded-full bg-white/15">
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.min(1, Math.max(0, ratio)) * 100}%`,
              background: domain === "food" ? "#d95926" : domain === "water" ? "#3987e5" : "#199e70",
            }}
          />
        </span>
      </span>
    </a>
  );
}

function SuggestionItem({ suggestion, onAddWater }: { suggestion: Suggestion; onAddWater: (ml: number) => void }) {
  const icon: IconName = { water: "water", food: "food", activity: "activity", habit: "sprout", general: "spark" }[suggestion.domain] as IconName;
  const tone = { water: "water", food: "food", activity: "move", habit: "habit", general: "ink" }[suggestion.domain] as Domain;
  const action = suggestion.action;
  return (
    <li className="flex gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${DOMAIN_ICON_TONE[tone]}`}>
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink">{suggestion.text}</p>
        {action && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => (action.type === "add_water" ? onAddWater(action.amountMl) : navigate(action.to))}
          >
            {action.label}
          </Button>
        )}
      </div>
    </li>
  );
}

export function DashboardPage() {
  const profile = useProfile();
  const today = useToday();
  const now = useNow();
  const data = useAppState((s) => s.data);
  const energy = useEnergy(today);
  const water = useWaterGoal();
  const ctx = useGoalContext();
  const run = useRunner();

  const day = useMemo(() => dayNutrition(data.foodEntries, today), [data.foodEntries, today]);
  const waterToday = useMemo(() => entriesOn(data.waterEntries, today), [data.waterEntries, today]);
  const activitiesToday = useMemo(() => entriesOn(data.activityEntries, today), [data.activityEntries, today]);
  const waterTotal = waterTotalOn(data.waterEntries, today);
  const actDay = useMemo(() => activityDay(data.activityEntries, today), [data.activityEntries, today]);
  const actWeek = useMemo(() => activityWeek(data.activityEntries, today), [data.activityEntries, today]);
  const goals = useMemo(() => data.goals.filter((g) => isGoalActiveOn(g, today)), [data.goals, today]);
  const tracker = data.habitTrackers.find((t) => t.active);
  const week = useMemo(() => dailySeries(data, today, 7), [data, today]);
  const weekSummary = summarizeSeries(week, water.goalMl);
  const tracks = new Set(profile.trackedHabits);

  const suggestions = buildSuggestions({
    now,
    tracks: {
      food: tracks.has("food"),
      water: tracks.has("water"),
      activity: tracks.has("activity"),
      habit: Boolean(tracker),
    },
    waterMl: waterTotal,
    waterGoalMl: water.goalMl,
    mealsLogged: day.mealsLogged,
    fruitVegG: day.fruitVegG,
    activityMinutesToday: actDay.minutes,
    weekModerateMinutes: actWeek.moderateEquivalentMin,
    habitLoggedToday: tracker ? Boolean(logFor(data.habitLogs, tracker.id, today)) : true,
  });

  const quickWater = (amountMl: number) =>
    run(
      () => addWater({ amountMl, date: today, time: nowTime() }),
      (e) => `${formatNumber(e.amountMl)} ml de água adicionados.`,
      (e) => () => deleteWater(e.id),
    );

  const kcal = day.totals.values.kcal;
  const name = profile.name || "";

  return (
    <div className="space-y-4 lg:space-y-5">
      <header>
        <p className="text-ink-2">{capitalize(formatDateLong(today))}</p>
        <h1 className="mt-0.5 text-[1.75rem] font-extrabold tracking-[-0.02em] lg:text-[2.1rem]">
          {greetingFor(now)}
          {name ? `, ${name}` : ""}
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5 [&>*]:min-w-0">
        <section aria-labelledby="seu-dia" className="rounded-[1.75rem] bg-ink p-5 text-white sm:p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 id="seu-dia" className="text-lg font-bold">
              Seu dia
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-ink-muted" aria-label="Legenda">
              {DAY_STRIP_LANES.map((l) => (
                <li key={l.label} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <DayStrip foods={day.entries} water={waterToday} activities={activitiesToday} nowMinutes={minutesOfDay(nowTime(now))} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 sm:gap-6">
            <HeroFigure
              to={ROUTES.food}
              label="Energia"
              value={formatNumber(Math.round(kcal))}
              sub={energy.target ? `de ${formatNumber(energy.target)} kcal estimadas` : "kcal consumidas"}
              ratio={energy.target ? kcal / energy.target : 0}
              domain="food"
            />
            <HeroFigure
              to={ROUTES.water}
              label="Água"
              value={formatLiters(waterTotal)}
              sub={`de ${formatLiters(water.goalMl)}`}
              ratio={waterTotal / water.goalMl}
              domain="water"
            />
            <HeroFigure
              to={ROUTES.activity}
              label="Movimento"
              value={formatMinutes(actDay.minutes)}
              sub={`${formatNumber(actWeek.moderateEquivalentMin)} de ${WHO_WEEKLY_MIN} min na semana`}
              ratio={actWeek.moderateEquivalentMin / WHO_WEEKLY_MIN}
              domain="move"
            />
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2 lg:col-span-3 lg:flex lg:justify-start lg:gap-3" role="group" aria-label="Registro rápido">
          {(
            [
              { icon: "water", label: "+200 ml", sr: "Adicionar 200 ml de água", onClick: () => void quickWater(200), tone: "text-water" },
              { icon: "food", label: "Refeição", sr: "Registrar refeição", onClick: () => navigate(`${ROUTES.food}?registrar=1`), tone: "text-food" },
              { icon: "activity", label: "Atividade", sr: "Registrar atividade", onClick: () => navigate(`${ROUTES.activity}?registrar=1`), tone: "text-move" },
            ] as const
          ).map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              aria-label={a.sr}
              className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border border-line bg-white px-2 py-2 text-sm font-bold text-ink transition-colors hover:border-field lg:min-h-11 lg:flex-row lg:gap-2 lg:px-4 lg:text-[0.95rem]"
            >
              <Icon name={a.icon} size={20} className={a.tone} />
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader
            title="Metas"
            description={goals.length ? `${goals.filter((g) => goalProgress(g, ctx, today).done).length} de ${goals.length} atingidas agora` : undefined}
            action={
              <a href={href(ROUTES.goals)} onClick={linkHandler(ROUTES.goals)} className="inline-flex min-h-10 items-center gap-1 font-bold text-ink-2 hover:text-ink">
                Ver todas <Icon name="chevronRight" size={16} />
              </a>
            }
          />
          {goals.length === 0 ? (
            <EmptyState
              icon="target"
              title="Nenhuma meta ativa"
              action={
                <Button size="sm" icon="plus" onClick={() => navigate(`${ROUTES.goals}?criar=1`)}>
                  Criar meta
                </Button>
              }
            >
              Metas pequenas e flexíveis ajudam a manter o ritmo.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {goals.slice(0, 4).map((goal) => {
                const p = goalProgress(goal, ctx, today);
                const domain = METRIC_DOMAIN[goal.metric];
                return (
                  <li key={goal.id} className="flex items-center gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${DOMAIN_ICON_TONE[domain]}`}>
                      <Icon name={p.done ? "check" : goalIcon(goal)} size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-bold leading-snug">{goal.title}</p>
                      <div className="mt-1.5">
                        <Meter value={p.ratio} domain={domain} label={goal.title} thin />
                      </div>
                      <p className="mt-1 text-sm text-ink-2">
                        {formatGoalAmount(goal, p.value)} de {formatGoalAmount(goal, p.target)}
                        <span className="text-muted">{goal.period === "daily" ? ", hoje" : ", nos últimos 7 dias"}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4 lg:space-y-5">
          <Card>
            <CardHeader title="Para agora" />
            <ul className="space-y-4">
              {suggestions.map((s) => (
                <SuggestionItem key={s.id} suggestion={s} onAddWater={(ml) => void quickWater(ml)} />
              ))}
            </ul>
          </Card>

          {tracker &&
            (() => {
              const stats = habitStats(tracker, data.habitLogs, data.cravings, today);
              const labels = HABIT_LABELS[tracker.kind];
              const todayLog = logFor(data.habitLogs, tracker.id, today);
              return (
                <Card>
                  <CardHeader
                    title={tracker.kind === "tobacco" ? "Cigarro" : "Álcool"}
                    description={tracker.mode === "quit" ? `Objetivo: parar de ${labels.verb}` : "Objetivo: reduzir"}
                    action={
                      <span className={`grid size-10 place-items-center rounded-full ${DOMAIN_ICON_TONE.habit}`}>
                        <Icon name="sprout" size={19} />
                      </span>
                    }
                  />
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm text-muted">Dias sem {labels.verb}</dt>
                      <dd className="text-2xl font-extrabold">{formatNumber(stats.daysWithout)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted">Economia estimada</dt>
                      <dd className="text-2xl font-extrabold">{formatCurrency(stats.moneySaved)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-mist p-3">
                    <p className="text-sm">
                      {todayLog
                        ? todayLog.amount === 0
                          ? `Hoje: sem ${labels.unitPlural}.`
                          : `Hoje: ${plural(todayLog.amount, labels.unit, labels.unitPlural)}.`
                        : "Hoje ainda não foi registrado."}
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.habits)}>
                      {todayLog ? "Ver" : "Registrar"}
                    </Button>
                  </div>
                </Card>
              );
            })()}
        </div>

        <Card>
          <CardHeader
            title="Últimos 7 dias"
            action={
              <a href={href(ROUTES.history)} onClick={linkHandler(ROUTES.history)} className="inline-flex min-h-10 items-center gap-1 font-bold text-ink-2 hover:text-ink">
                Histórico <Icon name="chevronRight" size={16} />
              </a>
            }
          />
          <dl className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">Energia média</dt>
              <dd className="font-bold">{weekSummary.avgKcal !== null ? formatKcal(weekSummary.avgKcal) : "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">Dias com a meta de água</dt>
              <dd className="font-bold">{weekSummary.daysWaterGoalMet} de 7</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">Atividade</dt>
              <dd className="font-bold">
                {formatMinutes(weekSummary.totalActivityMin)}, {plural(weekSummary.activeDays, "dia", "dias")}
              </dd>
            </div>
          </dl>
          <div className="mt-5 hidden lg:block">
            <p className="mb-1 text-sm font-bold text-ink-2">Energia por dia (kcal)</p>
            <BarChart
              title="Energia consumida por dia, últimos 7 dias"
              domain="food"
              height={150}
              data={week.map((p) => ({
                key: p.date,
                label: formatWeekdayShort(p.date),
                fullLabel: `${formatWeekdayShort(p.date)}, ${formatDateShort(p.date)}`,
                value: p.hasFood ? Math.round(p.kcal) : null,
              }))}
              format={(v) => formatKcal(v)}
              formatAxis={(v) => formatNumber(v)}
              target={energy.target}
              targetLabel="meta estimada"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
