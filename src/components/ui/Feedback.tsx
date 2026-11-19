import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Domain = "water" | "food" | "move" | "habit" | "ink";

const fills: Record<Domain, { fill: string; track: string }> = {
  water: { fill: "bg-water", track: "bg-water-soft" },
  food: { fill: "bg-food", track: "bg-food-soft" },
  move: { fill: "bg-move", track: "bg-move-soft" },
  habit: { fill: "bg-habit", track: "bg-habit-soft" },
  ink: { fill: "bg-ink", track: "bg-mist" },
};

/** Barra de progresso de uma razão contra um alvo (trilha em tom claro do mesmo matiz). */
export function Meter({ value, domain, label, thin }: { value: number; domain: Domain; label: string; thin?: boolean }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  const { fill, track } = fills[domain];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={`w-full overflow-hidden rounded-full ${track} ${thin ? "h-1.5" : "h-2.5"}`}
    >
      <div className={`h-full rounded-full ${fill} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-mist text-ink-2">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-3 font-bold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Nota de estimativa: deixa claro que o número não é medição exata. */
export function EstimateNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm text-muted">
      <Icon name="info" size={16} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

export function Notice({ tone = "info", children, icon }: { tone?: "info" | "ok" | "danger" | "habit"; children: ReactNode; icon?: IconName }) {
  const tones = {
    info: "bg-mist text-ink",
    ok: "bg-ok-soft text-ink",
    danger: "bg-danger-soft text-ink",
    habit: "bg-habit-soft text-ink",
  } as const;
  return (
    <div className={`flex items-start gap-3 rounded-2xl p-3.5 text-sm ${tones[tone]}`}>
      <Icon name={icon ?? (tone === "danger" ? "info" : tone === "ok" ? "check" : "info")} size={18} className="mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
