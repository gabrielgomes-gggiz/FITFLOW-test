import {
  RECORD_STORES,
  emptyProfileData,
  type Profile,
  type ProfileData,
  type RecordOf,
  type RecordStoreName,
} from "@/types";
import {
  StorageError,
  openDatabase,
  requestToPromise,
  toStorageError,
  transactionDone,
  type StoreName,
} from "./db";

/**
 * Contrato de persistência do FitFlow.
 *
 * A interface não expõe nada específico do IndexedDB: uma versão futura com servidor
 * pode implementar o mesmo contrato (ex.: chamadas HTTP) sem mudar serviços e telas.
 * Todos os registros carregam `profileId`, e toda operação de escrita/remoção confere
 * esse vínculo.
 */
export interface FitFlowRepository {
  listProfiles(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile | undefined>;
  saveProfile(profile: Profile): Promise<void>;
  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting<T>(key: string, value: T): Promise<void>;
  loadProfileData(profileId: string): Promise<ProfileData>;
  listRecords<S extends RecordStoreName>(store: S, profileId: string): Promise<RecordOf<S>[]>;
  saveRecord<S extends RecordStoreName>(store: S, record: RecordOf<S>): Promise<void>;
  /** Remove um registro do perfil indicado e devolve o que foi removido (para "Desfazer"). */
  deleteRecord<S extends RecordStoreName>(store: S, id: string, profileId: string): Promise<RecordOf<S> | undefined>;
  /** Cria um perfil já com registros, numa única transação. */
  createProfileWithData(profile: Profile, data: ProfileData): Promise<void>;
  /**
   * Substitui todos os registros de um perfil de demonstração (restauração).
   * Recusa qualquer perfil que não seja de demonstração.
   */
  replaceDemoProfile(profile: Profile, data: ProfileData): Promise<void>;
  /** Exclui o perfil e todos os seus registros (exclusão em cascata, atômica). */
  deleteProfile(profileId: string): Promise<void>;
  /** Apaga todo o banco local do FitFlow. */
  clearAll(): Promise<void>;
}

export const SETTINGS = {
  activeProfileId: "activeProfileId",
} as const;

interface SettingRow<T> {
  key: string;
  value: T;
}

/** Ordem estável: data de criação e, em empates, id. */
function byCreation<T extends { createdAt?: string; id: string }>(rows: T[]): T[] {
  return rows.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id));
}

function assertOwnership(profileId: string, data: ProfileData): void {
  for (const store of RECORD_STORES) {
    for (const record of data[store]) {
      if (record.profileId !== profileId) {
        throw new StorageError("Registro associado a outro perfil.", "invalid");
      }
    }
  }
}

/** Agenda a remoção de todos os registros do perfil em `stores` (dentro da transação `tx`). */
function scheduleProfileWipe(tx: IDBTransaction, profileId: string, then?: (store: RecordStoreName) => void) {
  for (const name of RECORD_STORES) {
    const store = tx.objectStore(name);
    const keysReq = store.index("byProfile").getAllKeys(IDBKeyRange.only(profileId));
    keysReq.onsuccess = () => {
      for (const key of keysReq.result) store.delete(key);
      // As inclusões só são agendadas depois das remoções, então nunca são apagadas por engano.
      then?.(name);
    };
  }
}

