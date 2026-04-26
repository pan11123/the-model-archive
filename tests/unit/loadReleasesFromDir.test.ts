import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadReleasesFromDir } from '@/lib/loadData';

const FIXTURES = path.resolve(__dirname, '../fixtures/release-dirs');

describe('loadReleasesFromDir', () => {
  it('concatenates entries from all files and returns sorted file ids', () => {
    const { releases, fileIds } = loadReleasesFromDir(path.join(FIXTURES, 'happy'));
    expect(fileIds).toEqual(['anthropic', 'openai']);
    expect(releases).toHaveLength(3);
    expect(releases.map((r) => r.model).sort()).toEqual(
      ['Claude 3', 'Claude 3.5 Sonnet', 'GPT-4o'],
    );
  });

  it('treats a zero-byte file as an empty list', () => {
    const { releases, fileIds } = loadReleasesFromDir(path.join(FIXTURES, 'empty-string'));
    expect(fileIds).toEqual(['openai']);
    expect(releases).toEqual([]);
  });

  it('treats `[]` as an empty list', () => {
    const { releases, fileIds } = loadReleasesFromDir(path.join(FIXTURES, 'empty-array'));
    expect(fileIds).toEqual(['openai']);
    expect(releases).toEqual([]);
  });

  it('throws when an entry vendor disagrees with the filename', () => {
    expect(() => loadReleasesFromDir(path.join(FIXTURES, 'mismatch'))).toThrow(
      /openai\.yaml.*vendor="anthropic".*expected "openai"/,
    );
  });
});
