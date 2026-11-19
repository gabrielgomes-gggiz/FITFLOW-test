import { useSyncExternalStore } from "react";
import { emptyProfileData, type Profile, type ProfileData } from "@/types";

/**
 * Estado da aplicação em memória, sempre derivado do IndexedDB.
 * Toda escrita passa pelas ações (actions.ts), que gravam primeiro no banco e depois
 * releem o que foi salvo — os indicadores mostram exatamente o que está persistido.
 */

export interface AppState {
  status: "loading" | "ready" | "error";
  error: string | null;
  profiles: Profile[];
  /** Perfil ativo; null mostra a tela de boas-vindas. */
  profile: Profile | null;
  data: ProfileData;
}

let state: AppState = {
  status: "loading",
  error: null,
  profiles: [],
  profile: null,
  data: emptyProfileData(),
};

const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((current: AppState) => Partial<AppState>)): void {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lê uma fatia do estado. O seletor deve devolver referências existentes (sem criar objetos). */
export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}
