import { useEffect, useId, useRef, useState } from "react";
import { requestDemoReset } from "@/components/DemoResetController";
import { AboutYouFields, BodyFields, GoalFields, HABIT_OPTIONS, useProfileForm } from "@/components/profile/ProfileFields";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { EstimateNote, Notice } from "@/components/ui/Feedback";
import { NumberField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Sheet } from "@/components/ui/Sheet";
import { useEnergy, useProfile, useRunner, useWaterGoal } from "@/hooks/useAppData";
import { href, linkHandler, navigate, ROUTES } from "@/hooks/useRouter";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/layouts/AppLayout";
import { ACTIVITY_LEVELS, bodyMassIndex, classifyBmi, currentAge, OBJECTIVES, SEX_LABELS } from "@/services/energy";
import { validateManualTargets, validateProfile } from "@/services/validation";
import { deleteActiveProfile, exportActiveProfile, leaveProfile, switchProfile, updateProfile, updateProfileFromInput, wipeAllData } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import { formatDateNumeric, todayKey } from "@/utils/date";
import { formatKcal, formatLiters, formatNumber } from "@/utils/format";
import { initials } from "@/utils/text";
import { WaterGoalSheet } from "./WaterPage";

export const APP_VERSION = "1.0.0";

function ProfileEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile();
  const run = useRunner();
  const { form, set, errors, setErrors } = useProfileForm(profile);
  const [busy, setBusy] = useState(false);
  const formId = useId();

  const save = async () => {
    const r = validateProfile(form, todayKey());
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    const ok = await run(() => updateProfileFromInput(r.value), "Perfil atualizado. As estimativas foram recalculadas.");
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title="Editar perfil"
      description="Tudo é opcional. Os dados ficam só neste aparelho."
      footer={
        <Button type="submit" form={formId} full size="lg" busy={busy} icon="check">
          Salvar alterações
        </Button>
      }
    >
      <form
        id={formId}
        className="space-y-8"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <section>
          <h3 className="mb-3 text-base font-extrabold">Sobre você</h3>
          <AboutYouFields form={form} set={set} errors={errors} />
        </section>
        <section>
          <h3 className="mb-3 text-base font-extrabold">Corpo e rotina</h3>
          <BodyFields form={form} set={set} errors={errors} />
        </section>
        <section>
          <h3 className="mb-3 text-base font-extrabold">Objetivo e hábitos</h3>
          <GoalFields form={form} set={set} errors={errors} />
        </section>
      </form>
    </Sheet>
  );
}

function EnergyTargetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = useToday();
  const energy = useEnergy(today);
  const run = useRunner();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setValue(energy.target ? String(energy.target) : "");
      setError(undefined);
    }
  }, [open, energy.target]);

  const save = async (useEstimate: boolean) => {
    let override: number | undefined;
    if (!useEstimate) {
      const r = validateManualTargets(value, "");
      if (!r.ok) {
        setError(r.errors.energy);
        return;
      }
      if (r.value.energyTargetOverride === undefined) {
        setError("Informe a meta em kcal.");
        return;
      }
      override = r.value.energyTargetOverride;
    }
    const ok = await run(() => updateProfile({ energyTargetOverride: override }), useEstimate ? "A meta voltou para a estimativa." : "Meta de energia atualizada.");
    if (ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajustar meta de energia"
      description={energy.estimatedTarget ? `Estimativa para o seu perfil: ${formatKcal(energy.estimatedTarget)} por dia.` : "Sem estimativa: complete idade, peso e altura, ou defina um valor."}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button full size="lg" icon="check" onClick={() => void save(false)}>
            Salvar meta
          </Button>
          {energy.targetSource === "manual" && (
            <Button variant="secondary" onClick={() => void save(true)}>
              Usar a estimativa
            </Button>
          )}
        </div>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <NumberField integer label="Meta diária" suffix="kcal" value={value} onChange={setValue} error={error} hint="Entre 1.000 e 5.000 kcal." />
        <EstimateNote>Se você tem orientação de nutricionista, use o valor indicado por ele.</EstimateNote>
      </form>
    </Sheet>
  );
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProfilePage() {
  const profile = useProfile();
  const profiles = useAppState((s) => s.profiles);
  const today = useToday();
  const energy = useEnergy(today);
  const water = useWaterGoal();
  const run = useRunner();
  const [editOpen, setEditOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "wipe" | null>(null);
  const [understood, setUnderstood] = useState(false);
  const taps = useRef<number[]>([]);

  const age = currentAge(profile, today);
  const bmi = bodyMassIndex(profile.weightKg, profile.heightCm);
  const bmiClass = bmi ? classifyBmi(bmi, age) : null;

  const facts: [string, string][] = [
    ["Idade", age !== null ? `${age} anos${profile.birthDate ? ` (nasc. ${formatDateNumeric(profile.birthDate)})` : ""}` : "Não informada"],
    ["Sexo nos cálculos", SEX_LABELS[profile.sex]],
    ["Peso", profile.weightKg ? `${formatNumber(profile.weightKg, 1)} kg` : "Não informado"],
    ["Altura", profile.heightCm ? `${formatNumber(profile.heightCm)} cm` : "Não informada"],
    ["Rotina", ACTIVITY_LEVELS[profile.activityLevel].label],
    ["Objetivo", OBJECTIVES[profile.objective].label],
    ["Acompanha", profile.trackedHabits.length ? HABIT_OPTIONS.filter((h) => profile.trackedHabits.includes(h.value)).map((h) => h.label).join(", ") : "Nada selecionado"],
  ];

  const onVersionTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      requestDemoReset();
    }
  };

  const exportData = () => {
    const bundle = exportActiveProfile();
    const slug = (profile.name || "perfil").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
    downloadJson(`fitflow-${slug}-${today}.json`, bundle);
  };

  return (
    <div>
      <PageHeader title="Perfil e dados" description="Seus dados, suas estimativas e o controle sobre o que fica salvo." />

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2 lg:items-start lg:gap-5">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-lime text-2xl font-extrabold">{initials(profile.name || "Você")}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-extrabold">{profile.name || "Sem nome"}</h2>
                {profile.isDemo ? <Badge tone="lime">Perfil de demonstração</Badge> : <p className="text-sm text-muted">Perfil pessoal</p>}
              </div>
            </div>
            <dl className="mt-5 divide-y divide-line border-t border-line">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <Button className="mt-4" variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>
              Editar perfil
            </Button>
          </Card>

          <Card>
            <CardHeader title="Suas estimativas" description="Recalculadas quando o perfil muda. Não substituem orientação profissional." />
            {energy.status === "underage" && (
              <div className="mb-4">
                <Notice>As fórmulas de energia do FitFlow são para adultos. Para menores de 18 anos, procure orientação profissional.</Notice>
              </div>
            )}
            {energy.status === "incomplete" && (
              <div className="mb-4">
                <Notice>Para estimar a energia, informe: {energy.missing.join(", ")}.</Notice>
              </div>
            )}
            <dl className="divide-y divide-line border-y border-line">
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt>
                  <span className="block text-ink-2">Metabolismo basal</span>
                  <span className="block text-xs text-muted">Gasto em repouso total</span>
                </dt>
                <dd className="font-bold">{energy.bmr ? formatKcal(energy.bmr) : "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt>
                  <span className="block text-ink-2">Gasto diário estimado</span>
                  <span className="block text-xs text-muted">Basal × fator de rotina ({formatNumber(energy.activityFactor, 3)})</span>
                </dt>
                <dd className="font-bold">{energy.tdee ? formatKcal(energy.tdee) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt>
                  <span className="block text-ink-2">Meta de energia</span>
                  <span className="block text-xs text-muted">
                    {energy.targetSource === "manual" ? "Definida por você" : energy.targetSource === "estimate" ? "Estimada pelo objetivo" : "Não definida"}
                  </span>
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="font-bold">{energy.target ? formatKcal(energy.target) : "—"}</span>
                  <Button size="sm" variant="secondary" onClick={() => setEnergyOpen(true)}>
                    Ajustar
                  </Button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt>
                  <span className="block text-ink-2">Meta de água</span>
                  <span className="block text-xs text-muted">{water.source === "manual" ? "Definida por você" : "Estimada"}</span>
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="font-bold">{formatLiters(water.goalMl)}</span>
                  <Button size="sm" variant="secondary" onClick={() => setWaterOpen(true)}>
                    Ajustar
                  </Button>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt>
                  <span className="block text-ink-2">IMC</span>
                  <span className="block text-xs text-muted">{bmiClass ? bmiClass.reference : "Peso ÷ altura²"}</span>
                </dt>
                <dd className="text-right font-bold">
                  {bmi ? formatNumber(bmi, 1) : "—"}
                  {bmiClass && <span className="block text-sm font-normal text-ink-2">{bmiClass.label}</span>}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted">O IMC é um indicador populacional: não mede gordura, músculo nem saúde individual.</p>
            <a className="mt-3 inline-flex min-h-10 items-center gap-1 font-bold text-ink underline underline-offset-4" href={href(ROUTES.about)} onClick={linkHandler(ROUTES.about)}>
              Como calculamos <Icon name="chevronRight" size={16} />
            </a>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Perfis neste aparelho" />
            <ul className="space-y-2">
              {profiles.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist font-extrabold">{initials(p.name || "Você")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name || "Sem nome"}</span>
                    <span className="text-sm text-muted">{p.isDemo ? "Demonstração" : "Pessoal"}</span>
                  </span>
                  {p.id === profile.id ? (
                    <Badge tone="ok">Em uso</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => void run(() => switchProfile(p.id), `Perfil trocado para ${p.name || "Sem nome"}.`)}>
                      Usar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <Button
              className="mt-3"
              variant="ghost"
              icon="plus"
              onClick={() => {
                navigate("/?criar=1", { replace: true });
                void run(() => leaveProfile());
              }}
            >
              Criar outro perfil
            </Button>
          </Card>

          <Card>
            <CardHeader title="Privacidade e dados" />
            <div className="space-y-3 text-ink-2">
              <p className="flex items-start gap-2">
                <Icon name="shield" size={18} className="mt-0.5 text-ok" />
                <span>
                  Tudo fica salvo só neste navegador. O FitFlow não tem login, não usa servidor e não envia seus dados para ninguém.
                </span>
              </p>
              <p className="text-sm">Se você limpar os dados do navegador ou usar outro aparelho, os registros não acompanham. Exporte uma cópia se quiser guardar.</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="secondary" icon="download" onClick={exportData}>
                Exportar meus dados (JSON)
              </Button>
              {!profile.isDemo && (
                <Button variant="secondary" icon="trash" className="text-danger" onClick={() => setConfirm("delete")}>
                  Excluir este perfil e os registros
                </Button>
              )}
              <Button variant="ghost" icon="trash" className="text-danger" onClick={() => setConfirm("wipe")}>
                Apagar todos os dados do FitFlow neste navegador
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sobre" />
            <div className="space-y-2 text-sm text-ink-2">
              <p>
                O FitFlow é um projeto acadêmico de acompanhamento de hábitos. As estimativas são educativas e não substituem a orientação de profissionais de saúde.
              </p>
              <p>Alimentos: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição, NEPA/UNICAMP. Atividades: Compêndio de Atividades Físicas para Adultos, 2024.</p>
              <p>
                <span className="select-none" onClick={onVersionTap}>
                  Versão {APP_VERSION}
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Montado só quando aberto: o formulário sempre começa com os dados atuais. */}
      {editOpen && <ProfileEditSheet open onClose={() => setEditOpen(false)} />}
      <EnergyTargetSheet open={energyOpen} onClose={() => setEnergyOpen(false)} />
      <WaterGoalSheet open={waterOpen} onClose={() => setWaterOpen(false)} />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Excluir este perfil?"
        description={`O perfil “${profile.name || "Sem nome"}” e todos os registros dele serão apagados deste navegador. Não é possível desfazer.`}
        confirmLabel="Excluir perfil e registros"
        confirmDisabled={!understood}
        onCancel={() => {
          setConfirm(null);
          setUnderstood(false);
        }}
        onConfirm={() => {
          if (!understood) return;
          setConfirm(null);
          setUnderstood(false);
          void run(() => deleteActiveProfile(), "Perfil e registros excluídos.");
        }}
      >
        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-danger-soft p-3.5">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1 size-5 accent-[var(--color-danger)]" />
          <span className="font-bold">Entendo que os dados serão apagados definitivamente.</span>
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "wipe"}
        title="Apagar todos os dados?"
        description="Todos os perfis e registros do FitFlow neste navegador serão apagados. A demonstração é recriada do zero. Não é possível desfazer."
        confirmLabel="Apagar tudo"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void run(() => wipeAllData(), "Todos os dados foram apagados.");
        }}
      />
    </div>
  );
}
