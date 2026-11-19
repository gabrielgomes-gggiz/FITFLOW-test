import type { ReactNode } from "react";

/** Ícones de traço (24×24). Sempre decorativos: o texto ao lado carrega o significado. */
const paths = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9.5 20v-6h5v6" />
    </>
  ),
  food: (
    <>
      <path d="M12 8c-3-3-8-1.5-8 4 0 5 4 9 6.5 9 1 0 1-.5 1.5-.5s.5.5 1.5.5C16 21 20 17 20 12c0-5.5-5-7-8-4Z" />
      <path d="M12 8c0-3 2-5 5-5" />
    </>
  ),
  water: <path d="M12 3S5.5 10 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10 12 3 12 3Z" />,
  activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V6M17 16v-8" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-4-3-7-8-7 0 4 3 7 8 7ZM12 11c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  flame: (
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3.5 0-3 0-6 1-9Z" />
  ),
  walk: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="m9 21 2-6.5-2-3 1.5-4.5 4 3.5h3M11 14.5l3.5 2 1 4.5M8.5 9 6 12.5" />
    </>
  ),
  run: (
    <>
      <circle cx="15" cy="4" r="2" />
      <path d="m5 12 4-2 3-4 4 3 3 1M12 10l-2 5-5 2M10 15l4 2 2 5" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="m6 17 3.5-7h4.5l4 7M9.5 10 13 17M8 6.5h3M14 10l1-3.5h2.5" />
    </>
  ),
  dumbbell: <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />,
  bolt: <path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" />,
  lotus: (
    <>
      <path d="M12 20c-4 0-8-2-9-6 3 0 6 1 9 4 3-3 6-4 9-4-1 4-5 6-9 6Z" />
      <path d="M12 18c-2-2-3-5-3-8 1 .5 2 1.5 3 3 1-1.5 2-2.5 3-3 0 3-1 6-3 8Z" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 4 3-1.5 4.5h-5L8 10Z" />
      <path d="M12 3v4M21 10.5l-5-.5M18 19l-3.5-4.5M6 19l3.5-4.5M3 10.5l5-.5" />
    </>
  ),
  glove: (
    <>
      <path d="M7 11V7a4 4 0 0 1 4-4h2a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5h-3a3 3 0 0 1-3-3" />
      <path d="M7 11a2.5 2.5 0 0 0 0 5h2M7 18v3h9v-3" />
    </>
  ),
  stairs: <path d="M3 20h5v-4h4v-4h4V8h5" />,
  mountain: (
    <>
      <path d="m3 20 6.5-11 4 6.5 2-3L21 20Z" />
      <path d="m8 11 1.5 1.5L11 11" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
      <path d="M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
      <path d="m18.5 15 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Z" />
      <path d="M4 7V6a2 2 0 0 1 2-2h10v3M16 13.5h.01" />
    </>
  ),
  swap: (
    <>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  wave: (
    <path d="M3 9c2 0 2-2 4.5-2S10 9 12 9s2.5-2 4.5-2S19 9 21 9M3 15c2 0 2-2 4.5-2s2.5 2 4.5 2 2.5-2 4.5-2 2.5 2 4.5 2" />
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className = "", strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

/** Ícones das modalidades de atividade. */
export const ACTIVITY_ICONS: Record<string, IconName> = {
  walk: "walk",
  run: "run",
  bike: "bike",
  dumbbell: "dumbbell",
  bolt: "bolt",
  water: "wave",
  lotus: "lotus",
  music: "music",
  ball: "ball",
  glove: "glove",
  stairs: "stairs",
  mountain: "mountain",
  home: "home",
};
