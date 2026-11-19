import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Grupo de opções exclusivas em formato de segmentos (radio acessível). */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel,
  size = "md",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hideLabel?: boolean;
  size?: "sm" | "md";
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-bold text-ink"}>{label}</legend>
      <div className="flex rounded-[var(--radius-control)] bg-mist p-1">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={`relative flex flex-1 cursor-pointer items-center justify-center rounded-[0.7rem] px-2 text-center font-bold transition-colors ${size === "sm" ? "min-h-9 text-sm" : "min-h-10 text-[0.95rem]"} ${checked ? "bg-white text-ink shadow-[0_1px_3px_rgb(18_48_58/0.15)]" : "text-ink-2 hover:text-ink"}`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span className="peer-focus-visible:underline peer-focus-visible:decoration-2 peer-focus-visible:underline-offset-4">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Opções em cartões, com descrição curta (ex.: nível de atividade). */
export function RadioCards<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  columns = 1,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; description?: ReactNode; icon?: IconName }[];
  error?: string;
  columns?: 1 | 2;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-ink">{label}</legend>
      <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-3.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-water ${checked ? "border-ink bg-white ring-1 ring-ink" : "border-line bg-white hover:border-field"}`}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-ink bg-ink" : "border-field"}`}
              >
                {checked && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-bold text-ink">
                  {o.icon && <Icon name={o.icon} size={18} />}
                  {o.label}
                </span>
                {o.description && <span className="mt-0.5 block text-sm text-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm font-bold text-danger">{error}</p>}
    </fieldset>
  );
}

/** Seleção múltipla em chips (checkbox acessível). */
export function ChipGroup<T extends string>({
  label,
  values,
  onChange,
  options,
  hint,
}: {
  label: string;
  values: T[];
  onChange: (values: T[]) => void;
  options: { value: T; label: string; icon?: IconName }[];
  hint?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-bold text-ink">{label}</legend>
      {hint && <p className="-mt-0.5 mb-2 text-sm text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = values.includes(o.value);
          return (
            <label
              key={o.value}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-water ${checked ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-field"}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
              />
              {checked ? <Icon name="check" size={17} /> : o.icon ? <Icon name={o.icon} size={17} /> : null}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Chips de escolha única, para listas curtas de valores rápidos. */
export function ChoiceChips<T extends string | number>({
  label,
  value,
  onChange,
  options,
  hideLabel,
}: {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hideLabel?: boolean;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-bold text-ink"}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={String(o.value)}
              className={`inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3.5 text-[0.95rem] font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-water ${checked ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-field"}`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
