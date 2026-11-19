import { getModality, getVariant } from "@/data/activities";
import { createDemoDataset } from "@/services/demo";
import { estimateActivityKcal } from "@/services/activity";
import { estimateWaterGoal } from "@/services/hydration";
import type { CustomFoodInput, ProfileInput } from "@/services/validation";
import { StorageError, toStorageError } from "@/storage/db";
import { createIndexedDbRepository, SETTINGS } from "@/storage/repository";
import {
  emptyProfileData,
  type ActivityEntry,
  type CravingLog,
  type CustomFood,
  type DateKey,
  type ExportBundle,
  type FoodEntry,
  type FoodItem,
  type Goal,
  type GoalCheckin,
  type HabitLog,
  type HabitTracker,
  type MealType,
  type Profile,
  type ProfileData,
  type RecordOf,
  type RecordStoreName,
  type TimeOfDay,
  type WaterEntry,
} from "@/types";
import { todayKey } from "@/utils/date";
import { createId, nowIso } from "@/utils/id";
import { getState, setState } from "./appStore";

/**
 * Casos de uso do FitFlow. A interface chama estas funções; elas validam o vínculo com
 * o perfil ativo, gravam no repositório e atualizam o estado a partir do que foi salvo.
 */

const repo = createIndexedDbRepository();

/* --------------------------------------------------- Sincronização entre abas */

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("fitflow-sync") : null;

channel?.addEventListener("message", (event: MessageEvent<{ type: string }>) => {
  if (event.data?.type === "changed") void reloadFromStorage();
});

function broadcast() {
  channel?.postMessage({ type: "changed" });
}

/* ------------------------------------------------------------------ Utilitários */

function activeProfile(): Profile {
  const profile = getState().profile;
  if (!profile) throw new StorageError("Nenhum perfil ativo.", "not_found");
  return profile;
}

function stamped<T extends object>(fields: T): T & { createdAt: string; updatedAt: string } {
  const now = nowIso();
  return { ...fields, createdAt: now, updatedAt: now };
}

async function refresh(stores: RecordStoreName[]): Promise<void> {
  const profile = activeProfile();
  const updates: Partial<ProfileData> = {};
  await Promise.all(
    stores.map(async (store) => {
      (updates as Record<string, unknown>)[store] = await repo.listRecords(store, profile.id);
    }),
  );
  if (getState().profile?.id !== profile.id) return; // o perfil mudou durante a leitura
  setState((s) => ({ data: { ...s.data, ...updates } }));
}

async function save<S extends RecordStoreName>(store: S, record: RecordOf<S>, also: RecordStoreName[] = []): Promise<RecordOf<S>> {
  await repo.saveRecord(store, record);
  await refresh([store, ...also]);
  broadcast();
  return record;
}

async function remove<S extends RecordStoreName>(store: S, id: string): Promise<RecordOf<S> | undefined> {
  const removed = await repo.deleteRecord(store, id, activeProfile().id);
  await refresh([store]);
  broadcast();
  return removed;
}

/** Desfaz uma exclusão gravando o registro de volta (mesmo id). */
export async function restoreRecord<S extends RecordStoreName>(store: S, record: RecordOf<S>): Promise<void> {
  if (record.profileId !== activeProfile().id) throw new StorageError("Registro de outro perfil.", "forbidden");
  await save(store, record);
}

function findRecord<S extends RecordStoreName>(store: S, id: string): RecordOf<S> {
  const record = (getState().data[store] as RecordOf<S>[]).find((r) => r.id === id);
  if (!record) throw new StorageError("Registro não encontrado. Ele pode ter sido excluído em outra aba.", "not_found");
  return record;
}

/* ---------------------------------------------------------------- Inicialização */

export async function bootstrap(): Promise<void> {
  setState({ status: "loading", error: null });
  try {
    let profiles = await repo.listProfiles();
    if (!profiles.some((p) => p.isDemo)) {
      const { profile, data } = await createDemoDataset(new Date());
      try {
        await repo.createProfileWithData(profile, data);
      } catch (error) {
        // Outra aba pode ter criado a demonstração ao mesmo tempo.
        if ((error as StorageError).code !== "unknown") throw error;
      }
      profiles = await repo.listProfiles();
    }
    const activeId = await repo.getSetting<string>(SETTINGS.activeProfileId);
    const profile = profiles.find((p) => p.id === activeId) ?? null;
    const data = profile ? await repo.loadProfileData(profile.id) : emptyProfileData();
    setState({ status: "ready", error: null, profiles, profile, data });
  } catch (error) {
    setState({ status: "error", error: toStorageError(error).message });
  }
}

