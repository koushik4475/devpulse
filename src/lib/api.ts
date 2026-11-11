import type { ApiError, ApiErrorKind, RateLimit } from '../types';

const API = 'https://api.github.com';
const VERSION = '2022-11-28';
const REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 30_000;

export class GitHubApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly retryAt?: number;

  constructor(kind: ApiErrorKind, message: string, retryAt?: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.kind = kind;
    this.retryAt = retryAt;
  }
}

let lastRateLimit: RateLimit = { limit: null, remaining: null, reset: null, retryAfter: null };

export function getRateLimit(): RateLimit {
  return { ...lastRateLimit };
}

function nullableNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRateLimit(response: Response): void {
  lastRateLimit = {
    limit: nullableNumber(response.headers.get('x-ratelimit-limit')),
    remaining: nullableNumber(response.headers.get('x-ratelimit-remaining')),
    reset: nullableNumber(response.headers.get('x-ratelimit-reset')),
    retryAfter: nullableNumber(response.headers.get('retry-after')),
  };
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(Math.max(0, seconds * 1000), MAX_RETRY_DELAY_MS);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_DELAY_MS);
  }
  return Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Request aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    const abort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new DOMException('Request aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function errorFromResponse(response: Response): Promise<GitHubApiError> {
  const body = await response.json().catch(() => ({})) as { message?: string };
  const message = body.message?.trim() || `GitHub API returned HTTP ${response.status}.`;
  const rateLimited = response.status === 429
    || response.headers.get('x-ratelimit-remaining') === '0'
    || /rate limit|secondary rate limit|abuse detection/i.test(message);
  const resetSeconds = nullableNumber(response.headers.get('x-ratelimit-reset'));
  const retrySeconds = nullableNumber(response.headers.get('retry-after'));
  const retryAt = resetSeconds !== null ? resetSeconds * 1000 : retrySeconds !== null ? Date.now() + retrySeconds * 1000 : undefined;

  if (response.status === 404) {
    return new GitHubApiError('not_found', 'Repository or resource not found. It may be private, deleted, or misspelled.');
  }
  if (rateLimited) {
    return new GitHubApiError('rate_limit', message || 'GitHub API rate limit reached.', retryAt);
  }
  if (response.status === 403) {
    return new GitHubApiError('forbidden', `${message} The public API may not expose this resource.`);
  }
  if (response.status >= 500) return new GitHubApiError('server', message);
  return new GitHubApiError('unknown', message);
}

export async function gh<T>(
  path: string,
  options: { etag?: string; signal?: AbortSignal; retries?: number; timeoutMs?: number } = {},
): Promise<{ data: T; etag?: string; notModified?: boolean }> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const externalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', externalAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const signal = controller.signal;
  let attempt = 0;
  const maxRetries = options.retries ?? DEFAULT_RETRIES;

  try {
    while (true) {
      try {
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': VERSION,
        };
        if (options.etag) headers['If-None-Match'] = options.etag;

        const response = await fetch(`${API}${path}`, { headers, signal });
        parseRateLimit(response);

        if (response.status === 304) {
          return { data: null as T, etag: options.etag, notModified: true };
        }
        if (response.ok) {
          let data: T;
          try {
            data = await response.json() as T;
          } catch {
            throw new GitHubApiError('invalid_response', 'GitHub returned an unreadable response.');
          }
          return { data, etag: response.headers.get('etag') ?? undefined };
        }

        const transient = [429, 500, 502, 503, 504].includes(response.status)
          || (response.status === 403 && (response.headers.has('retry-after') || response.headers.get('x-ratelimit-remaining') === '0'));
        if (transient && attempt < maxRetries) {
          await wait(retryDelay(response, attempt), signal);
          attempt += 1;
          continue;
        }
        throw await errorFromResponse(response);
      } catch (error) {
        if (error instanceof GitHubApiError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (options.signal?.aborted) throw new GitHubApiError('unknown', 'GitHub request was cancelled.');
          throw new GitHubApiError('timeout', `GitHub request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
        }
        if (attempt < maxRetries) {
          await wait(500 * 2 ** attempt, signal);
          attempt += 1;
          continue;
        }
        throw new GitHubApiError('network', 'Could not reach GitHub. Check your internet connection and retry.');
      }
    }
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', externalAbort);
  }
}

export async function paged<T>(path: string, maxPages = 2, options: { signal?: AbortSignal } = {}): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const { data } = await gh<T[]>(`${path}${separator}per_page=50&page=${page}`, options);
    if (!Array.isArray(data)) throw new GitHubApiError('invalid_response', 'GitHub returned an unexpected list response.');
    all.push(...data);
    if (data.length < 50) break;
  }
  return all;
}

export const apiPaths = {
  repo: (fullName: string) => `/repos/${fullName}`,
  pulls: (fullName: string) => `/repos/${fullName}/pulls?state=open&sort=updated&direction=desc`,
  issues: (fullName: string) => `/repos/${fullName}/issues?state=open&sort=updated&direction=desc`,
  runs: (fullName: string) => `/repos/${fullName}/actions/runs?per_page=20`,
  releases: (fullName: string) => `/repos/${fullName}/releases`,
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof GitHubApiError) return { kind: error.kind, message: error.message, retryAt: error.retryAt };
  return { kind: 'unknown', message: error instanceof Error ? error.message : 'An unexpected error occurred.' };
}
