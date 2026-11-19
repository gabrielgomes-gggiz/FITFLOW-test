import { RECORD_STORES, type RecordStoreName } from "@/types";

/**
 * Banco local do FitFlow (IndexedDB).
 *
 * Estrutura (versão 1):
 * - profiles        chave "id"
 * - settings        chave "key"  (ex.: perfil ativo)
 * - <registros>     chave "id", índice "byProfile" (profileId) e, nos registros com data,
 *                   índice "byProfileDate" ([profileId, date]) para consultas por período.
 *
 * Para evoluir o esquema: aumente DB_VERSION e acrescente um bloco `if (oldVersion < N)`
 * em `migrate`. Os blocos rodam em sequência e nunca apagam dados existentes.
 */

export const DB_NAME = "fitflow";
export const DB_VERSION = 1;

export type StoreName = RecordStoreName | "profiles" | "settings";

const DATED_STORES: readonly RecordStoreName[] = [
  "foodEntries",
  "waterEntries",
  "activityEntries",
  "goalCheckins",
  "habitLogs",
  "cravings",
];

export type StorageErrorCode =
  | "unavailable"
  | "quota"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "unknown";

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(message: string, code: StorageErrorCode, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;
  }
}

/** Converte erros do navegador em mensagens que a interface pode mostrar. */
export function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const name = (error as { name?: string } | null)?.name;
  if (name === "QuotaExceededError") {
    return new StorageError(
      "O navegador está sem espaço para salvar dados. Libere espaço e tente novamente.",
      "quota",
      error,
    );
  }
  if (name === "SecurityError" || name === "InvalidStateError") {
    return new StorageError(
      "O navegador bloqueou o armazenamento local (modo privado ou permissões). Abra o FitFlow em uma janela normal.",
      "unavailable",
      error,
    );
  }
  return new StorageError("Não foi possível acessar os dados salvos neste navegador.", "unknown", error);
}

function migrate(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore("profiles", { keyPath: "id" });
    db.createObjectStore("settings", { keyPath: "key" });
    for (const name of RECORD_STORES) {
      const store = db.createObjectStore(name, { keyPath: "id" });
      store.createIndex("byProfile", "profileId", { unique: false });
      if (DATED_STORES.includes(name)) {
        store.createIndex("byProfileDate", ["profileId", "date"], { unique: false });
      }
    }
  }
  // if (oldVersion < 2) { ...próxima migração... }
}

export function openDatabase(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(
        new StorageError(
          "Este navegador não oferece armazenamento local (IndexedDB). Use uma versão recente do Chrome, Edge, Firefox ou Safari.",
          "unavailable",
        ),
      );
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = factory.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(toStorageError(error));
      return;
    }
    req.onupgradeneeded = (event) => {
      migrate(req.result, event.oldVersion);
    };
    req.onsuccess = () => {
      const db = req.result;
      // Outra aba abriu uma versão mais nova: liberamos a conexão para não bloquear a migração.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(toStorageError(req.error));
    req.onblocked = () => {
      // A conexão antiga de outra aba fecha sozinha (onversionchange); a abertura continua.
      console.warn("FitFlow: aguardando outras abas liberarem o banco local.");
    };
  });
}

export function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toStorageError(req.error));
  });
}

/** Resolve quando a transação é confirmada; rejeita se ela for abortada. */
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(toStorageError(tx.error));
    tx.onerror = () => {
      /* o erro também dispara onabort; tratado lá */
    };
  });
}
