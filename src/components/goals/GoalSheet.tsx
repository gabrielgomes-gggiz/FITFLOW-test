import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Choice";
import { NumberField, SelectField, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Sheet } from "@/components/ui/Sheet";
import { GOAL_TEMPLATES, METRIC_LABELS, METRIC_UNITS, type GoalTemplate } from "@/data/guidance";
import { useRunner, useWaterGoal } from "@/hooks/useAppData";
import { validateGoal, type FieldErrors, type GoalForm } from "@/services/validation";
import { createGoal, deleteGoal, updateGoal } from "@/store/actions";
import type { CustomGoalKind, Goal, GoalMetric, GoalPeriod } from "@/types";
import { formatLiters, formatNumber } from "@/utils/format";
import { DOMAIN_ICON_TONE, METRIC_DOMAIN, METRIC_ICON } from "./goalVisuals";

const EMPTY: GoalForm = { title: "", metric: "custom", period: "daily", target: "1", unit: "", customKind: "check" };

function fromGoal(goal: Goal): GoalForm {
  return {
    title: goal.title,
    metric: goal.metric,
    period: goal.period,
    target: formatNumber(goal.target, 1),
    unit: goal.unit,
    customKind: goal.customKind ?? "check",
  };
}

/** Criar (a partir de um modelo ou do zero) e editar metas. */
export function GoalSheet({ open, goal, onClose }: { open: boolean; goal: Goal | null; onClose: () => void }) {
  const water = useWaterGoal();
  const run = useRunner();
  const [step, setStep] = useState<"templates" | "form">("templates");
  const [form, setForm] = useState<GoalForm>(EMPTY);
  const [linked, setLinked] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (goal) {
      setForm(fromGoal(goal));
      setLinked(goal.linkedTo === "waterGoal");
      setStep("form");
    } else {
      setForm(EMPTY);
      setLinked(false);
      setStep("templates");
    }
  }, [open, goal]);

  const set = <K extends keyof GoalForm>(k: K, v: GoalForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const applyTemplate = (t: GoalTemplate | null) => {
    if (!t) {
      setForm(EMPTY);
      setLinked(false);
    } else {
      setForm({
        title: t.title,
        metric: t.metric,
        period: t.period,
        target: String(t.target ?? water.goalMl),
        unit: t.unit,
        customKind: t.customKind ?? "check",
      });
      setLinked(t.target === null && t.metric === "water_ml");
    }
    setStep("form");
  };

  const changeMetric = (metric: GoalMetric) => {
    setForm((f) => ({
      ...f,
      metric,
      unit: metric === "custom" ? "" : METRIC_UNITS[metric],
      period: metric === "active_days" ? "weekly" : f.period,
    }));
    setLinked(false);
  };

  const save = async () => {
    const effective = linked ? { ...form, target: String(form.period === "weekly" ? water.goalMl * 7 : water.goalMl) } : form;
    const result = validateGoal(effective);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const input = { ...result.value, linkedTo: linked && result.value.metric === "water_ml" ? ("waterGoal" as const) : undefined };
    setBusy(true);
    const saved = goal ? await run(() => updateGoal(goal.id, input), "Meta atualizada.") : await run(() => createGoal(input), "Meta criada.");
    setBusy(false);
    if (saved) onClose();
  };

  const toggleStatus = async () => {
    if (!goal) return;
    const next = goal.status === "active" ? "paused" : "active";
    setBusy(true);
    const ok = await run(() => updateGoal(goal.id, { status: next }), next === "paused" ? "Meta pausada. Ela fica guardada para quando quiser retomar." : "Meta retomada.");
    setBusy(false);
    if (ok) onClose();
  };

  const isCheck = form.metric === "custom" && form.customKind === "check";
  const unitSuffix = form.metric === "custom" ? form.unit || undefined : form.metric === "water_ml" ? "ml" : METRIC_UNITS[form.metric];

  return (
    <>
      <Sheet
        open={open && !confirmDelete}
        onClose={onClose}
        title={goal ? "Editar meta" : step === "templates" ? "Criar meta" : form.title || "Nova meta"}
        description={step === "templates" ? "Comece por um modelo ou crie a sua." : "Você pode mudar o alvo quando quiser."}
        footer={
          step === "form" ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {!goal && (
                  <Button variant="secondary" icon="chevronLeft" onClick={() => setStep("templates")}>
                    Modelos
                  </Button>
                )}
                <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
                  {goal ? "Salvar alterações" : "Criar meta"}
                </Button>
              </div>
              {goal && (
                <div className="flex gap-2">
                  <Button variant="ghost" full onClick={() => void toggleStatus()} disabled={busy}>
                    {goal.status === "active" ? "Pausar meta" : "Retomar meta"}
                  </Button>
                  <Button variant="ghost" full onClick={() => setConfirmDelete(true)} disabled={busy} className="text-danger">
                    Excluir meta
                  </Button>
                </div>
              )}
            </div>
          ) : undefined
        }
      >
        {step === "templates" ? (
          <ul className="space-y-2">
            {GOAL_TEMPLATES.map((t) => {
              const domain = METRIC_DOMAIN[t.metric];
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => applyTemplate(t)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left hover:border-field">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${DOMAIN_ICON_TONE[domain]}`}>
                      <Icon name={t.id === "sleep" ? "moon" : METRIC_ICON[t.metric]} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{t.target === null ? `Beber ${formatLiters(water.goalMl)} de água` : t.title}</span>
                      <span className="block text-sm text-muted">{t.description}</span>
                    </span>
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </button>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => applyTemplate(null)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-field bg-white p-3.5 text-left hover:border-ink">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist">
                  <Icon name="plus" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Meta personalizada</span>
                  <span className="block text-sm text-muted">Ex.: meditar, ler, subir escada no trabalho.</span>
                </span>
              </button>
            </li>
          </ul>
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
            <TextField label="Nome da meta" value={form.title} onChange={(v) => set("title", v)} error={errors.title} maxLength={60} />
            <SelectField
              label="Como medir"
              value={form.metric}
              onChange={(v) => changeMetric(v as GoalMetric)}
              error={errors.metric}
              options={(Object.keys(METRIC_LABELS) as GoalMetric[]).map((m) => ({
                value: m,
                label: m === "custom" ? "Eu marco manualmente" : `${METRIC_LABELS[m]} (automático)`,
              }))}
              hint={form.metric === "custom" ? "Você registra o progresso a cada dia." : "O progresso vem dos seus registros."}
            />
            {form.metric === "custom" && (
              <Segmented<CustomGoalKind>
                label="Tipo de registro"
                value={form.customKind}
                onChange={(v) => {
                  set("customKind", v);
                  if (v === "check") set("target", "1");
                }}
                options={[
                  { value: "check", label: "Feito / não feito" },
                  { value: "amount", label: "Um valor" },
                ]}
              />
            )}
            <Segmented<GoalPeriod>
              label="Período"
              value={form.period}
              onChange={(v) => {
                set("period", v);
                if (isCheck) set("target", v === "daily" ? "1" : "3");
              }}
              options={
                form.metric === "active_days"
                  ? [{ value: "weekly", label: "Semanal (7 dias)" }]
                  : [
                      { value: "daily", label: "Diária" },
                      { value: "weekly", label: "Semanal (7 dias)" },
                    ]
              }
            />
            {errors.period && <p className="-mt-3 text-sm font-bold text-danger">{errors.period}</p>}

            {form.metric === "water_ml" && (
              <label className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
                <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} className="mt-1 size-5 accent-[var(--color-ink)]" />
                <span>
                  <span className="block font-bold">Usar minha meta diária de água</span>
                  <span className="text-sm text-muted">
                    {formatLiters(water.goalMl)} por dia. Se a meta da página Água mudar, esta acompanha.
                  </span>
                </span>
              </label>
            )}

            {!linked && !(isCheck && form.period === "daily") && (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <NumberField
                  label={isCheck ? "Quantos dias na semana" : "Alvo"}
                  integer={isCheck || form.metric === "active_days" || form.metric === "meals_logged"}
                  suffix={isCheck ? "dias" : unitSuffix}
                  value={form.target}
                  onChange={(v) => set("target", v)}
                  error={errors.target}
                />
                {form.metric === "custom" && form.customKind === "amount" && (
                  <TextField label="Unidade" value={form.unit} onChange={(v) => set("unit", v)} error={errors.unit} maxLength={12} placeholder="h, páginas…" className="w-32" />
                )}
              </div>
            )}
            {isCheck && form.period === "daily" && <Notice>Você marca “feito” a cada dia em que cumprir.</Notice>}
          </form>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir esta meta?"
        description="A meta e as marcações dela serão apagadas. Os seus registros de água, refeições e atividades continuam."
        confirmLabel="Excluir meta"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!goal) return;
          setBusy(true);
          void run(() => deleteGoal(goal.id), "Meta excluída.").then(() => {
            setBusy(false);
            setConfirmDelete(false);
            onClose();
          });
        }}
      />
    </>
  );
}
