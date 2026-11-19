import { useMemo, useState } from "react";
import { LogoMark, Wordmark } from "@/components/Brand";
import { AboutYouFields, BodyFields, GoalFields, useProfileForm } from "@/components/profile/ProfileFields";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { validateProfile, type FieldErrors } from "@/services/validation";
import { toStorageError } from "@/storage/db";
import { createProfile, enterDemo, switchProfile } from "@/store/actions";
import { useAppState } from "@/store/appStore";
import { todayKey } from "@/utils/date";
import { initials } from "@/utils/text";

/** Ilustração estática da linha do dia (a mesma ideia do painel inicial). */
function DayIllustration() {
  const lanes = [
    { color: "#d95926", dots: [12, 33, 52, 77] },
    { color: "#3987e5", dots: [10, 20, 30, 41, 55, 63, 74] },
    { color: "#199e70", bars: [[8, 14]] as [number, number][] },
  ];
  return (
    <svg viewBox="0 0 320 120" className="w-full" aria-hidden="true">
      {lanes.map((lane, i) => {
        const y = 22 + i * 34;
        return (
          <g key={i}>
            <line x1="10" x2="310" y1={y} y2={y} stroke="rgb(255 255 255 / 0.14)" strokeWidth="6" strokeLinecap="round" />
            {lane.dots?.map((d) => <circle key={d} cx={10 + d * 3} cy={y} r={i === 1 ? 4.5 : 6} fill={lane.color} stroke="#12303a" strokeWidth="2" />)}
            {lane.bars?.map(([a, b]) => <rect key={a} x={10 + a * 3} y={y - 5} width={(b - a) * 3} height="10" rx="5" fill={lane.color} stroke="#12303a" strokeWidth="2" />)}
          </g>
        );
      })}
      <line x1="232" x2="232" y1="6" y2="98" stroke="#c8f169" strokeWidth="2" />
      {["6h", "12h", "18h", "0h"].map((t, i) => (
        <text key={t} x={22 + i * 95} y="116" fill="#9fb6bd" fontSize="11" textAnchor="middle">
          {t}
        </text>
      ))}
    </svg>
  );
}

const STEPS = [
  { title: "Sobre você", description: "Tudo é opcional. Quanto mais você informar, melhores ficam as estimativas." },
  { title: "Corpo e rotina", description: "Peso, altura e rotina ajustam as metas de energia e de água." },
  { title: "Objetivo e hábitos", description: "Escolha o que acompanhar no dia a dia." },
];

const STEP_FIELDS: string[][] = [["name", "age", "birthDate", "sex"], ["weight", "height", "activityLevel"], ["objective"]];

function CreateProfile({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const { form, set, errors, setErrors } = useProfileForm(null);
  const toast = useToast();

  const next = async () => {
    const result = validateProfile(form, todayKey());
    if (!result.ok) {
      const stepErrors: FieldErrors = {};
      for (const k of STEP_FIELDS[step]) if (result.errors[k]) stepErrors[k] = result.errors[k];
      if (Object.keys(stepErrors).length || step === STEPS.length - 1) {
        setErrors(result.errors);
        const firstStepWithError = STEP_FIELDS.findIndex((fields) => fields.some((f) => result.errors[f]));
        if (firstStepWithError >= 0) setStep(firstStepWithError);
        return;
      }
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    if (!result.ok) return;
    setBusy(true);
    try {
      await createProfile(result.value);
      toast.success("Perfil criado. Bem-vindo ao FitFlow!");
    } catch (error) {
      toast.error(toStorageError(error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={step === 0 ? onBack : () => setStep(step - 1)} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-bold text-ink-2 hover:text-ink">
          <Icon name="chevronLeft" size={20} /> Voltar
        </button>
        <span className="text-sm font-bold text-muted">
          Etapa {step + 1} de {STEPS.length}
        </span>
      </div>
      <div className="mb-6 flex gap-1.5" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
      <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em]">{STEPS[step].title}</h1>
      <p className="mt-1 text-ink-2">{STEPS[step].description}</p>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
        noValidate
      >
        <div className="rounded-[var(--radius-card)] border border-line bg-white p-4 sm:p-6">
          {step === 0 && <AboutYouFields form={form} set={set} errors={errors} />}
          {step === 1 && <BodyFields form={form} set={set} errors={errors} />}
          {step === 2 && <GoalFields form={form} set={set} errors={errors} />}
        </div>
        <div className="sticky bottom-0 -mx-4 mt-5 border-t border-line bg-mist/95 px-4 py-3 pb-safe backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" size="lg" full busy={busy} iconRight={step < STEPS.length - 1 ? "chevronRight" : "check"}>
            {step < STEPS.length - 1 ? "Continuar" : "Criar meu perfil"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function WelcomePage() {
  const [mode, setMode] = useState<"intro" | "create">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("criar") === "1" ? "create" : "intro",
  );
  const [busy, setBusy] = useState(false);
  const allProfiles = useAppState((s) => s.profiles);
  const profiles = useMemo(() => allProfiles.filter((p) => !p.isDemo), [allProfiles]);
  const toast = useToast();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error(toStorageError(error).message);
      setBusy(false);
    }
  };

  if (mode === "create") {
    return (
      <main className="min-h-dvh px-4 py-6 sm:py-10">
        <CreateProfile onBack={() => setMode("intro")} />
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6 sm:py-10 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <Wordmark className="text-2xl" />
          </div>
          <h1 className="mt-8 text-[2.1rem] font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-5xl">
            Registre o que você come, bebe e movimenta.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-ink-2">
            O FitFlow transforma seus registros em metas simples e indicadores fáceis de entender — sem cobrança e no seu ritmo.
          </p>

          <div className="mt-8 flex max-w-md flex-col gap-3">
            <Button size="lg" full onClick={() => void run(enterDemo)} busy={busy} icon="spark">
              Explorar com dados de exemplo
            </Button>
            <p className="-mt-1 text-center text-sm text-muted">Perfil fictício com duas semanas de registros.</p>
            <Button size="lg" variant="secondary" full onClick={() => setMode("create")} disabled={busy} icon="user">
              Criar meu perfil
            </Button>
          </div>

          {profiles.length > 0 && (
            <div className="mt-8 max-w-md">
              <h2 className="text-sm font-bold text-ink-2">Perfis salvos neste aparelho</h2>
              <ul className="mt-2 space-y-2">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => switchProfile(p.id))}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left hover:border-field"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-lime font-extrabold">{initials(p.name || "Você")}</span>
                      <span className="flex-1 font-bold">Continuar como {p.name || "Você"}</span>
                      <Icon name="chevronRight" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-8 flex max-w-md items-start gap-2 text-sm text-muted">
            <Icon name="shield" size={18} className="mt-px" />
            Sem login e sem envio de dados: tudo fica salvo só neste navegador, e você pode apagar quando quiser.
          </p>
        </div>

        <div className="rounded-[1.75rem] bg-ink p-5 text-white sm:p-7" aria-hidden="true">
          <p className="font-bold">Seu dia em um olhar</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-ink-muted">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#d95926]" /> Refeições</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#3987e5]" /> Água</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#199e70]" /> Movimento</span>
          </div>
          <div className="mt-4">
            <DayIllustration />
          </div>
          <p className="mt-4 border-t border-white/10 pt-4 text-sm text-on-ink-muted">
            Cada ponto é um registro seu. A linha verde-limão marca a hora atual.
          </p>
        </div>
      </div>
    </main>
  );
}
