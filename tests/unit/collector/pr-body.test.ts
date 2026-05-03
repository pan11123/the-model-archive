import { describe, it, expect } from 'vitest';
import { generatePrBody } from '@/../scripts/collector/emit/pr-body.js';
import type { RunSummary, Candidate } from '@/../scripts/collector/types.js';

function makeSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    vendorCount: 10,
    discovered: 5,
    afterDedup: 3,
    extracted: 3,
    written: 1,
    skipped: 1,
    failed: 1,
    candidates: [],
    failures: [],
    discarded: [],
    ...overrides,
  };
}

const mockCandidate: Candidate = {
  vendor: 'openai',
  url: 'https://example.com/gpt5',
  title: 'GPT-5',
  extraction: {
    isRelease: true,
    confidence: 0.95,
    model: 'GPT-5',
    releaseDate: '2026-01-01',
    descriptionZh: '新一代模型',
    descriptionEn: 'Next-gen model',
    reasoning: 'Contains model name',
  },
};

describe('generatePrBody', () => {
  it('contains header with new count', () => {
    const body = generatePrBody(makeSummary({ candidates: [] }), [], []);
    expect(body).toContain('自动采集于');
    expect(body).toContain('新增 0 条');
  });

  it('renders written entries', () => {
    const body = generatePrBody(makeSummary(), [mockCandidate], []);
    expect(body).toContain('新增写入');
    expect(body).toContain('openai/GPT-5');
    expect(body).toContain('0.95');
  });

  it('renders skipped entries', () => {
    const body = generatePrBody(makeSummary(), [], [mockCandidate]);
    expect(body).toContain('跳过（已存在）');
    expect(body).toContain('openai/GPT-5');
  });

  it('renders failures section', () => {
    const summary = makeSummary({
      failures: [{ vendor: 'google', url: 'https://example.com/fail', error: 'timeout' }],
    });
    const body = generatePrBody(summary, [], []);
    expect(body).toContain('失败');
    expect(body).toContain('timeout');
  });

  it('renders stats section', () => {
    const body = generatePrBody(makeSummary(), [mockCandidate], []);
    expect(body).toContain('本次运行');
    expect(body).toContain('厂商总数: 10');
    expect(body).toContain('新增写入: 1');
  });
});
