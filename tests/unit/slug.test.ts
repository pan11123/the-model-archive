import { describe, it, expect } from 'vitest';
import { modelSlug, releaseAnchor } from '@/lib/slug';

describe('modelSlug', () => {
  it('lowercases and replaces non-alnum with dashes', () => {
    expect(modelSlug('Claude 3.7 Sonnet')).toBe('claude-3-7-sonnet');
  });
  it('collapses repeated dashes', () => {
    expect(modelSlug('GPT--5 (Turbo)')).toBe('gpt-5-turbo');
  });
  it('trims leading/trailing dashes', () => {
    expect(modelSlug('-foo-')).toBe('foo');
  });
});

describe('releaseAnchor', () => {
  it('joins vendor, slug, date', () => {
    expect(releaseAnchor('anthropic', 'Claude 3.7 Sonnet', '2026-04-02'))
      .toBe('anthropic-claude-3-7-sonnet-2026-04-02');
  });
});
