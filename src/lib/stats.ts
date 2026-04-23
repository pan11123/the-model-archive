import type { Release } from '@/lib/schemas';

export function countLastSevenDays(releases: Release[], now: Date = new Date()): number {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  return releases.filter((r) => new Date(r.date) > cutoff).length;
}

export function mostRecentDate(releases: Release[]): string {
  if (releases.length === 0) return '';
  return releases.reduce((max, r) => (r.date > max ? r.date : max), '0000-00-00');
}

export function formatMMDD(date: string): string {
  if (!date) return '—';
  const [, mm, dd] = date.split('-');
  return `${mm} · ${dd}`;
}
