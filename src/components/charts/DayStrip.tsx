import { useMemo, useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { MEAL_LABELS, entryKcal } from "@/services/nutrition";
import type { ActivityEntry, FoodEntry, WaterEntry } from "@/types";
import { minutesOfDay } from "@/utils/date";
import { formatKcal, formatMinutes, formatMl } from "@/utils/format";

/**
 * "Seu dia": linha do tempo das 5h à meia-noite com três faixas — refeições, água e
 * movimento. Mostra quando cada coisa aconteceu, não só quanto.
 * Cores do modo escuro validadas contra a superfície tinta (contraste ≥ 3:1, ΔE ≥ 9).
 */

const START = 5 * 60;
const END = 24 * 60;
const LANE_H = 30;
const COLORS = { food: "#d95926", water: "#3987e5", move: "#199e70" };

interface Mark {
  id: string;
  lane: 0 | 1 | 2;
  start: number;
  end?: number;
  r?: number;
  text: string;
}

export function DayStrip({
  foods,
  water,
  activities,
  nowMinutes,
}: {
  foods: FoodEntry[];
  water: WaterEntry[];
  activities: ActivityEntry[];
  /** Minutos desde 0h, quando o dia exibido é hoje. */
  nowMinutes: number | null;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>(300);
  const [active, setActive] = useState<string | null>(null);

  const marks = useMemo<Mark[]>(() => {
    const meals = new Map<string, FoodEntry[]>();
    for (const f of foods) {
      const key = `${f.mealType}-${f.time}`;
      meals.set(key, [...(meals.get(key) ?? []), f]);
    }
    const list: Mark[] = [];
    for (const [key, items] of meals) {
      const kcal = items.reduce((s, e) => s + entryKcal(e), 0);
      list.push({
        id: `f-${key}`,
        lane: 0,
        start: minutesOfDay(items[0].time),
        r: 5.5,
        text: `${MEAL_LABELS[items[0].mealType]} às ${items[0].time}, ${formatKcal(kcal)}`,
      });
    }
    for (const w of water) {
      list.push({ id: `w-${w.id}`, lane: 1, start: minutesOfDay(w.time), r: Math.min(6, 3.2 + w.amountMl / 200), text: `Água às ${w.time}, ${formatMl(w.amountMl)}` });
    }
    for (const a of activities) {
      const start = minutesOfDay(a.time);
      list.push({ id: `a-${a.id}`, lane: 2, start, end: start + a.durationMin, text: `${a.name} às ${a.time}, ${formatMinutes(a.durationMin)}` });
    }
    return list;
  }, [foods, water, activities]);

  const labelW = 0;
  const padX = 8;
  const plotW = Math.max(160, width - labelW - padX * 2);
  const x = (m: number) => labelW + padX + ((Math.min(END, Math.max(START, m)) - START) / (END - START)) * plotW;
  const height = LANE_H * 3 + 26;
  const laneY = (lane: number) => lane * LANE_H + LANE_H / 2;
  const hours = [6, 9, 12, 15, 18, 21, 24];
  const activeMark = marks.find((m) => m.id === active) ?? null;

  const summaryParts = [
    `${new Set(foods.map((f) => `${f.mealType}-${f.time}`)).size} refeições`,
    `${water.length} registros de água`,
    `${activities.length} atividades`,
  ];

  return (
    <div>
      <div ref={ref} className="relative w-full min-w-0" style={{ height }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Linha do dia: ${summaryParts.join(", ")}.`}
          className="absolute inset-0 block overflow-visible"
        >
          {[0, 1, 2].map((lane) => (
            <line
              key={lane}
              x1={x(START)}
              x2={x(END)}
              y1={laneY(lane)}
              y2={laneY(lane)}
              stroke="rgb(255 255 255 / 0.14)"
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
          {hours.map((h) => (
            <g key={h}>
              <line x1={x(h * 60)} x2={x(h * 60)} y1={4} y2={LANE_H * 3 - 4} stroke="rgb(255 255 255 / 0.08)" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={x(h * 60)} y={height - 6} textAnchor="middle" className="fill-on-ink-muted text-[11px]">
                {h === 24 ? "0h" : `${h}h`}
              </text>
            </g>
          ))}
          {nowMinutes !== null && nowMinutes >= START && (
            <g>
              <line x1={x(nowMinutes)} x2={x(nowMinutes)} y1={0} y2={LANE_H * 3} stroke="var(--color-lime)" strokeWidth={2} />
              <circle cx={x(nowMinutes)} cy={0} r={3} fill="var(--color-lime)" />
            </g>
          )}
          {marks.map((m) => {
            const color = m.lane === 0 ? COLORS.food : m.lane === 1 ? COLORS.water : COLORS.move;
            const isActive = active === m.id;
            const cy = laneY(m.lane);
            const common = {
              onPointerEnter: () => setActive(m.id),
              onPointerDown: () => setActive(m.id),
              style: { cursor: "pointer" },
            };
            if (m.end !== undefined) {
              const x1 = x(m.start);
              const w = Math.max(8, x(m.end) - x1);
              return (
                <g key={m.id} {...common}>
                  <rect x={x1 - 4} y={cy - 12} width={w + 8} height={24} fill="transparent" />
                  <rect x={x1} y={cy - 5} width={w} height={10} rx={5} fill={color} stroke="#12303a" strokeWidth={2} opacity={active && !isActive ? 0.6 : 1} />
                </g>
              );
            }
            return (
              <g key={m.id} {...common}>
                <circle cx={x(m.start)} cy={cy} r={12} fill="transparent" />
                <circle cx={x(m.start)} cy={cy} r={(m.r ?? 5) + (isActive ? 1.5 : 0)} fill={color} stroke="#12303a" strokeWidth={2} opacity={active && !isActive ? 0.6 : 1} />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 min-h-6 text-sm text-on-ink-muted" aria-live="polite">
        {activeMark ? <span className="font-bold text-white">{activeMark.text}</span> : marks.length ? "Toque nos pontos para ver os detalhes." : "Nenhum registro neste dia ainda."}
      </p>
    </div>
  );
}

export const DAY_STRIP_LANES = [
  { label: "Refeições", color: COLORS.food },
  { label: "Água", color: COLORS.water },
  { label: "Movimento", color: COLORS.move },
];
