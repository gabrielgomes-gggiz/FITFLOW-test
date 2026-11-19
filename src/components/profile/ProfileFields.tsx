import { useState } from "react";
import { ChipGroup, ChoiceChips, RadioCards } from "@/components/ui/Choice";
import { NumberField, TextField } from "@/components/ui/Field";
import { ACTIVITY_LEVELS, currentAge, OBJECTIVES, SEX_LABELS } from "@/services/energy";
import type { FieldErrors, ProfileForm } from "@/services/validation";
import type { ActivityLevel, Objective, Profile, Sex, TrackedHabit } from "@/types";
import { todayKey } from "@/utils/date";
import { formatNumber } from "@/utils/format";

export function profileToForm(profile?: Profile | null): ProfileForm {
  const today = todayKey();
  return {
    name: profile?.name ?? "",
    ageMode: profile?.birthDate ? "birthDate" : "age",
    age: profile && !profile.birthDate ? String(currentAge(profile, today) ?? "") : "",
    birthDate: profile?.birthDate ?? "",
    sex: profile?.sex ?? "unspecified",
    weight: profile?.weightKg ? formatNumber(profile.weightKg, 1) : "",
    height: profile?.heightCm ? String(profile.heightCm) : "",
    activityLevel: profile?.activityLevel ?? "light",
    objective: profile?.objective ?? "maintain",
    trackedHabits: profile?.trackedHabits ?? ["food", "water", "activity"],
  };
}

export function useProfileForm(profile?: Profile | null) {
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };
  return { form, set, errors, setErrors };
}

type FieldsProps = {
  form: ProfileForm;
  set: <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => void;
  errors: FieldErrors;
};

export function AboutYouFields({ form, set, errors }: FieldsProps) {
  const today = todayKey();
  return (
    <div className="space-y-5">
      <TextField
        label="Como podemos te chamar?"
        optional
        value={form.name}
        onChange={(v) => set("name", v)}
        error={errors.name}
        autoComplete="given-name"
        maxLength={60}
      />
      {form.ageMode === "age" ? (
        <div>
          <NumberField
            integer
            label="Idade"
            optional
            suffix="anos"
            value={form.age}
            onChange={(v) => set("age", v)}
            error={errors.age}
            hint="Usada nas estimativas de energia."
          />
          <button type="button" className="mt-2 text-sm font-bold text-ink-2 underline underline-offset-4" onClick={() => set("ageMode", "birthDate")}>
            Prefiro informar a data de nascimento
          </button>
        </div>
      ) : (
        <div>
          <TextField
            type="date"
            label="Data de nascimento"
            optional
            max={today}
            value={form.birthDate}
            onChange={(v) => set("birthDate", v)}
            error={errors.birthDate}
          />
          <button type="button" className="mt-2 text-sm font-bold text-ink-2 underline underline-offset-4" onClick={() => set("ageMode", "age")}>
            Prefiro informar só a idade
          </button>
        </div>
      )}
      <div>
        <ChoiceChips<Sex>
          label="Sexo usado nos cálculos"
          value={form.sex}
          onChange={(v) => set("sex", v)}
          options={(["female", "male", "unspecified"] as Sex[]).map((s) => ({ value: s, label: SEX_LABELS[s] }))}
        />
        <p className="mt-1.5 text-sm text-muted">
          As fórmulas de metabolismo variam conforme o sexo biológico. Sem essa informação, usamos a média das duas.
        </p>
      </div>
    </div>
  );
}

export function BodyFields({ form, set, errors }: FieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Peso" optional suffix="kg" value={form.weight} onChange={(v) => set("weight", v)} error={errors.weight} placeholder="64,5" />
        <NumberField label="Altura" optional integer suffix="cm" value={form.height} onChange={(v) => set("height", v)} error={errors.height} placeholder="168" />
      </div>
      <RadioCards<ActivityLevel>
        label="Como é a sua rotina de atividade?"
        value={form.activityLevel}
        onChange={(v) => set("activityLevel", v)}
        error={errors.activityLevel}
        options={(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => ({
          value: k,
          label: ACTIVITY_LEVELS[k].label,
          description: ACTIVITY_LEVELS[k].description,
        }))}
      />
    </div>
  );
}

export const HABIT_OPTIONS: { value: TrackedHabit; label: string; icon: "food" | "water" | "activity" | "moon" | "sprout" }[] = [
  { value: "food", label: "Alimentação", icon: "food" },
  { value: "water", label: "Água", icon: "water" },
  { value: "activity", label: "Atividades", icon: "activity" },
  { value: "sleep", label: "Sono", icon: "moon" },
  { value: "tobacco", label: "Reduzir cigarro", icon: "sprout" },
  { value: "alcohol", label: "Reduzir álcool", icon: "sprout" },
];

export function GoalFields({ form, set, errors }: FieldsProps) {
  return (
    <div className="space-y-6">
      <RadioCards<Objective>
        label="Qual é o seu objetivo principal?"
        columns={2}
        value={form.objective}
        onChange={(v) => set("objective", v)}
        error={errors.objective}
        options={(Object.keys(OBJECTIVES) as Objective[]).map((k) => ({ value: k, label: OBJECTIVES[k].label }))}
      />
      <ChipGroup<TrackedHabit>
        label="O que você quer acompanhar?"
        hint="Criamos metas iniciais para o que você escolher. Dá para mudar depois."
        values={form.trackedHabits}
        onChange={(v) => set("trackedHabits", v)}
        options={HABIT_OPTIONS}
      />
    </div>
  );
}
