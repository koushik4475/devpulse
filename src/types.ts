export type RepoInput = {
  id?: number;
  owner: string;
  name: string;
  fullName: string;
  pinned: boolean;
  userLabel: string;
  addedAt: number;
  sortOrder: number;
};

export type Label = { name: string; color: string };

export type RepoMeta = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license?: { spdx_id: string | null; name?: string } | null;
  pushed_at: string | null;
  archived: boolean;
  visibility?: string;
};

export type Pull = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  state: string;
  created_at: string;
  updated_at: string;
  user: { login: string } | null;
  labels: Label[];
  base: { ref: string };
};

export type Issue = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: { login: string } | null;
  labels: Label[];
  pull_request?: unknown;
};

export type WorkflowRun = {
  id: number;
  name: string | null;
  head_branch: string;
  event: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  run_started_at?: string | null;
  updated_at: string;
  html_url: string;
  run_number: number;
};

export type Release = {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
};

export type ApiErrorKind = 'rate_limit' | 'not_found' | 'forbidden' | 'network' | 'timeout' | 'server' | 'invalid_response' | 'unknown';
export type ApiError = { kind: ApiErrorKind; message: string; retryAt?: number };
export type RateLimit = { limit: number | null; remaining: number | null; reset: number | null; retryAfter: number | null };
export type Cached<T> = { fullName: string; payload: T; fetchedAt: number; etag?: string; expiresAt: number };
export type Settings = {
  id: 'main';
  theme: 'dark' | 'light' | 'midnight' | 'forest';
  refreshInterval: number;
  cacheTtl: number;
  compact: boolean;
};
