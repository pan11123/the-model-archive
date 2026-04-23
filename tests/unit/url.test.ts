import { describe, it, expect } from 'vitest';
import { parseFilters, serializeFilters } from '@/lib/url';

describe('parseFilters', () => {
  it('returns empty filter for empty search', () => {
    expect(parseFilters('')).toEqual({ vendors: null, period: null, lang: null });
  });
  it('parses vendors csv and period', () => {
    expect(parseFilters('?vendors=openai,anthropic&period=2025')).toEqual({
      vendors: ['openai', 'anthropic'],
      period: '2025',
      lang: null,
    });
  });
  it('parses lang', () => {
    expect(parseFilters('?lang=zh').lang).toBe('zh');
  });
  it('ignores invalid period', () => {
    expect(parseFilters('?period=bogus').period).toBeNull();
  });
  it('ignores invalid lang', () => {
    expect(parseFilters('?lang=ru').lang).toBeNull();
  });
});

describe('serializeFilters', () => {
  it('emits only non-default values', () => {
    expect(serializeFilters({ vendors: ['openai'], period: null, lang: null }))
      .toBe('?vendors=openai');
    expect(serializeFilters({ vendors: null, period: 'last-6m', lang: null }))
      .toBe('?period=last-6m');
    expect(serializeFilters({ vendors: null, period: null, lang: null }))
      .toBe('');
  });
});