/** Relê tudo do banco (usado quando outra aba altera os dados). */
export async function reloadFromStorage(): Promise<void> {
  try {
    const profiles = await repo.listProfiles();
    const activeId = await repo.getSetting<string>(SETTINGS.activeProfileId);
    const profile = profiles.find((p) => p.id === activeId) ?? null;
    const data = profile ? await repo.loadProfileData(profile.id) : emptyProfileData();
    setState({ profiles, profile, data });
  } catch (error) {
    console.error("FitFlow: falha ao sincronizar com outra aba", error);
  }
}

/* ---------------------------------------------------------------------- Perfis */

async function activate(profileId: string | null): Promise<void> {
  if (profileId) await repo.setSetting(SETTINGS.activeProfileId, profileId);
  const profiles = await repo.listProfiles();
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const data = profile ? await repo.loadProfileData(profile.id) : emptyProfileData();
  setState({ profiles, profile, data });
  broadcast();
}

export async function enterDemo(): Promise<void> {
  let demo = (await repo.listProfiles()).find((p) => p.isDemo);
  if (!demo) {
    const { profile, data } = await createDemoDataset(new Date());
    await repo.createProfileWithData(profile, data);
    demo = profile;
  }
  await activate(demo.id);
}

export async function switchProfile(profileId: string): Promise<void> {
  if (!(await repo.getProfile(profileId))) throw new StorageError("Perfil não encontrado.", "not_found");
  await activate(profileId);
}

/** Leva à tela de boas-vindas sem apagar nada (para trocar de perfil ou criar outro). */
export async function leaveProfile(): Promise<void> {
  await repo.setSetting(SETTINGS.activeProfileId, null);
  await activate(null);
}

function initialGoals(profile: Profile): Goal[] {
  const today = todayKey();
  const make = (fields: Omit<Goal, "id" | "profileId" | "createdAt" | "updatedAt" | "startDate" | "status">): Goal =>
    stamped({ id: createId(), profileId: profile.id, startDate: today, status: "active" as const, ...fields });
  const goals: Goal[] = [];
  const habits = new Set(profile.trackedHabits);
  if (habits.has("water")) {
    goals.push(
      make({
        title: "Beber água ao longo do dia",
        metric: "water_ml",
        period: "daily",
        target: estimateWaterGoal(profile).goalMl,
        unit: "ml",
        linkedTo: "waterGoal",
      }),
    );
  }
  if (habits.has("activity")) {
    goals.push(make({ title: "150 minutos de atividade na semana", metric: "who_minutes", period: "weekly", target: 150, unit: "min" }));
  }
  if (habits.has("food")) {
    goals.push(make({ title: "400 g de frutas, legumes e verduras", metric: "fruit_veg_g", period: "daily", target: 400, unit: "g" }));
  }
  if (habits.has("sleep")) {
    goals.push(make({ title: "Dormir 7 horas ou mais", metric: "custom", period: "daily", target: 7, unit: "h", customKind: "amount" }));
  }
  return goals;
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  const today = todayKey();
  const profile: Profile = stamped({
    id: createId(),
    isDemo: false,
    name: input.name,
    birthDate: input.birthDate,
    ageYears: input.ageYears,
    ageRecordedOn: input.ageYears !== undefined ? today : undefined,
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    activityLevel: input.activityLevel,
    objective: input.objective,
    trackedHabits: input.trackedHabits,
  });
  await repo.createProfileWithData(profile, { ...emptyProfileData(), goals: initialGoals(profile) });
  await activate(profile.id);
  return profile;
}

export async function updateProfile(patch: Partial<Omit<Profile, "id" | "isDemo" | "createdAt">>): Promise<Profile> {
  const current = activeProfile();
  const next: Profile = { ...current, ...patch, id: current.id, isDemo: current.isDemo, updatedAt: nowIso() };
  // Remove chaves explicitamente indefinidas (ex.: apagar a meta manual).
  for (const key of Object.keys(next) as (keyof Profile)[]) if (next[key] === undefined) delete next[key];
  if (patch.ageYears !== undefined && patch.ageYears !== current.ageYears) next.ageRecordedOn = todayKey();
  await repo.saveProfile(next);
  const profiles = await repo.listProfiles();
  setState({ profiles, profile: next });
  broadcast();
  return next;
}

