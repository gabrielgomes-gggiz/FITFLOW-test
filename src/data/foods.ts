import type { CustomFood, FoodItem, Nutrients } from "@/types";

/**
 * Base de alimentos.
 *
 * Fonte: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e
 * ampliada. NEPA/UNICAMP, 2011. "É permitida a reprodução total ou parcial desta obra,
 * desde que citada a fonte."
 *
 * O arquivo taco.json foi gerado a partir da planilha oficial (Taco_4a_edicao_2011.xls)
 * e conferido, valor a valor, com uma conversão independente da mesma planilha.
 * Todos os valores são por 100 g de parte comestível.
 */

export const TACO_SOURCE = "TACO 4ª edição (NEPA/UNICAMP, 2011)";

interface TacoFile {
  source: string;
  categories: string[];
  /** [id, nome, categoria, kcal, proteína, lipídeos, carboidratos, fibra, sódio] */
  foods: [number, string, number, number, number | null, number | null, number | null, number | null, number | null][];
}

/**
 * Alimentos da TACO que contam para a recomendação da OMS de pelo menos 400 g/dia de
 * frutas, legumes e verduras. Seguindo a OMS, ficam de fora batata, batata-doce, mandioca
 * e outras raízes amiláceas. Também excluímos sucos, doces e frutas em calda, farinhas e
 * preparações que estão nessas categorias da TACO (ex.: pão de queijo, polvilho). Dois pratos
 * preparados só com legumes entram na conta.
 */
const FRUIT_VEG_RANGES: [number, number][] = [
  // Verduras, hortaliças e derivados
  [64, 85], [95, 98], [100, 101], [104, 113], [115, 120], [125, 125], [127, 128],
  [133, 135], [137, 139], [142, 145], [147, 157], [161, 162],
  // Frutas e derivados
  [163, 166], [168, 170], [172, 172], [174, 175], [177, 187], [189, 194], [196, 197],
  [200, 208], [210, 210], [212, 212], [214, 214], [216, 216], [220, 223], [225, 226],
  [228, 233], [235, 244], [246, 251], [253, 257],
  // Alimentos preparados feitos só de legumes
  [544, 544], // Quibebe (abóbora)
  [546, 546], // Salada de legumes cozida no vapor
];

const FRUIT_VEG_IDS = new Set<number>(
  FRUIT_VEG_RANGES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)),
);

export function tacoCountsAsFruitVeg(tacoId: number): boolean {
  return FRUIT_VEG_IDS.has(tacoId);
}

/** Alimentos sugeridos antes de o usuário digitar (ordem de uso comum no Brasil). */
export const FREQUENT_TACO_IDS = [
  3, // Arroz, tipo 1, cozido
  561, // Feijão, carioca, cozido
  53, // Pão, trigo, francês
  488, // Ovo, de galinha, inteiro, cozido
  410, // Frango, peito, sem pele, grelhado
  182, // Banana, prata, crua
  471, // Café, infusão 10%
  222, // Maçã, Fuji, com casca, crua
  226, // Mamão, Papaia, cru
  78, // Alface, crespa, crua
  157, // Tomate, com semente, cru
  448, // Iogurte, natural
  461, // Queijo, minas, frescal
  377, // Carne, bovina, patinho, sem gordura, grelhado
  1, // Arroz, integral, cozido
  533, // Cuscuz, de milho, cozido com sal
];

let cache: Promise<FoodItem[]> | null = null;

/** Carrega a TACO sob demanda (arquivo separado no build, ~13 KB compactado). */
export function loadTacoFoods(): Promise<FoodItem[]> {
  if (!cache) {
    cache = import("./taco.json")
      .then((mod) => {
        const file = (mod.default ?? mod) as unknown as TacoFile;
        return file.foods.map(([id, name, cat, kcal, protein, fat, carbs, fiber, sodium]) => ({
          id: `taco:${id}`,
          source: "taco" as const,
          name,
          category: file.categories[cat] ?? "Outros",
          per100g: { kcal, protein, fat, carbs, fiber, sodium },
          countsAsFruitVeg: tacoCountsAsFruitVeg(id),
        }));
      })
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}

export function customFoodToItem(food: CustomFood): FoodItem {
  return {
    id: `custom:${food.id}`,
    source: "custom",
    name: food.name,
    category: "Meus alimentos",
    per100g: food.per100g,
    countsAsFruitVeg: food.countsAsFruitVeg,
    portion: food.portion,
  };
}

export const EMPTY_NUTRIENTS: Nutrients = {
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
  fiber: null,
  sodium: null,
};
