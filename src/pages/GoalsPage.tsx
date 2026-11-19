import { useEffect, useMemo, useState } from "react";
import { GoalSheet } from "@/components/goals/GoalSheet";
import { DOMAIN_ICON_TONE, goalIcon, METRIC_DOMAIN, periodLabel } from "@/components/goals/goalVisuals";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Meter } from "@/components/ui/Feedback";
import { NumberField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useGoalContext, useRunner } from "@/hooks/useAppData";
import { usePageDate } from "@/hooks/usePageDate";
import { href, linkHandler, ROUTES } from "@/hooks/useRouter";
import { PageHeader } from "@/layouts/AppLayout";
import { checkinFor, formatGoalAmount, goalHistory, goalProgress, isGoalActiveOn, nextSmallStep, summarizeHistory, type GoalDataContext } from "@/services/goals";
import { validateCheckinValue } from "@/services/validation";
import { setGoalCheckin, updateGoal } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import type { DateKey, Goal } from "@/types";
import { formatDateShort, formatWeekdayShort } from "@/utils/date";
import { formatNumber } from "@/utils/format";

function CheckinControl({ goal, today, ctx }: { goal: Goal; today: DateKey; ctx: GoalDataContext }) {
  const run = useRunner();
  const existing = checkinFor(ctx.goalCheckins, goal.id, today);
  const [value, setValue] = useState(existing ? formatNumber(existing.value, 1) : "");
  const [error, setError] = useState<string>();
  useEffect(() => setValue(existing ? formatNumber(existing.value, 1) : ""), [existing]);

  if (goal.customKind === "check") {
    const done = Boolean(existing);
    return (
      <Button
        variant={done ? "primary" : "secondary"}
        icon={done ? "check" : undefined}
        aria-pressed={done}
        onClick={() => void run(() => setGoalCheckin(goal.id, today, done ? null : 1), done ? "Marcação removida." : "Marcado como feito hoje.")}
      >
        {done ? "Feito hoje" : "Marcar como feito hoje"}
      </Button>
    );
  }
  return (
    <form
      className="flex items-end gap-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const r = validateCheckinValue(value, goal.customKind);
        if (!r.ok) {
          setError(r.errors.value);
          return;
        }
        setError(undefined);
        void run(() => setGoalCheckin(goal.id, today, r.value), "Valor de hoje salvo.");
      }}
    >
      <div className="w-40">
        <NumberField label="Hoje" suffix={goal.unit || undefined} value={value} onChange={setValue} error={error} />
      </div>
      <Button type="submit" variant="secondary">
        Salvar
      </Button>
    </form>
  );
}

