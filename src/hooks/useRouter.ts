import { useSyncExternalStore, type MouseEvent } from "react";

/**
 * Roteador mínimo com a History API (sem dependências). Funciona em hospedagem estática
 * porque a Vercel reescreve qualquer rota para index.html (veja vercel.json).
 */

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export const ROUTES = {
  home: "/",
  food: "/refeicoes",
  water: "/agua",
  activity: "/atividades",
  goals: "/metas",
  habits: "/habitos",
  history: "/historico",
  profile: "/perfil",
  about: "/sobre",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", notify);
}

function currentLocation(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname.startsWith(BASE) ? window.location.pathname.slice(BASE.length) || "/" : window.location.pathname;
  return `${path}${window.location.search}`;
}

let snapshot = currentLocation();

function getSnapshot() {
  const next = currentLocation();
  if (next !== snapshot) snapshot = next;
  return snapshot;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const url = `${BASE}${to}`;
  if (options.replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  notify();
  if (!options.replace) window.scrollTo({ top: 0 });
}

export function useLocation(): { path: string; query: URLSearchParams } {
  const location = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    getSnapshot,
  );
  const [path, search = ""] = location.split("?");
  return { path: path.replace(/\/+$/, "") || "/", query: new URLSearchParams(search) };
}

/** Handler para <a href> internos: navega sem recarregar, mas mantém Ctrl+clique etc. */
export function linkHandler(to: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
}

export function href(to: string): string {
  return `${BASE}${to}`;
}
