import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cacheGet, cachePut, db, defaults, ensureSettings, getSettings } from './db';

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('IndexedDB persistence', () => {
  it('seeds default preferences and persists later changes', async () => {
    await ensureSettings();
    expect(await getSettings()).toEqual(defaults);
    await db.settings.put({ ...defaults, theme: 'forest', refreshInterval: 15 });
    expect(await getSettings()).toMatchObject({ theme: 'forest', refreshInterval: 15 });
  });

  it('stores cached payloads with freshness metadata and ETags', async () => {
    await cachePut(db.repoCache, 'octocat/hello-world', { stars: 12 }, '"etag-1"', 60_000);
    const cached = await cacheGet(db.repoCache, 'octocat/hello-world');
    expect(cached?.payload).toEqual({ stars: 12 });
    expect(cached?.etag).toBe('"etag-1"');
    expect(cached?.expiresAt).toBeGreaterThan(cached?.fetchedAt ?? 0);
  });

  it('keeps watchlist identity unique by full repository name', async () => {
    await db.watchedRepos.add({ owner: 'octocat', name: 'hello-world', fullName: 'octocat/hello-world', pinned: false, userLabel: '', addedAt: 10, sortOrder: 0 });
    await expect(db.watchedRepos.add({ owner: 'octocat', name: 'hello-world', fullName: 'octocat/hello-world', pinned: false, userLabel: '', addedAt: 11, sortOrder: 1 })).rejects.toBeTruthy();
    expect(await db.watchedRepos.count()).toBe(1);
  });
});
