import { describe, expect, it } from "vitest";
import { createFoodIndex, searchFoods } from "@/services/foodSearch";
import { ACTIVITY_MODALITIES, FEATURED_MODALITY_IDS, getModality } from "./activities";
import { FREQUENT_TACO_IDS, loadTacoFoods, tacoCountsAsFruitVeg } from "./foods";

describe("base TACO", () => {
  it("carrega os 593 alimentos com energia conhecida", async () => {
    const foods = await loadTacoFoods();
    expect(foods).toHaveLength(593);
    expect(foods.every((f) => typeof f.per100g.kcal === "number")).toBe(true);
    expect(new Set(foods.map((f) => f.id)).size).toBe(593);
  });

  it("mantém os valores publicados na TACO 4ª edição", async () => {
    const byId = new Map((await loadTacoFoods()).map((f) => [f.id, f]));
    expect(byId.get("taco:3")).toMatchObject({ name: "Arroz, tipo 1, cozido", per100g: { kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2 } });
    expect(byId.get("taco:561")?.per100g).toMatchObject({ kcal: 76, protein: 4.8, fiber: 8.5 });
    expect(byId.get("taco:182")?.per100g.kcal).toBe(98); // banana prata
    expect(byId.get("taco:53")?.per100g.kcal).toBe(300); // pão francês
    expect(byId.get("taco:163")?.per100g.kcal).toBe(96); // abacate
    expect(byId.get("taco:410")?.per100g).toMatchObject({ kcal: 159, protein: 32 });
  });

  it("aplica o critério da OMS para frutas, legumes e verduras", () => {
    expect(tacoCountsAsFruitVeg(78)).toBe(true); // alface
    expect(tacoCountsAsFruitVeg(182)).toBe(true); // banana
    expect(tacoCountsAsFruitVeg(91)).toBe(false); // batata inglesa
    expect(tacoCountsAsFruitVeg(129)).toBe(false); // mandioca
    expect(tacoCountsAsFruitVeg(215)).toBe(false); // suco de laranja
    expect(tacoCountsAsFruitVeg(140)).toBe(false); // pão de queijo
  });

  it("os alimentos frequentes existem na base", async () => {
    const ids = new Set((await loadTacoFoods()).map((f) => f.id));
    for (const id of FREQUENT_TACO_IDS) expect(ids.has(`taco:${id}`)).toBe(true);
  });
});

describe("busca de alimentos", () => {
  it("ignora acentos, plural e encontra o alimento básico primeiro", async () => {
    const foods = await loadTacoFoods();
    const index = createFoodIndex(foods, FREQUENT_TACO_IDS.map((id) => `taco:${id}`));
    expect(searchFoods(index, "arroz")[0].name).toBe("Arroz, tipo 1, cozido");
    expect(searchFoods(index, "maca").map((f) => f.name)).toContain("Maçã, Fuji, com casca, crua");
    expect(searchFoods(index, "frango grelhado")[0].name).toBe("Frango, peito, sem pele, grelhado");
    expect(searchFoods(index, "bananas")[0].name).toMatch(/^Banana/);
    expect(searchFoods(index, "feijao")[0].name).toBe("Feijão, carioca, cozido");
    expect(searchFoods(index, "mel")[0].name).toBe("Mel, de abelha");
    expect(searchFoods(index, "xyzw")).toEqual([]);
  });
});

describe("catálogo de atividades", () => {
  it("cada modalidade tem variante padrão válida e METs plausíveis", () => {
    for (const m of ACTIVITY_MODALITIES) {
      expect(m.variants.some((v) => v.id === m.defaultVariantId)).toBe(true);
      expect(new Set(m.variants.map((v) => v.id)).size).toBe(m.variants.length);
      for (const v of m.variants) {
        expect(v.met).toBeGreaterThanOrEqual(1);
        expect(v.met).toBeLessThan(25);
        expect(v.code).toMatch(/^\d{5}$/);
      }
    }
    for (const id of FEATURED_MODALITY_IDS) expect(getModality(id)).toBeDefined();
  });
});
