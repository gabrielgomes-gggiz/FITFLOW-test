import type { HTMLAttributes, ReactNode } from "react";

/** Superfície branca com borda fina. Sombra fica reservada para camadas flutuantes. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "li"; children: ReactNode }) {
  return (
    <Tag className={`rounded-[var(--radius-card)] border border-line bg-white p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Heading id={id} className="text-lg font-bold text-ink">
          {title}
        </Heading>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "water" | "food" | "move" | "habit" | "lime" }) {
  const tones = {
    neutral: "bg-mist text-ink-2",
    ok: "bg-ok-soft text-ok",
    water: "bg-water-soft text-water-ink",
    food: "bg-food-soft text-food-ink",
    move: "bg-move-soft text-move-ink",
    habit: "bg-habit-soft text-habit-ink",
    lime: "bg-lime text-ink",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}
