import { z } from 'zod';

function normalizeRepositoryInput(input: string): string {
  let candidate = input.trim();
  if (!candidate) return '';

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.hostname.toLowerCase() !== 'github.com' && url.hostname.toLowerCase() !== 'www.github.com') return '';
      if (url.search || url.hash) return '';
      candidate = url.pathname;
    } catch {
      return '';
    }
  } else if (/^(www\.)?github\.com\//i.test(candidate)) {
    candidate = `/${candidate.replace(/^(www\.)?github\.com\//i, '')}`;
  }

  candidate = candidate.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '');
  const segments = candidate.split('/').filter(Boolean);
  if (segments.length !== 2) return '';
  return `${segments[0]}/${segments[1]}`;
}

export const repoSchema = z.string()
  .trim()
  .min(1, 'Enter a repository name or GitHub URL.')
  .transform(normalizeRepositoryInput)
  .pipe(z.string().max(200).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/, 'Enter a valid owner/repository or GitHub URL.'));

const backupRepoSchema = z.object({
  owner: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  fullName: z.string().min(3).max(201),
  pinned: z.boolean(),
  userLabel: z.string().max(80),
  addedAt: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
}).strict().superRefine((repo, context) => {
  if (repo.fullName.toLowerCase() !== `${repo.owner}/${repo.name}`.toLowerCase()) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Repository backup fields do not match.' });
  }
});

const backupSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'midnight', 'forest']),
  refreshInterval: z.union([z.literal(0), z.literal(5), z.literal(15), z.literal(30)]),
  cacheTtl: z.union([z.literal(60000), z.literal(300000), z.literal(900000), z.literal(3600000)]),
  compact: z.boolean(),
}).strict();

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  repos: z.array(backupRepoSchema).max(200),
  settings: backupSettingsSchema,
}).strict().superRefine((backup, context) => {
  const names = new Set<string>();
  for (const repo of backup.repos) {
    const key = repo.fullName.toLowerCase();
    if (names.has(key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate repository in backup: ${repo.fullName}` });
      break;
    }
    names.add(key);
  }
});
