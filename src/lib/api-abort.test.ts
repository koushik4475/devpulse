import { describe, expect, it, vi } from 'vitest';
import { gh } from './api';

describe('request cancellation', () => {
  it('surfaces cancellation when the signal is already aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    const controller = new AbortController();
    controller.abort();
    await expect(gh('/cancelled-before-start', { signal: controller.signal, retries: 0 }))
      .rejects.toMatchObject({ kind: 'unknown', message: 'GitHub request was cancelled.' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    vi.unstubAllGlobals();
  });
});
