import { describe, expect, it } from 'vitest';
import { dateTime, duration, formatDurationMs, timeAgo } from './format';

describe('format helpers', () => {
  it('formats short and long durations', () => {
    expect(duration('2026-01-01T00:00:00Z', '2026-01-01T00:00:42Z')).toBe('42s');
    expect(formatDurationMs(90_000)).toBe('1m 30s');
    expect(formatDurationMs(3_600_000)).toBe('1h 0m');
  });

  it('handles missing and invalid dates safely', () => {
    expect(timeAgo(null)).toBe('Unknown');
    expect(timeAgo('not-a-date')).toBe('Unknown');
    expect(dateTime('not-a-date')).toBe('Not available');
    expect(duration('invalid', 'also invalid')).toBe('—');
    expect(formatDurationMs(Number.NaN)).toBe('—');
  });
});
