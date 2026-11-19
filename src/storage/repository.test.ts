import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyProfileData, type Profile, type ProfileData, type WaterEntry } from "@/types";
import { openDatabase, StorageError } from "./db";
import { createIndexedDbRepository, SETTINGS, type FitFlowRepository } from "./repository";

function profile(id: string, isDemo: boolean): Profile {
  return {
    id,
    isDemo,
    name: id,
    sex: "unspecified",
    activityLevel: "light",
    objective: "maintain",
    trackedHabits: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function water(profileId: string, id: string, amountMl = 250): WaterEntry {
  return { id, profileId, date: "2026-11-18", time: "10:00", amountMl, createdAt: "", updatedAt: "" };
}

function dataWith(profileId: string, ...ids: string[]): ProfileData {
  return { ...emptyProfileData(), waterEntries: ids.map((id) => water(profileId, id)) };
}

let factory: IDBFactory;
let repo: FitFlowRepository;

beforeEach(async () => {
  factory = new IDBFactory(); // banco novo e isolado por teste
  repo = createIndexedDbRepository(() => openDatabase(factory));
  await repo.createProfileWithData(profile("demo", true), dataWith("demo", "d1", "d2"));
  await repo.createProfileWithData(profile("pessoal", false), dataWith("pessoal", "p1", "p2", "p3"));
});

describe("repositório IndexedDB", () => {
  it("mantém os registros separados por perfil", async () => {
    expect((await repo.loadProfileData("demo")).waterEntries).toHaveLength(2);
    expect((await repo.loadProfileData("pessoal")).waterEntries).toHaveLength(3);
    expect((await repo.listProfiles()).map((p) => p.id)).toEqual(["demo", "pessoal"]);
  });

  it("os dados sobrevivem a uma nova conexão (recarregar a página)", async () => {
    await repo.saveRecord("waterEntries", water("pessoal", "p4", 500));
    await repo.setSetting(SETTINGS.activeProfileId, "pessoal");
    const reopened = createIndexedDbRepository(() => openDatabase(factory));
    expect((await reopened.loadProfileData("pessoal")).waterEntries).toHaveLength(4);
    expect(await reopened.getSetting(SETTINGS.activeProfileId)).toBe("pessoal");
  });

  it("não grava registros de um perfil inexistente", async () => {
    await expect(repo.saveRecord("waterEntries", water("fantasma", "x"))).rejects.toBeInstanceOf(StorageError);
  });

  it("não permite remover registros de outro perfil", async () => {
    await expect(repo.deleteRecord("waterEntries", "p1", "demo")).rejects.toMatchObject({ code: "forbidden" });
    const removed = await repo.deleteRecord("waterEntries", "p1", "pessoal");
    expect(removed?.id).toBe("p1");
    expect((await repo.loadProfileData("pessoal")).waterEntries).toHaveLength(2);
  });

  it("restaura a demonstração sem tocar no perfil pessoal", async () => {
    const fresh = dataWith("demo", "n1", "n2", "n3", "n4");
    await repo.replaceDemoProfile({ ...profile("demo", true), name: "Demo restaurada" }, fresh);
    const demo = await repo.loadProfileData("demo");
    expect(demo.waterEntries.map((w) => w.id).sort()).toEqual(["n1", "n2", "n3", "n4"]);
    expect((await repo.getProfile("demo"))?.name).toBe("Demo restaurada");
    const pessoal = await repo.loadProfileData("pessoal");
    expect(pessoal.waterEntries.map((w) => w.id).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("recusa restaurar um perfil pessoal, mesmo se chamado por engano", async () => {
    await expect(repo.replaceDemoProfile(profile("pessoal", false), emptyProfileData())).rejects.toMatchObject({ code: "forbidden" });
    await expect(repo.replaceDemoProfile(profile("pessoal", true), emptyProfileData())).rejects.toMatchObject({ code: "forbidden" });
    expect((await repo.loadProfileData("pessoal")).waterEntries).toHaveLength(3);
    expect((await repo.getProfile("pessoal"))?.isDemo).toBe(false);
  });

  it("exclui o perfil e todos os seus registros", async () => {
    await repo.setSetting(SETTINGS.activeProfileId, "pessoal");
    await repo.deleteProfile("pessoal");
    expect(await repo.getProfile("pessoal")).toBeUndefined();
    expect((await repo.loadProfileData("pessoal")).waterEntries).toHaveLength(0);
    expect(await repo.getSetting(SETTINGS.activeProfileId)).toBeUndefined();
    expect((await repo.loadProfileData("demo")).waterEntries).toHaveLength(2);
  });

  it("apaga tudo quando solicitado", async () => {
    await repo.clearAll();
    expect(await repo.listProfiles()).toEqual([]);
  });
});
