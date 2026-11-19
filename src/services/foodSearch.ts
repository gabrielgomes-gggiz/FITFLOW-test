import type { FoodItem } from "@/types";
import { normalizeText, tokenize } from "@/utils/text";

/**
 * Busca de alimentos tolerante a acentos, maiúsculas, plural e gênero:
 * "maca" encontra "Maçã"; "frango grelhado" encontra "Frango, peito, sem pele, grelhado";
 * "bananas" encontra "Banana". Cada palavra digitada precisa casar com o início de
 * alguma palavra do nome.
 */

export interface IndexedFood {
  item: FoodItem;
  tokens: string[];
  boost: number;
}

/** Variantes de uma palavra digitada: plural e terminação de gênero. */
function variants(token: string): string[] {
  const out = [token];
  let t = token;
  if (t.length >= 4 && t.endsWith("s")) {
    t = t.slice(0, -1);
    out.push(t);
  }
  if (t.length >= 5 && /[aoe]$/.test(t)) out.push(t.slice(0, -1));
  return out;
}

export function createFoodIndex(items: FoodItem[], boostedIds: readonly string[] = []): IndexedFood[] {
  const boosts = new Map(boostedIds.map((id, i) => [id, boostedIds.length - i]));
  return items.map((item) => ({
    item,
    tokens: tokenize(item.name),
    boost: (boosts.get(item.id) ?? 0) / Math.max(1, boostedIds.length),
  }));
}

export function searchFoods(index: IndexedFood[], query: string, limit = 40): FoodItem[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const normalizedQuery = normalizeText(query);

  const scored: { item: FoodItem; score: number }[] = [];
  for (const entry of index) {
    let score = 0;
    let matchedAll = true;
    for (const qt of queryTokens) {
      let best = 0;
      for (const v of variants(qt)) {
        for (const nt of entry.tokens) {
          if (nt === v) best = Math.max(best, v === qt ? 3 : 2.5);
          else if (nt.startsWith(v)) best = Math.max(best, v === qt ? 2 : 1.5);
        }
      }
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }
    if (!matchedAll) continue;
    // O nome começa pelo que foi digitado ("arroz" -> "Arroz, ...").
    if (entry.tokens[0]?.startsWith(queryTokens[0])) score += 2;
    if (normalizeText(entry.item.name).startsWith(normalizedQuery)) score += 1;
    if (entry.item.source === "custom") score += 1.5;
    score += entry.boost * 2;
    // Nomes mais curtos costumam ser o alimento "básico".
    score -= entry.tokens.length * 0.05;
    scored.push({ item: entry.item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "pt-BR"))
    .slice(0, limit)
    .map((s) => s.item);
}
