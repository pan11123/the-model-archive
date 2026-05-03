import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadState,
  isSeen,
  markSeen,
  updateLastRun,
  filterNewUrls,
  appendDiscarded,
} from '@/../scripts/collector/state.js';
import type { CollectorState } from '@/../scripts/collector/state.js';

function freshState(): CollectorState {
  return { version: 1, vendors: {} };
}

describe('state', () => {
  let state: CollectorState;

  beforeEach(() => {
    state = freshState();
  });

  describe('isSeen', () => {
    it('returns false for unknown vendor', () => {
      expect(isSeen(state, 'openai', 'https://example.com/1')).toBe(false);
    });

    it('returns false for unseen url', () => {
      markSeen(state, 'openai', 'https://example.com/1');
      expect(isSeen(state, 'openai', 'https://example.com/2')).toBe(false);
    });

    it('returns true for seen url', () => {
      markSeen(state, 'openai', 'https://example.com/1');
      expect(isSeen(state, 'openai', 'https://example.com/1')).toBe(true);
    });
  });

  describe('markSeen', () => {
    it('creates vendor state if missing', () => {
      markSeen(state, 'anthropic', 'https://example.com/1');
      expect(state.vendors['anthropic']).toBeDefined();
      expect(state.vendors['anthropic'].seenUrls).toEqual(['https://example.com/1']);
    });

    it('does not duplicate urls', () => {
      markSeen(state, 'openai', 'https://example.com/1');
      markSeen(state, 'openai', 'https://example.com/1');
      expect(state.vendors['openai'].seenUrls).toEqual(['https://example.com/1']);
    });
  });

  describe('updateLastRun', () => {
    it('creates vendor state if missing', () => {
      updateLastRun(state, 'google');
      expect(state.vendors['google']).toBeDefined();
      expect(state.vendors['google'].lastRun).toBeTruthy();
    });

    it('updates lastRun timestamp', () => {
      updateLastRun(state, 'openai');
      const ts = state.vendors['openai'].lastRun;
      expect(new Date(ts).toISOString()).toBe(ts);
    });
  });

  describe('filterNewUrls', () => {
    it('returns all urls for unknown vendor', () => {
      const result = filterNewUrls(state, 'openai', ['a', 'b', 'c']);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('filters out seen urls', () => {
      markSeen(state, 'openai', 'b');
      const result = filterNewUrls(state, 'openai', ['a', 'b', 'c']);
      expect(result).toEqual(['a', 'c']);
    });
  });
});
