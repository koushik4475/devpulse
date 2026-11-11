import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPaths, getRateLimit, gh, GitHubApiError, paged } from './api';

function jsonResponse(data: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status ?? 200,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
}

describe('GitHub REST API client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends the documented API version and parses rate-limit headers', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse({ full_name: 'octocat/hello-world' }, {
      headers: { etag: 'W/"repo-1"', 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '54', 'x-ratelimit-reset': '1900000000' },
    }));

    const result = await gh<{ full_name: string }>(apiPaths.repo('octocat/hello-world'));

    expect(result.data.full_name).toBe('octocat/hello-world');
    expect(result.etag).toBe('W/"repo-1"');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/octocat/hello-world',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-GitHub-Api-Version': '2022-11-28' }) }),
    );
    expect(getRateLimit()).toMatchObject({ limit: 60, remaining: 54, reset: 1_900_000_000 });
  });

  it('supports conditional requests and exposes a 304 without erasing cached data', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 304 }));
    const result = await gh<{ full_name: string }>(apiPaths.repo('octocat/hello-world'), { etag: 'W/"repo-1"' });
    expect(result.notModified).toBe(true);
    expect(result.etag).toBe('W/"repo-1"');
  });

  it('normalizes not-found responses', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: 'Not Found' }, { status: 404 }));
    await expect(gh(apiPaths.repo('missing/repository'), { retries: 0 })).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('distinguishes API permission errors from actual rate limits', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'Resource not accessible by integration' }, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '42' },
    }));
    await expect(gh('/repos/octocat/hello-world/actions/runs', { retries: 0 })).rejects.toMatchObject({ kind: 'forbidden' });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'API rate limit exceeded' }, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' },
    }));
    await expect(gh('/repos/octocat/hello-world', { retries: 0 })).rejects.toMatchObject({ kind: 'rate_limit', retryAt: 1_900_000_000_000 });
  });

  it('retries a transient server response and then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: 'Temporary failure' }, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const request = gh<{ ok: boolean }>('/rate-limited-test', { retries: 1 });
    await vi.advanceTimersByTimeAsync(500);
    await expect(request).resolves.toMatchObject({ data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('paginates until the endpoint returns a short page', async () => {
    const pageOne = Array.from({ length: 50 }, (_, index) => ({ number: index + 1 }));
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(pageOne))
      .mockResolvedValueOnce(jsonResponse([{ number: 51 }]));

    const result = await paged<{ number: number }>('/repos/octocat/hello-world/issues?state=open', 3);
    expect(result).toHaveLength(51);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('per_page=50&page=1');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('per_page=50&page=2');
  });

  it('rejects unexpected non-array pagination payloads', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: 'unexpected' }));
    await expect(paged('/repos/octocat/hello-world/issues', 1)).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});
