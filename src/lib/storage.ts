"use client";

import Dexie, { type Table } from "dexie";
import type { PosterProject } from "./types";

export interface DraftRecord {
  id: string;
  name: string;
  updatedAt: string;
  project: PosterProject;
}

export interface DefaultsRecord {
  id: "organisation";
  project: PosterProject;
  updatedAt: string;
}

class PosterDatabase extends Dexie {
  drafts!: Table<DraftRecord, string>;
  defaults!: Table<DefaultsRecord, string>;

  constructor() {
    super("candidatePosterGenerator");
    this.version(1).stores({
      drafts: "id, name, updatedAt",
      defaults: "id, updatedAt"
    });
  }
}

export const db = typeof window === "undefined" ? undefined : new PosterDatabase();

export async function saveDraft(project: PosterProject, name = project.name): Promise<void> {
  if (!db) return;
  const updated = { ...project, name, updatedAt: new Date().toISOString() };
  await db.drafts.put({ id: updated.id, name: updated.name, updatedAt: updated.updatedAt, project: updated });
}

export async function listDrafts(): Promise<DraftRecord[]> {
  if (!db) return [];
  return db.drafts.orderBy("updatedAt").reverse().toArray();
}

export async function deleteDraft(id: string): Promise<void> {
  if (!db) return;
  await db.drafts.delete(id);
}

export async function saveDefaults(project: PosterProject): Promise<void> {
  if (!db) return;
  await db.defaults.put({ id: "organisation", project, updatedAt: new Date().toISOString() });
}

export async function loadDefaults(): Promise<PosterProject | undefined> {
  if (!db) return undefined;
  return (await db.defaults.get("organisation"))?.project;
}
