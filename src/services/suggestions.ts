import { WHO_WEEKLY_MIN } from "./activity";
import { DAILY_REFERENCES } from "./nutrition";
import { formatMinutes, formatNumber, formatPercent } from "@/utils/format";

/**
 * Sugestões de pequenas ações, geradas por regras simples a partir dos registros do dia.
 * Linguagem de convite, nunca de cobrança. Mostramos poucas de cada vez.
 */

export type SuggestionAction =
  | { type: "add_water"; amountMl: number; label: string }
  | { type: "navigate"; to: string; label: string };

export interface Suggestion {
  id: string;
  domain: "water" | "food" | "activity" | "habit" | "general";
  text: string;
  action?: SuggestionAction;
}

export interface SuggestionContext {
  now: Date;
  tracks: { food: boolean; water: boolean; activity: boolean; habit: boolean };
  waterMl: number;
  waterGoalMl: number;
  mealsLogged: number;
  fruitVegG: number;
  activityMinutesToday: number;
  weekModerateMinutes: number;
  habitLoggedToday: boolean;
}

export function buildSuggestions(ctx: SuggestionContext, limit = 2): Suggestion[] {
  const hour = ctx.now.getHours() + ctx.now.getMinutes() / 60;
  const list: Suggestion[] = [];

  if (ctx.tracks.water && ctx.waterGoalMl > 0 && hour >= 9) {
    // Ritmo esperado: meta distribuída entre 7h e 21h.
    const expected = Math.min(1, Math.max(0, (hour - 7) / 14));
    const ratio = ctx.waterMl / ctx.waterGoalMl;
    if (ratio < 1 && ratio < expected - 0.15) {
      list.push({
        id: "water-pace",
        domain: "water",
        text: `Você está em ${formatPercent(ratio)} da meta de água. Um copo agora ajuda a distribuir melhor ao longo do dia.`,
        action: { type: "add_water", amountMl: 200, label: "Adicionar 200 ml" },
      });
    }
  }

  if (ctx.tracks.food && ctx.mealsLogged === 0 && hour >= 10) {
    list.push({
      id: "log-first-meal",
      domain: "food",
      text: "Ainda não há refeições hoje. Registrar o que você comeu mostra sua energia do dia.",
      action: { type: "navigate", to: "/refeicoes", label: "Registrar refeição" },
    });
  } else if (ctx.tracks.food && ctx.fruitVegG < DAILY_REFERENCES.fruitVegG && hour >= 11) {
    list.push({
      id: "fruit-veg",
      domain: "food",
      text: `Hoje foram ${formatNumber(Math.round(ctx.fruitVegG))} g de frutas, legumes e verduras, de 400 g sugeridas pela OMS. Uma fruta no próximo lanche ajuda.`,
      action: { type: "navigate", to: "/refeicoes", label: "Ver refeições" },
    });
  }

  if (ctx.tracks.activity && ctx.weekModerateMinutes < WHO_WEEKLY_MIN && ctx.activityMinutesToday === 0 && hour >= 6 && hour < 22) {
    const missing = WHO_WEEKLY_MIN - ctx.weekModerateMinutes;
    list.push({
      id: "move-week",
      domain: "activity",
      text: `Faltam ${formatMinutes(missing)} para os 150 minutos semanais. Uma caminhada de 10 minutos já entra na conta.`,
      action: { type: "navigate", to: "/atividades", label: "Registrar atividade" },
    });
  }

  if (ctx.tracks.habit && !ctx.habitLoggedToday && hour >= 18) {
    list.push({
      id: "habit-checkin",
      domain: "habit",
      text: "Como foi o dia? Registrar o consumo de hoje, mesmo que seja zero, ajuda a ver sua evolução.",
      action: { type: "navigate", to: "/habitos", label: "Registrar hoje" },
    });
  }

  if (list.length === 0) {
    list.push({
      id: "keep-going",
      domain: "general",
      text: "Seu dia está em dia com os registros. Que tal revisar suas metas para amanhã?",
      action: { type: "navigate", to: "/metas", label: "Ver metas" },
    });
  }

  return list.slice(0, limit);
}
