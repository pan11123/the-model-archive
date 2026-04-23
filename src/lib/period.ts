import type { Release } from '@/lib/schemas';

export type Period = 'last-12m' | 'last-6m' | 'all' | `${number}`;

export function isValidPeriod(s: string): s is Period {
  return s === 'last-12m' || s === 'last-6m' || s === 'all' || /^\d{4}$/.test(s);
}

export function filterByPeriod(releases: Release[], period: Period, now: Date = new Date()): Release[] {
  if (period === 'all') return releases;

  if (period === 'last-12m' || period === 'last-6m') {
    const months = period === 'last-12m' ? 12 : 6;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return releases.filter((r) => new Date(r.date) >= cutoff);
  }

  return releases.filter((r) => r.date.startsWith(`${period}-`));
}
