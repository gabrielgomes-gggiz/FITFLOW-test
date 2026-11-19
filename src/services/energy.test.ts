import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { bmrMifflinStJeor, bodyMassIndex, classifyBmi, currentAge, estimateEnergy } from "./energy";

const base: Profile = {
  id: "p1",
  isDemo: false,
  name: "Teste",
  ageYears: 31,
  ageRecordedOn: "2026-11-18",
  sex: "female",
  weightKg: 64,
  heightCm: 168,
  activityLevel: "moderate",
  objective: "fitness",
  trackedHabits: [],
  createdAt: "2026-11-18T12:00:00.000Z",
  updatedAt: "2026-11-18T12:00:00.000Z",
};

describe("Mifflin-St Jeor", () => {
  it("calcula a TMB de homens e mulheres", () => {
    expect(bmrMifflinStJeor(70, 175, 30, "male")).toBeCloseTo(1648.75, 2);
    expect(bmrMifflinStJeor(64, 168, 31, "female")).toBeCloseTo(1374, 2);
  });

  it("usa a média dos termos de sexo quando não informado", () => {
    expect(bmrMifflinStJeor(64, 168, 31, "unspecified")).toBeCloseTo(1457, 2);
  });
});

describe("estimateEnergy", () => {
  it("separa TMB, gasto total e meta", () => {
    const e = estimateEnergy(base, "2026-11-18");
    expect(e.status).toBe("ok");
    expect(e.bmr).toBe(1370);
    expect(e.tdee).toBe(2130); // 1374 × 1,55 = 2129,7
    expect(e.target).toBe(2130);
    expect(e.targetSource).toBe("estimate");
    expect(e.tdee!).toBeGreaterThan(e.bmr!);
  });

  it("aplica o ajuste do objetivo sem ficar abaixo da TMB", () => {
    const lose = estimateEnergy({ ...base, objective: "lose" }, "2026-11-18");
    expect(lose.target).toBe(1810); // 2129,7 × 0,85
    const gain = estimateEnergy({ ...base, objective: "gain" }, "2026-11-18");
    expect(gain.target).toBe(2340); // 2129,7 × 1,10
    for (const w of [40, 60, 90, 140]) {
      for (const level of ["sedentary", "light", "moderate", "intense"] as const) {
        const e = estimateEnergy({ ...base, weightKg: w, activityLevel: level, objective: "lose" }, "2026-11-18");
        expect(e.target!).toBeGreaterThanOrEqual(e.bmr! - 10);
      }
    }
  });

  it("informa o que falta quando o perfil está incompleto", () => {
    const e = estimateEnergy({ ...base, weightKg: undefined, heightCm: undefined }, "2026-11-18");
    expect(e.status).toBe("incomplete");
    expect(e.missing).toEqual(["peso", "altura"]);
    expect(e.target).toBeNull();
  });

  it("não estima meta para menores de 18 anos", () => {
    const e = estimateEnergy({ ...base, ageYears: 16 }, "2026-11-18");
    expect(e.status).toBe("underage");
    expect(e.target).toBeNull();
  });

  it("prioriza a meta manual", () => {
    const e = estimateEnergy({ ...base, energyTargetOverride: 1900 }, "2026-11-18");
    expect(e.target).toBe(1900);
    expect(e.estimatedTarget).toBe(2130);
    expect(e.targetSource).toBe("manual");
  });
});

describe("currentAge", () => {
  it("usa a data de nascimento quando existe", () => {
    expect(currentAge({ birthDate: "1995-11-19" }, "2026-11-18")).toBe(30);
    expect(currentAge({ birthDate: "1995-11-18" }, "2026-11-18")).toBe(31);
  });

  it("envelhece a idade informada com o passar dos anos", () => {
    expect(currentAge({ ageYears: 31, ageRecordedOn: "2024-11-10" }, "2026-11-18")).toBe(33);
    expect(currentAge({}, "2026-11-18")).toBeNull();
  });
});

describe("IMC", () => {
  it("classifica adultos pela OMS e pessoas idosas pelo SISVAN", () => {
    const bmi = bodyMassIndex(64, 168)!;
    expect(bmi).toBeCloseTo(22.68, 2);
    expect(classifyBmi(bmi, 31)?.label).toBe("Peso adequado");
    expect(classifyBmi(26, 65)?.label).toBe("Peso adequado");
    expect(classifyBmi(27.5, 65)?.label).toBe("Sobrepeso");
    expect(classifyBmi(31, 40)?.label).toBe("Obesidade");
    expect(classifyBmi(18, 40)?.label).toBe("Baixo peso");
    expect(classifyBmi(22, 16)).toBeNull();
  });
});
