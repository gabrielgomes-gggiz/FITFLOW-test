/** Formatação numérica no padrão brasileiro (vírgula decimal, ponto de milhar). */

const cache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

export function formatNumber(value: number, maxDigits = 0, minDigits = 0): string {
  return nf(minDigits, maxDigits).format(value);
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function formatKcal(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatNumber(Math.round(value))} kcal`;
}

export function formatMl(value: number): string {
  return `${formatNumber(Math.round(value))} ml`;
}

/** 1650 -> "1,65 L"; 2000 -> "2 L"; 1600 -> "1,6 L". */
export function formatLiters(ml: number, maxDigits = 2): string {
  return `${formatNumber(ml / 1000, maxDigits)} L`;
}

export function formatGrams(value: number | null | undefined, maxDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, maxDigits)} g`;
}

export function formatMg(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatNumber(Math.round(value))} mg`;
}

/** 45 -> "45 min"; 75 -> "1 h 15 min"; 120 -> "2 h". */
export function formatMinutes(total: number): string {
  const m = Math.round(total);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatPercent(ratio: number): string {
  return `${formatNumber(Math.round(ratio * 100))}%`;
}

/** Pluralização simples: plural(2, "dia", "dias") -> "2 dias". */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
