import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "soft" | "danger" | "lime";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#0c2129] active:bg-[#0a1c23]",
  secondary: "bg-white text-ink border border-line hover:border-field",
  ghost: "text-ink hover:bg-ink/[0.06]",
  soft: "bg-mist text-ink hover:bg-line/70",
  danger: "bg-danger text-white hover:bg-[#99190f]",
  lime: "bg-lime text-ink hover:bg-[#bbe85a]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-[0.95rem] gap-2",
  lg: "min-h-12 px-5 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  full?: boolean;
  busy?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  full,
  busy,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex select-none items-center justify-center rounded-[var(--radius-control)] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 17 : 19} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 17 : 19} />}
    </button>
  );
}

/** Botão só com ícone; o rótulo vai para leitores de tela e para a dica. */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  className = "",
  size = 20,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { icon: IconName; label: string; variant?: Variant; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-grid size-11 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40 ${variants[variant]} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
