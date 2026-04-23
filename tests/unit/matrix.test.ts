import { describe, it, expect } from 'vitest';
import { buildMatrix } from '@/lib/matrix';
import type { Release, Vendor } from '@/lib/schemas';

const vendors: Vendor[] = [
  { id: 'openai', name: { zh: 'OpenAI', en: 'OpenAI' }, color: '#000000', website: 'https://a.com' },
  { id: 'anthropic', name: { zh: 'Anthropic', en: 'Anthropic' }, color: '#111111', website: 'https://b.com' },
  { id: 'google', name: { zh: 'Google', en: 'Google' }, color: '#222222', website: 'https://c.com' },
];

const releases: Release[] = [
  { date: '2026-04-16', vendor: 'openai', model: 'GPT-5', description: { zh: 'x', en: 'x' }, link: 'https://x.com' },
  { date: '2026-04-02', vendor: 'anthropic', model: 'Claude 4.7', description: { zh: 'x', en: 'x' }, link: 'https://x.com' },
  { date: '2026-04-02', vendor: 'anthropic', model: 'Claude 4.7 Haiku', description: { zh: 'x', en: 'x' }, link: 'https://x.com' },
];

describe('buildMatrix', () => {
  it('drops vendors with no releases in the selection (empty columns)', () => {
    const m = buildMatrix(releases, vendors, new Set(['openai', 'anthropic', 'google']));
    expect(m.columns.map(v => v.id)).toEqual(['openai', 'anthropic']);
  });

  it('returns rows sorted by date descending', () => {
    const m = buildMatrix(releases, vendors, new Set(['openai', 'anthropic']));
    expect(m.rows.map(r => r.date)).toEqual(['2026-04-16', '2026-04-02']);
  });

  it('groups same-vendor-same-date into one cell with multiple items', () => {
    const m = buildMatrix(releases, vendors, new Set(['openai', 'anthropic']));
    const apr2 = m.rows.find(r => r.date === '2026-04-02')!;
    expect(apr2.cells.anthropic).toHaveLength(2);
    expect(apr2.cells.openai).toBeUndefined();
  });

  it('respects the selected-vendors filter', () => {
    const m = buildMatrix(releases, vendors, new Set(['openai']));
    expect(m.columns.map(v => v.id)).toEqual(['openai']);
    expect(m.rows.map(r => r.date)).toEqual(['2026-04-16']);
  });
});
