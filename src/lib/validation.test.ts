import { describe, expect, it } from 'vitest';
import { backupSchema, repoSchema } from './validation';

const validBackup = {
  version: 1,
  exportedAt: '2026-11-11T10:00:00.000Z',
  repos: [{ owner: 'octocat', name: 'hello-world', fullName: 'octocat/hello-world', pinned: true, userLabel: 'Work', addedAt: 100, sortOrder: 0 }],
  settings: { theme: 'dark', refreshInterval: 15, cacheTtl: 300000, compact: false },
};

describe('repository input normalization', () => {
  it('accepts owner/name and preserves case', () => {
    expect(repoSchema.parse('octocat/hello-world')).toBe('octocat/hello-world');
  });
  it('normalizes GitHub URLs and .git suffixes', () => {
    expect(repoSchema.parse('https://github.com/facebook/react.git')).toBe('facebook/react');
    expect(repoSchema.parse('github.com/facebook/react/')).toBe('facebook/react');
  });
  it('rejects malformed values, extra path segments, and lookalike hosts', () => {
    expect(repoSchema.safeParse('not-a-repo').success).toBe(false);
    expect(repoSchema.safeParse('owner/repo/extra').success).toBe(false);
    expect(repoSchema.safeParse('https://github.com.evil.example/owner/repo').success).toBe(false);
  });
});

describe('backup validation', () => {
  it('accepts a versioned and internally consistent backup', () => {
    expect(backupSchema.safeParse(validBackup).success).toBe(true);
  });
  it('rejects unsupported versions and mismatched repository names', () => {
    expect(backupSchema.safeParse({ ...validBackup, version: 2 }).success).toBe(false);
    expect(backupSchema.safeParse({ ...validBackup, repos: [{ ...validBackup.repos[0], fullName: 'octocat/other' }] }).success).toBe(false);
  });
  it('rejects duplicate repository entries and unsafe settings', () => {
    expect(backupSchema.safeParse({ ...validBackup, repos: [...validBackup.repos, ...validBackup.repos] }).success).toBe(false);
    expect(backupSchema.safeParse({ ...validBackup, settings: { ...validBackup.settings, refreshInterval: 1 } }).success).toBe(false);
  });
});
