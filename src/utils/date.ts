import type { DateKey, TimeOfDay } from "@/types";

/**
 * Datas são guardadas como "AAAA-MM-DD" no fuso do aparelho.
 * Nunca usamos toISOString() para obter o dia: em UTC-3, depois das 21h ele já
 * retorna o dia seguinte.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string") return false;
  const m = DATE_KEY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** Converte a chave para um Date ao meio-dia local (evita surpresas com horário de verão). */
export function fromDateKey(key: DateKey): Date {
  const m = DATE_KEY_RE.exec(key);
  if (!m) throw new Error(`Data inválida: ${key}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Diferença em dias inteiros: a - b. */
export function diffDays(a: DateKey, b: DateKey): number {
  const toUtc = (k: DateKey) => {
    const m = DATE_KEY_RE.exec(k)!;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  return Math.round((toUtc(a) - toUtc(b)) / 86_400_000);
}

/** Lista de N dias terminando em `end` (inclusive), do mais antigo para o mais recente. */
export function lastNDays(end: DateKey, n: number): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function isWithin(key: DateKey, start: DateKey, end: DateKey): boolean {
  return key >= start && key <= end;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: unknown): value is TimeOfDay {
  return typeof value === "string" && TIME_RE.test(value);
}

export function nowTime(now: Date = new Date()): TimeOfDay {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function minutesOfDay(time: TimeOfDay): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeFromMinutes(total: number): TimeOfDay {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/* --------------------------------------------------------------- Formatação */

const longFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
const fullFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** "quarta-feira, 18 de novembro" */
export function formatDateLong(key: DateKey): string {
  return longFmt.format(fromDateKey(key));
}

/** "18 de nov." -> "18 nov" */
export function formatDateShort(key: DateKey): string {
  return shortFmt.format(fromDateKey(key)).replace(" de ", " ").replace(".", "");
}

/** "qua" */
export function formatWeekdayShort(key: DateKey): string {
  return weekdayFmt.format(fromDateKey(key)).replace(".", "");
}

/** "18/11/2026" */
export function formatDateNumeric(key: DateKey): string {
  return fullFmt.format(fromDateKey(key));
}

/** "Hoje", "Ontem" ou "seg, 16 nov". */
export function formatRelativeDay(key: DateKey, today: DateKey): string {
  const diff = diffDays(today, key);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return `${formatWeekdayShort(key)}, ${formatDateShort(key)}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Saudação conforme o horário local. */
export function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Idade completa em anos numa data de referência. */
export function ageOn(birthDate: DateKey, reference: DateKey): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ry, rm, rd] = reference.split("-").map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}
