import Dexie, { type Table } from 'dexie';
import type { Cached, RepoInput, Settings, RepoMeta, Pull, Issue, WorkflowRun, Release } from '../types';

class DevPulseDB extends Dexie {
  watchedRepos!: Table<RepoInput>;
  repoCache!: Table<Cached<RepoMeta>>;
  pullCache!: Table<Cached<Pull[]>>;
  issueCache!: Table<Cached<Issue[]>>;
  workflowCache!: Table<Cached<WorkflowRun[]>>;
  releaseCache!: Table<Cached<Release[]>>;
  settings!: Table<Settings>;

  constructor() {
    super('devpulse');
    this.version(1).stores({
      watchedRepos: '++id,&fullName,pinned,sortOrder',
      repoCache: '&fullName,fetchedAt,expiresAt',
      pullCache: '&fullName,fetchedAt,expiresAt',
      issueCache: '&fullName,fetchedAt,expiresAt',
      workflowCache: '&fullName,fetchedAt,expiresAt',
      releaseCache: '&fullName,fetchedAt,expiresAt',
      settings: '&id',
    });
  }
}

export const db = new DevPulseDB();
export const defaults: Settings = { id: 'main', theme: 'dark', refreshInterval: 0, cacheTtl: 5 * 60 * 1000, compact: false };

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? defaults;
}

export async function ensureSettings(): Promise<void> {
  if (!(await db.settings.get('main'))) await db.settings.put(defaults);
}

export async function cacheGet<T>(table: Table<Cached<T>>, fullName: string): Promise<Cached<T> | undefined> {
  return table.get(fullName);
}

export async function cachePut<T>(table: Table<Cached<T>>, fullName: string, payload: T, etag?: string, ttl = 300_000): Promise<void> {
  await table.put({ fullName, payload, fetchedAt: Date.now(), etag, expiresAt: Date.now() + ttl });
}