export function createIndexedDbRepository(
  open: () => Promise<IDBDatabase> = () => openDatabase(),
): FitFlowRepository {
  let dbPromise: Promise<IDBDatabase> | null = null;

  const db = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = open().catch((error) => {
        dbPromise = null; // permite nova tentativa
        throw toStorageError(error);
      });
    }
    return dbPromise;
  };

  async function tx(stores: StoreName | StoreName[], mode: IDBTransactionMode): Promise<IDBTransaction> {
    const conn = await db();
    try {
      return conn.transaction(stores, mode);
    } catch (error) {
      // Conexão fechada por outra aba (versionchange): reabre uma vez.
      dbPromise = null;
      const fresh = await db();
      try {
        return fresh.transaction(stores, mode);
      } catch {
        throw toStorageError(error);
      }
    }
  }

  return {
    async listProfiles() {
      const t = await tx("profiles", "readonly");
      const profiles = await requestToPromise(t.objectStore("profiles").getAll() as IDBRequest<Profile[]>);
      return profiles.sort((a, b) => Number(b.isDemo) - Number(a.isDemo) || a.createdAt.localeCompare(b.createdAt));
    },

    async getProfile(id) {
      const t = await tx("profiles", "readonly");
      return requestToPromise(t.objectStore("profiles").get(id) as IDBRequest<Profile | undefined>);
    },

    async saveProfile(profile) {
      const t = await tx("profiles", "readwrite");
      t.objectStore("profiles").put(profile);
      await transactionDone(t);
    },

    async getSetting<T>(key: string) {
      const t = await tx("settings", "readonly");
      const row = await requestToPromise(
        t.objectStore("settings").get(key) as IDBRequest<SettingRow<T> | undefined>,
      );
      return row?.value;
    },

    async setSetting<T>(key: string, value: T) {
      const t = await tx("settings", "readwrite");
      t.objectStore("settings").put({ key, value } satisfies SettingRow<T>);
      await transactionDone(t);
    },

    async loadProfileData(profileId) {
      const t = await tx([...RECORD_STORES], "readonly");
      const data = emptyProfileData();
      const range = IDBKeyRange.only(profileId);
      await Promise.all(
        RECORD_STORES.map(async (name) => {
          const rows = await requestToPromise(t.objectStore(name).index("byProfile").getAll(range));
          (data[name] as unknown[]) = byCreation(rows as { createdAt?: string; id: string }[]);
        }),
      );
      return data;
    },

    async listRecords(store, profileId) {
      const t = await tx(store, "readonly");
      const rows = await requestToPromise(
        t.objectStore(store).index("byProfile").getAll(IDBKeyRange.only(profileId)) as IDBRequest<RecordOf<typeof store>[]>,
      );
      return byCreation(rows);
    },

    async saveRecord(store, record) {
      const t = await tx([store, "profiles"], "readwrite");
      const profileReq = t.objectStore("profiles").get(record.profileId);
      profileReq.onsuccess = () => {
        if (!profileReq.result) {
          t.abort();
          return;
        }
        t.objectStore(store).put(record);
      };
      try {
        await transactionDone(t);
      } catch (error) {
        if (!profileReq.result) throw new StorageError("Perfil não encontrado.", "not_found");
        throw error;
      }
    },

    async deleteRecord(store, id, profileId) {
      const t = await tx(store, "readwrite");
      const objectStore = t.objectStore(store);
      let removed: RecordOf<typeof store> | undefined;
      let forbidden = false;
      const getReq = objectStore.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as RecordOf<typeof store> | undefined;
        if (!existing) return;
        if (existing.profileId !== profileId) {
          forbidden = true;
          t.abort();
          return;
        }
        removed = existing;
        objectStore.delete(id);
      };
      try {
        await transactionDone(t);
      } catch (error) {
        if (forbidden) throw new StorageError("Este registro pertence a outro perfil.", "forbidden");
        throw error;
      }
      return removed;
    },

    async createProfileWithData(profile, data) {
      assertOwnership(profile.id, data);
      const t = await tx(["profiles", ...RECORD_STORES], "readwrite");
      t.objectStore("profiles").add(profile);
      for (const name of RECORD_STORES) {
        const store = t.objectStore(name);
        for (const record of data[name]) store.put(record);
      }
      await transactionDone(t);
    },

    async replaceDemoProfile(profile, data) {
      if (!profile.isDemo) {
        throw new StorageError("A restauração só pode ser aplicada ao perfil de demonstração.", "forbidden");
      }
      assertOwnership(profile.id, data);
      const t = await tx(["profiles", ...RECORD_STORES], "readwrite");
      let refused = false;
      const profileReq = t.objectStore("profiles").get(profile.id);
      profileReq.onsuccess = () => {
        const stored = profileReq.result as Profile | undefined;
        // Proteção em profundidade: nunca apaga dados de um perfil pessoal.
        if (stored && !stored.isDemo) {
          refused = true;
          t.abort();
          return;
        }
        t.objectStore("profiles").put(profile);
        scheduleProfileWipe(t, profile.id, (name) => {
          const store = t.objectStore(name);
          for (const record of data[name]) store.put(record);
        });
      };
      try {
        await transactionDone(t);
      } catch (error) {
        if (refused) {
          throw new StorageError("A restauração só pode ser aplicada ao perfil de demonstração.", "forbidden");
        }
        throw error;
      }
    },

    async deleteProfile(profileId) {
      const t = await tx(["profiles", "settings", ...RECORD_STORES], "readwrite");
      scheduleProfileWipe(t, profileId);
      t.objectStore("profiles").delete(profileId);
      const activeReq = t.objectStore("settings").get(SETTINGS.activeProfileId);
      activeReq.onsuccess = () => {
        const row = activeReq.result as SettingRow<string> | undefined;
        if (row?.value === profileId) t.objectStore("settings").delete(SETTINGS.activeProfileId);
      };
      await transactionDone(t);
    },

    async clearAll() {
      const t = await tx(["profiles", "settings", ...RECORD_STORES], "readwrite");
      for (const name of ["profiles", "settings", ...RECORD_STORES] as StoreName[]) {
        t.objectStore(name).clear();
      }
      await transactionDone(t);
    },
  };
}
