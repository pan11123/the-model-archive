import { describe, it, expect } from 'vitest';
import { crossValidate } from '@/lib/crossValidate';
import type { Vendor, Release } from '@/lib/schemas';

const vendors: Vendor[] = [
  { id: 'openai', name: { zh: 'OpenAI', en: 'OpenAI' }, color: '#10a37f', website: 'https://openai.com' },
];

describe('crossValidate', () => {
  it('passes for valid releases referencing known vendors', () => {
    const releases: Release[] = [
      { date: '2026-04-16', vendor: 'openai', model: 'GPT-5', description: { zh: 'x', en: 'x' }, link: 'https://a.com' },
    ];
    expect(() => crossValidate(vendors, releases)).not.toThrow();
  });

  it('rejects unknown vendor reference', () => {
    const releases: Release[] = [
      { date: '2026-04-16', vendor: 'mystery', model: 'X', description: { zh: 'x', en: 'x' }, link: 'https://a.com' },
    ];
    expect(() => crossValidate(vendors, releases)).toThrow(/unknown vendor.*mystery/i);
  });

  it('rejects duplicate (vendor, model, date)', () => {
    const r = { date: '2026-04-16', vendor: 'openai', model: 'GPT-5', description: { zh: 'x', en: 'x' }, link: 'https://a.com' };
    expect(() => crossValidate(vendors, [r, { ...r }])).toThrow(/duplicate/i);
  });

  it('rejects date >90 days in the future', () => {
    const far = new Date();
    far.setDate(far.getDate() + 120);
    const iso = far.toISOString().slice(0, 10);
    const releases: Release[] = [
      { date: iso, vendor: 'openai', model: 'Z', description: { zh: 'x', en: 'x' }, link: 'https://a.com' },
    ];
    expect(() => crossValidate(vendors, releases)).toThrow(/future/i);
  });
});
