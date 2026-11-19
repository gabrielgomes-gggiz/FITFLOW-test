import { describe, expect, it } from "vitest";
import { addDays, ageOn, diffDays, formatDateLong, formatRelativeDay, isValidDateKey, lastNDays, toDateKey } from "./date";
import { formatCurrency, formatKcal, formatLiters, formatMinutes } from "./format";

describe("datas locais", () => {
  it("usa o dia local mesmo à noite em UTC-3", () => {
    const lateNight = new Date("2026-11-18T22:30:00-03:00");
    expect(lateNight.toISOString().slice(0, 10)).toBe("2026-11-19"); // armadilha do UTC
    expect(toDateKey(lateNight)).toBe("2026-11-18");
  });

  it("soma dias atravessando meses e anos", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffDays("2026-03-01", "2026-02-27")).toBe(2);
    expect(lastNDays("2026-11-18", 3)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
  });

  it("valida datas reais", () => {
    expect(isValidDateKey("2026-02-29")).toBe(false);
    expect(isValidDateKey("2028-02-29")).toBe(true);
    expect(isValidDateKey("18/11/2026")).toBe(false);
  });

  it("calcula idade e formata em português", () => {
    expect(ageOn("2000-11-19", "2026-11-18")).toBe(25);
    expect(formatDateLong("2026-11-18")).toBe("quarta-feira, 18 de novembro");
    expect(formatRelativeDay("2026-11-17", "2026-11-18")).toBe("Ontem");
  });
});

describe("formatação numérica", () => {
  it("segue o padrão brasileiro", () => {
    expect(formatKcal(2129.6)).toBe("2.130 kcal");
    expect(formatLiters(1650)).toBe("1,65 L");
    expect(formatMinutes(135)).toBe("2 h 15 min");
    expect(formatCurrency(47.5).replace(/\s/g, " ")).toBe("R$ 47,50");
  });
});
