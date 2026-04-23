import { describe, it, expect } from 'vitest';
import { filterByPeriod, type Period } from '@/lib/period';
import type { Release } from '@/lib/schemas';

const mk = (date: string): Release => ({
  date, vendor: 'openai', model: 'X',
  description: { zh: '', en: '' }, link: 'https://a.com',
});

const now = new Date('2026-06-22T00:00:00Z');

describe('filterByPeriod', () => {
  const releases = [
    mk('2026-04-10'),
    mk('2025-12-01'),
    mk('2024-06-15'),
    mk('2025-08-01'),
  ];

  it('last-12m keeps last 12 months', () => {
    const out = filterByPeriod(releases, 'last-12m', now);
    expect(out.map(r => r.date)).toEqual(['2026-04-10', '2025-12-01', '2025-08-01']);
  });
  it('last-6m keeps last 6 months', () => {
    const out = filterByPeriod(releases, 'last-6m', now);
    expect(out.map(r => r.date)).toEqual(['2026-04-10']);
  });
  it('year 2025 keeps only that year', () => {
    const out = filterByPeriod(releases, '2025', now);
    expect(out.map(r => r.date)).toEqual(['2025-12-01', '2025-08-01']);
  });
  it('all returns everything', () => {
    expect(filterByPeriod(releases, 'all', now)).toEqual(releases);
  });
});
