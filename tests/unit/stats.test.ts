import { describe, it, expect } from 'vitest';
import { countLastSevenDays, mostRecentDate, formatMMDD } from '@/lib/stats';
import type { Release } from '@/lib/schemas';

const mk = (date: string): Release => ({
  date, vendor: 'x', model: 'X',
  description: { zh: 'x', en: 'x' }, link: 'https://x.com',
});

describe('countLastSevenDays', () => {
  const now = new Date('2026-04-20T00:00:00Z');
  it('counts releases within the last 7 days inclusive', () => {
    expect(countLastSevenDays([mk('2026-04-20'), mk('2026-04-14'), mk('2026-04-13')], now)).toBe(2);
  });
  it('returns 0 for empty input', () => {
    expect(countLastSevenDays([], now)).toBe(0);
  });
  it('returns 0 when all releases are older than 7 days', () => {
    expect(countLastSevenDays([mk('2026-04-01'), mk('2025-01-01')], now)).toBe(0);
  });
});

describe('mostRecentDate', () => {
  it('returns the max date string', () => {
    expect(mostRecentDate([mk('2026-04-16'), mk('2025-09-12'), mk('2026-03-22')])).toBe('2026-04-16');
  });
  it('returns empty string for empty input', () => {
    expect(mostRecentDate([])).toBe('');
  });
});

describe('formatMMDD', () => {
  it('formats YYYY-MM-DD as "MM · DD"', () => {
    expect(formatMMDD('2026-04-16')).toBe('04 · 16');
  });
  it('returns "—" for empty input', () => {
    expect(formatMMDD('')).toBe('—');
  });
});