export async function updateProfileFromInput(input: ProfileInput): Promise<Profile> {
  return updateProfile({
    name: input.name,
    birthDate: input.birthDate,
    ageYears: input.ageYears,
    sex: input.sex,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    activityLevel: input.activityLevel,
    objective: input.objective,
    trackedHabits: input.trackedHabits,
  });
}

/** Exclui o perfil ativo e todos os seus registros (exclusão definitiva). */
export async function deleteActiveProfile(): Promise<void> {
  const profile = activeProfile();
  await repo.deleteProfile(profile.id);
  await activate(null);
}

/** Apaga todos os dados do FitFlow neste navegador e recria apenas a demonstração. */
export async function wipeAllData(): Promise<void> {
  await repo.clearAll();
  broadcast();
  await bootstrap();
}

/**
 * Restaura a demonstração. Só funciona com o perfil de demonstração ativo; a camada de
 * armazenamento também recusa qualquer perfil pessoal.
 */
export async function resetDemo(): Promise<void> {
  const profile = activeProfile();
  if (!profile.isDemo) throw new StorageError("A restauração só vale para o perfil de demonstração.", "forbidden");
  const fresh = await createDemoDataset(new Date());
  await repo.replaceDemoProfile(fresh.profile, fresh.data);
  await activate(fresh.profile.id);
}

export function exportActiveProfile(): ExportBundle {
  const { profile, data } = getState();
  if (!profile) throw new StorageError("Nenhum perfil ativo.", "not_found");
  return { app: "FitFlow", format: 1, exportedAt: nowIso(), profile, data };
}

/* ------------------------------------------------------------------ Alimentação */

export interface FoodEntryInput {
  quantityG: number;
  mealType: MealType;
  date: DateKey;
  time: TimeOfDay;
}

export async function addFoodEntry(food: FoodItem, input: FoodEntryInput): Promise<FoodEntry> {
  const profile = activeProfile();
  return save(
    "foodEntries",
    stamped({
      id: createId(),
      profileId: profile.id,
      foodId: food.id,
      source: food.source,
      foodName: food.name,
      per100g: food.per100g,
      countsAsFruitVeg: food.countsAsFruitVeg,
      ...input,
    }),
  );
}

export async function updateFoodEntry(id: string, input: FoodEntryInput): Promise<FoodEntry> {
  const current = findRecord("foodEntries", id);
  return save("foodEntries", { ...current, ...input, updatedAt: nowIso() });
}

export const deleteFoodEntry = (id: string) => remove("foodEntries", id);

export async function saveCustomFood(input: CustomFoodInput, id?: string): Promise<CustomFood> {
  const profile = activeProfile();
  if (id) {
    const current = findRecord("customFoods", id);
    return save("customFoods", { ...current, ...input, updatedAt: nowIso() });
  }
  return save("customFoods", stamped({ id: createId(), profileId: profile.id, ...input }));
}

/** Os registros já feitos guardam uma cópia dos nutrientes e não são afetados. */
export const deleteCustomFood = (id: string) => remove("customFoods", id);

/* ------------------------------------------------------------------- Hidratação */

export async function addWater(input: { amountMl: number; date: DateKey; time: TimeOfDay }): Promise<WaterEntry> {
  return save("waterEntries", stamped({ id: createId(), profileId: activeProfile().id, ...input }));
}

export async function updateWater(id: string, input: { amountMl: number; date: DateKey; time: TimeOfDay }): Promise<WaterEntry> {
  return save("waterEntries", { ...findRecord("waterEntries", id), ...input, updatedAt: nowIso() });
}

export const deleteWater = (id: string) => remove("waterEntries", id);

/* ------------------------------------------------------------------- Atividades */

export interface ActivityInput {
  modalityId: string;
  variantId: string;
  durationMin: number;
  date: DateKey;
  time: TimeOfDay;
}

function buildActivityFields(input: ActivityInput, weightKg: number | undefined) {
  const modality = getModality(input.modalityId);
  const variant = getVariant(input.modalityId, input.variantId);
  if (!modality || !variant) throw new StorageError("Atividade não encontrada no catálogo.", "invalid");
  return {
    ...input,
    name: modality.name,
    variantLabel: variant.label,
    met: variant.met,
    compendiumCode: variant.code,
    kcalEstimated: weightKg ? estimateActivityKcal(variant.met, weightKg, input.durationMin) : null,
    weightKgUsed: weightKg ?? null,
  };
}

