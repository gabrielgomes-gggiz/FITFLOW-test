import { useId, useState, type KeyboardEvent } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import type { Domain } from "@/components/ui/Feedback";

export interface BarDatum {
  key: string;
  /** Rótulo curto no eixo (ex.: "qua"). */
  label: string;
  /** Rótulo completo para dica e tabela (ex.: "quarta, 18 nov"). */
  fullLabel: string;
  /** null = sem registro naquele dia (não é zero). */
  value: number | null;
}

const COLORS: Record<Exclude<Domain, "ink">, string> = {
  water: "var(--color-water)",
  food: "var(--color-food)",
  move: "var(--color-move)",
  habit: "var(--color-habit)",
};

function niceStep(max: number, ticks = 3): number {
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

/**
 * Colunas de uma única série, na cor do domínio. Segue as regras de visualização:
 * colunas finas (≤ 24 px) com topo arredondado, linha de meta, grade discreta,
 * dica por coluna (mouse, toque e teclado) e tabela equivalente.
 */
export function BarChart({
  title,
  data,
  domain,
  format,
  formatAxis = format,
  target,
  targetLabel,
  height = 168,
}: {
  title: string;
  data: BarDatum[];
  domain: Exclude<Domain, "ink">;
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  target?: number | null;
  targetLabel?: string;
  height?: number;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  const axisW = 44;
  const topPad = 22;
  const bottomPad = 26;
  const plotW = Math.max(120, width - axisW);
  const plotH = height - topPad - bottomPad;
  const values = data.map((d) => d.value ?? 0);
  const rawMax = Math.max(1, ...values, target ?? 0);
  const step = niceStep(rawMax * 1.05);
  const yMax = Math.ceil((rawMax * 1.05) / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => topPad + plotH - (v / yMax) * plotH;

  const slot = plotW / data.length;
  const barW = Math.max(3, Math.min(24, slot - 2));
  const color = COLORS[domain];
  const lastIndex = data.length - 1;
  // Rótulos do eixo com pelo menos ~34 px entre si, contados a partir do último dia.
  const labelEvery = Math.max(1, Math.ceil(34 / slot));
  const shown = active ?? null;

  const recorded = data.filter((d) => d.value !== null);
  const summary = recorded.length
    ? `${title}. ${recorded.length} de ${data.length} dias com registro. Maior valor: ${format(Math.max(...recorded.map((d) => d.value ?? 0)))}.`
    : `${title}. Nenhum registro no período.`;

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setActive((i) => Math.min(lastIndex, (i ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? data.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const tip = shown !== null ? data[shown] : null;
  const tipX = shown !== null ? axisW + slot * shown + slot / 2 : 0;

  return (
    <figure className="m-0">
      {/* O SVG fica fora do fluxo (absolute) para nunca empurrar a largura do cartão. */}
      <div ref={wrapRef} className="relative w-full min-w-0 select-none" style={{ height }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${summary} Use as setas para ver cada dia.`}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={(e) => {
            // No toque, "leave" dispara ao soltar o dedo: a dica fica até tocar fora.
            if (e.pointerType === "mouse") setActive(null);
          }}
          className="absolute inset-0 block overflow-visible rounded-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-water"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={axisW} x2={width} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#b8c6c2" : "#e4ebe8"} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={axisW - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">
                {formatAxis(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = axisW + slot * i + slot / 2;
            const v = d.value;
            const h = v === null ? 0 : Math.max(v > 0 ? 2 : 0, (v / yMax) * plotH);
            const x = cx - barW / 2;
            const top = topPad + plotH - h;
            const r = Math.min(4, barW / 2, h);
            const isActive = shown === i;
            return (
              <g key={d.key}>
                {v !== null && h > 0 && (
                  <path
                    className="bar-mark"
                    d={`M${x},${topPad + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${topPad + plotH} Z`}
                    fill={color}
                    opacity={shown === null || isActive ? 1 : 0.55}
                  />
                )}
                {(lastIndex - i) % labelEvery === 0 && (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    className={`text-[11px] ${i === lastIndex ? "fill-ink font-bold" : "fill-muted"}`}
                  >
                    {d.label}
                  </text>
                )}
                {/* Área de toque maior que a coluna */}
                <rect
                  x={axisW + slot * i}
                  y={topPad - 8}
                  width={slot}
                  height={plotH + 8}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                />
              </g>
            );
          })}

          {/* Rótulo direto só no último dia (hoje), quando não há dica aberta */}
          {shown === null && data[lastIndex]?.value !== null && data[lastIndex] && (
            <text
              x={Math.min(axisW + slot * lastIndex + slot / 2, width - format(data[lastIndex].value ?? 0).length * 3.4)}
              y={y(data[lastIndex].value ?? 0) - 7}
              textAnchor="middle"
              paintOrder="stroke"
              stroke="#fff"
              strokeWidth={4}
              strokeLinejoin="round"
              className="tabular fill-ink text-[11px] font-bold"
            >
              {format(data[lastIndex].value ?? 0)}
            </text>
          )}

          {target ? (
            <g pointerEvents="none">
              <line x1={axisW} x2={width} y1={y(target)} y2={y(target)} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="5 4" />
              {/* Rótulo à esquerda, com contorno branco para não brigar com as colunas */}
              <text
                x={axisW + 4}
                y={y(target) - 6}
                textAnchor="start"
                paintOrder="stroke"
                stroke="#fff"
                strokeWidth={4}
                strokeLinejoin="round"
                className="fill-ink text-[11px] font-bold"
              >
                {targetLabel ?? "meta"}
              </text>
            </g>
          ) : null}
        </svg>

        {tip && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-white shadow-[var(--shadow-float)]"
            style={{ left: Math.min(Math.max(tipX, 70), width - 70) }}
            aria-hidden="true"
          >
            <span className="block font-bold">{tip.value === null ? "Sem registro" : format(tip.value)}</span>
            <span className="block text-xs text-on-ink-muted">{tip.fullLabel}</span>
          </div>
        )}
      </div>
      <figcaption className="mt-2">
        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((v) => !v)}
          className="rounded-lg text-sm font-bold text-ink-2 underline decoration-line decoration-2 underline-offset-4 hover:text-ink"
        >
          {showTable ? "Ocultar tabela" : "Ver dados em tabela"}
        </button>
      </figcaption>
      {showTable && (
        <div id={tableId} className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-mist text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-bold">Dia</th>
                <th scope="col" className="px-3 py-2 text-right font-bold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.key} className="border-t border-line">
                  <td className="px-3 py-2">{d.fullLabel}</td>
                  <td className="tabular px-3 py-2 text-right">{d.value === null ? <span className="text-muted">sem registro</span> : format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
