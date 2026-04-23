import { describe, it, expect } from 'vitest';
import { detectLanguage } from '@/lib/lang';

describe('detectLanguage', () => {
  it('query param wins over stored and navigator', () => {
    expect(detectLanguage({ query: 'zh', stored: 'en', navigator: 'en-US' })).toBe('zh');
  });
  it('invalid query ignored', () => {
    expect(detectLanguage({ query: 'ru', stored: 'en', navigator: 'zh-CN' })).toBe('en');
  });
  it('stored beats navigator when no query', () => {
    expect(detectLanguage({ query: null, stored: 'en', navigator: 'zh-CN' })).toBe('en');
  });
  it('falls back to navigator zh-*', () => {
    expect(detectLanguage({ query: null, stored: null, navigator: 'zh-HK' })).toBe('zh');
  });
  it('defaults to en for non-zh navigator', () => {
    expect(detectLanguage({ query: null, stored: null, navigator: 'fr-FR' })).toBe('en');
  });
  it('defaults to en when nothing available', () => {
    expect(detectLanguage({ query: null, stored: null, navigator: null })).toBe('en');
  });
});