export async function addActivity(input: ActivityInput): Promise<ActivityEntry> {
  const profile = activeProfile();
  return save(
    "activityEntries",
    stamped({ id: createId(), profileId: profile.id, ...buildActivityFields(input, profile.weightKg) }),
  );
}

export async function updateActivity(id: string, input: ActivityInput): Promise<ActivityEntry> {
  const current = findRecord("activityEntries", id);
  return save("activityEntries", {
    ...current,
    ...buildActivityFields(input, activeProfile().weightKg ?? current.weightKgUsed ?? undefined),
    updatedAt: nowIso(),
  });
}

export const deleteActivity = (id: string) => remove("activityEntries", id);

/* ------------------------------------------------------------------------ Metas */

export type GoalInput = Pick<Goal, "title" | "metric" | "period" | "target" | "unit" | "customKind" | "linkedTo">;

export async function createGoal(input: GoalInput): Promise<Goal> {
  const profile = activeProfile();
  return save("goals", stamped({ id: createId(), profileId: profile.id, startDate: todayKey(), status: "active" as const, ...input }));
}

export async function updateGoal(id: string, patch: Partial<GoalInput & Pick<Goal, "status">>): Promise<Goal> {
  return save("goals", { ...findRecord("goals", id), ...patch, updatedAt: nowIso() });
}

/** Exclui a meta e os check-ins dela. */
export async function deleteGoal(id: string): Promise<void> {
  const checkins = getState().data.goalCheckins.filter((c) => c.goalId === id);
  for (const c of checkins) await repo.deleteRecord("goalCheckins", c.id, activeProfile().id);
  await remove("goals", id);
  await refresh(["goalCheckins"]);
}

/** Grava (ou remove, com value null) o check-in de uma meta personalizada num dia. */
export async function setGoalCheckin(goalId: string, date: DateKey, value: number | null): Promise<void> {
  const profile = activeProfile();
  const existing = getState().data.goalCheckins.find((c) => c.goalId === goalId && c.date === date);
  if (value === null) {
    if (existing) await remove("goalCheckins", existing.id);
    return;
  }
  const record: GoalCheckin = existing
    ? { ...existing, value, updatedAt: nowIso() }
    : stamped({ id: createId(), profileId: profile.id, goalId, date, value });
  await save("goalCheckins", record);
}

/* ---------------------------------------------------------- Cigarro e álcool */

export type TrackerInput = Pick<
  HabitTracker,
  "kind" | "mode" | "baselineAmount" | "baselinePeriod" | "limitAmount" | "unitCost" | "startDate" | "motivation"
>;

export async function saveTracker(input: TrackerInput, id?: string): Promise<HabitTracker> {
  const profile = activeProfile();
  if (id) return save("habitTrackers", { ...findRecord("habitTrackers", id), ...input, updatedAt: nowIso() });
  return save("habitTrackers", stamped({ id: createId(), profileId: profile.id, active: true, ...input }));
}

/** Encerra o acompanhamento e apaga registros diários e vontades ligados a ele. */
export async function deleteTracker(id: string): Promise<void> {
  const profile = activeProfile();
  const { habitLogs, cravings } = getState().data;
  for (const l of habitLogs.filter((x) => x.trackerId === id)) await repo.deleteRecord("habitLogs", l.id, profile.id);
  for (const c of cravings.filter((x) => x.trackerId === id)) await repo.deleteRecord("cravings", c.id, profile.id);
  await remove("habitTrackers", id);
  await refresh(["habitLogs", "cravings"]);
}

/** Registra o consumo de um dia (0 = sem consumo). null apaga o registro do dia. */
export async function setHabitLog(trackerId: string, date: DateKey, amount: number | null): Promise<void> {
  const profile = activeProfile();
  const existing = getState().data.habitLogs.find((l) => l.trackerId === trackerId && l.date === date);
  if (amount === null) {
    if (existing) await remove("habitLogs", existing.id);
    return;
  }
  const record: HabitLog = existing
    ? { ...existing, amount, updatedAt: nowIso() }
    : stamped({ id: createId(), profileId: profile.id, trackerId, date, amount });
  await save("habitLogs", record);
}

export async function addCraving(
  trackerId: string,
  input: Pick<CravingLog, "intensity" | "trigger" | "strategy" | "note" | "date" | "time">,
): Promise<CravingLog> {
  return save("cravings", stamped({ id: createId(), profileId: activeProfile().id, trackerId, ...input }));
}

export const deleteCraving = (id: string) => remove("cravings", id);
