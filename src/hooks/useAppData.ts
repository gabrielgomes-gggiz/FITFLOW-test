import { useCallback, useEffect, useMemo, useState } from "react";
import { customFoodToItem, FREQUENT_TACO_IDS, loadTacoFoods } from "@/data/foods";
import { estimateEnergy } from "@/services/energy";
import { createFoodIndex, type IndexedFood } from "@/services/foodSearch";
import type { GoalDataContext } from "@/services/goals";
import { estimateWaterGoal } from "@/services/hydration";
import { toStorageError } from "@/storage/db";
import { useAppState } from "@/store/appStore";
import type { DateKey, FoodItem, Profile } from "@/types";
import { useToast } from "@/components/ui/Toast";

/** Perfil ativo. As páginas internas só são renderizadas com um perfil selecionado. */
export function useProfile(): Profile {
  const profile = useAppState((s) => s.profile);
  if (!profile) throw new Error("Nenhum perfil ativo.");
  return profile;
}

export function useEnergy(today: DateKey) {
  const profile = useProfile();
  return useMemo(() => estimateEnergy(profile, today), [profile, today]);
}

export function useWaterGoal() {
  const profile = useProfile();
  return useMemo(() => estimateWaterGoal(profile), [profile]);
}

export function useGoalContext(): GoalDataContext {
  const foodEntries = useAppState((s) => s.data.foodEntries);
  const waterEntries = useAppState((s) => s.data.waterEntries);
  const activityEntries = useAppState((s) => s.data.activityEntries);
  const goalCheckins = useAppState((s) => s.data.goalCheckins);
  const water = useWaterGoal();
  return useMemo(
    () => ({ foodEntries, waterEntries, activityEntries, goalCheckins, waterGoalMl: water.goalMl }),
    [foodEntries, waterEntries, activityEntries, goalCheckins, water.goalMl],
  );
}

export interface FoodCatalog {
  status: "loading" | "ready" | "error";
  items: FoodItem[];
  index: IndexedFood[];
  byId: Map<string, FoodItem>;
  frequent: FoodItem[];
  retry: () => void;
}

/** TACO (carregada sob demanda) + alimentos cadastrados pelo usuário. */
export function useFoodCatalog(): FoodCatalog {
  const customFoods = useAppState((s) => s.data.customFoods);
  const [taco, setTaco] = useState<FoodItem[] | null>(null);
  const [status, setStatus] = useState<FoodCatalog["status"]>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    loadTacoFoods()
      .then((foods) => {
        if (!alive) return;
        setTaco(foods);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return useMemo(() => {
    const custom = customFoods.map(customFoodToItem).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const items = [...custom, ...(taco ?? [])];
    const byId = new Map(items.map((f) => [f.id, f]));
    const frequent = FREQUENT_TACO_IDS.map((id) => byId.get(`taco:${id}`)).filter((f): f is FoodItem => Boolean(f));
    return {
      status,
      items,
      index: createFoodIndex(items, FREQUENT_TACO_IDS.map((id) => `taco:${id}`)),
      byId,
      frequent,
      retry: () => setAttempt((n) => n + 1),
    };
  }, [customFoods, taco, status]);
}

/** Executa uma ação com aviso de sucesso ou de erro. Retorna undefined se falhar. */
export function useRunner() {
  const toast = useToast();
  return useCallback(
    async <T>(
      fn: () => Promise<T>,
      success?: string | ((result: T) => string),
      undo?: (result: T) => (() => Promise<unknown>) | undefined,
    ): Promise<T | undefined> => {
      try {
        const result = await fn();
        if (success) {
          const message = typeof success === "function" ? success(result) : success;
          const undoFn = undo?.(result);
          toast.success(
            message,
            undoFn
              ? {
                  label: "Desfazer",
                  onAction: () => {
                    undoFn().catch((e) => toast.error(toStorageError(e).message));
                  },
                }
              : undefined,
          );
        }
        return result;
      } catch (error) {
        console.error(error);
        toast.error(toStorageError(error).message);
        return undefined;
      }
    },
    [toast],
  );
}