function GoalCard({ goal, ctx, today, onEdit }: { goal: Goal; ctx: GoalDataContext; today: DateKey; onEdit: () => void }) {
  const progress = goalProgress(goal, ctx, today);
  const points = goal.period === "daily" ? 7 : 4;
  const history = goalHistory(goal, ctx, today, points);
  const summary = summarizeHistory(history);
  const domain = METRIC_DOMAIN[goal.metric];

  return (
    <Card as="article" aria-label={goal.title}>
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${DOMAIN_ICON_TONE[domain]}`}>
          <Icon name={progress.done ? "check" : goalIcon(goal)} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold leading-snug">{goal.title}</h2>
          <p className="text-sm text-muted">{periodLabel(goal)}</p>
        </div>
        <Button size="sm" variant="ghost" icon="edit" onClick={onEdit} aria-label={`Editar meta ${goal.title}`}>
          Editar
        </Button>
      </div>
      <div className="mt-4">
        <Meter value={progress.ratio} domain={domain} label={`Progresso de ${goal.title}`} />
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="font-bold">
            {formatGoalAmount(goal, progress.value)} <span className="font-normal text-ink-2">de {formatGoalAmount(goal, progress.target)}</span>
          </p>
        </div>
        <p className="mt-1 text-sm text-ink-2">{nextSmallStep(goal, progress)}</p>
      </div>

      {goal.metric === "custom" && (
        <div className="mt-4">
          <CheckinControl goal={goal} today={today} ctx={ctx} />
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <ol className="flex gap-1.5" aria-label="Histórico recente">
          {history.map((h) => (
            <li key={h.date} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`grid size-7 place-items-center rounded-full border-2 ${h.beforeStart ? "border-dashed border-line" : h.done ? "border-ink bg-ink text-lime" : "border-line bg-white"}`}
                title={`${goal.period === "daily" ? formatDateShort(h.date) : `7 dias até ${formatDateShort(h.date)}`}: ${h.beforeStart ? "antes da meta" : h.done ? "atingida" : formatGoalAmount(goal, h.value)}`}
              >
                {h.done && !h.beforeStart && <Icon name="check" size={14} strokeWidth={2.5} />}
              </span>
              <span className="text-[0.7rem] text-muted">{goal.period === "daily" ? formatWeekdayShort(h.date) : formatDateShort(h.date)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-ink-2">
          {summary.counted === 0
            ? "O histórico começa hoje."
            : goal.period === "daily"
              ? `Atingida em ${summary.met} de ${summary.counted} ${summary.counted === 1 ? "dia" : "dias"} recentes.`
              : `Atingida em ${summary.met} de ${summary.counted} ${summary.counted === 1 ? "semana" : "semanas"} recentes.`}
        </p>
      </div>
    </Card>
  );
}

export function GoalsPage() {
  const { today, openRequested, clearOpenRequest } = usePageDate();
  const goals = useAppState((s) => s.data.goals);
  const ctx = useGoalContext();
  const run = useRunner();
  const [sheet, setSheet] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });

  useEffect(() => {
    if (openRequested) {
      setSheet({ open: true, goal: null });
      clearOpenRequest();
    }
  }, [openRequested, clearOpenRequest]);

  const active = useMemo(() => goals.filter((g) => isGoalActiveOn(g, today)), [goals, today]);
  const paused = useMemo(() => goals.filter((g) => g.status !== "active"), [goals]);
  const steps = active
    .map((g) => ({ goal: g, progress: goalProgress(g, ctx, today) }))
    .filter((x) => !x.progress.done)
    .slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Metas flexíveis: ajuste quando quiser. O progresso vem dos seus registros, sem cobrança por sequência."
        action={
          <Button size="lg" icon="plus" onClick={() => setSheet({ open: true, goal: null })}>
            Criar meta
          </Button>
        }
      />

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon="target"
            title="Nenhuma meta ativa"
            action={
              <Button icon="plus" onClick={() => setSheet({ open: true, goal: null })}>
                Criar meta
              </Button>
            }
          >
            Comece com algo pequeno, como beber água ao longo do dia ou caminhar 30 minutos.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
          <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} ctx={ctx} today={today} onEdit={() => setSheet({ open: true, goal: g })} />
            ))}
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader title="Pequenos passos para hoje" />
              {steps.length === 0 ? (
                <p className="text-ink-2">Todas as metas ativas estão atingidas neste momento.</p>
              ) : (
                <ul className="space-y-3">
                  {steps.map(({ goal, progress }) => (
                    <li key={goal.id} className="flex gap-3">
                      <Icon name="spark" size={18} className="mt-0.5 text-ink-2" />
                      <p>
                        <span className="font-bold">{goal.title}:</span> {nextSmallStep(goal, progress)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {paused.length > 0 && (
              <Card>
                <CardHeader title="Metas pausadas" />
                <ul className="divide-y divide-line">
                  {paused.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate font-bold">{g.title}</span>
                      <Button size="sm" variant="secondary" onClick={() => void run(() => updateGoal(g.id, { status: "active" }), "Meta retomada.")}>
                        Retomar
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <a
              href={href(ROUTES.habits)}
              onClick={linkHandler(ROUTES.habits)}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 hover:border-field"
            >
              <span className={`grid size-11 place-items-center rounded-full ${DOMAIN_ICON_TONE.habit}`}>
                <Icon name="sprout" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Cigarro e álcool</span>
                <span className="block text-sm text-muted">Acompanhe a redução no seu ritmo.</span>
              </span>
              <Icon name="chevronRight" className="text-muted" />
            </a>
          </div>
        </div>
      )}

      <GoalSheet open={sheet.open} goal={sheet.goal} onClose={() => setSheet({ open: false, goal: null })} />
    </div>
  );
}
