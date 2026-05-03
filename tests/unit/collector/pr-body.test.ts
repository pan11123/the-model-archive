import { describe, it, expect } from 'vitest';
import { generatePrBody } from '@/../scripts/collector/emit/pr-body.js';
import type { RunSummary } from '@/../scripts/collector/types.js';

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

describe('generatePrBody', () => {
  it('contains header with candidate count', () => {
    const body = generatePrBody(makeSummary({ candidates: [] }));
    expect(body).toContain('自动采集于');
    expect(body).toContain('0 条候选');
  });

  it('renders high confidence section', () => {
    const summary = makeSummary({
      candidates: [{
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
      }],
    });
    const body = generatePrBody(summary);
    expect(body).toContain('高置信度');
    expect(body).toContain('openai/GPT-5');
    expect(body).toContain('0.95');
  });

  it('renders low confidence section', () => {
    const summary = makeSummary({
      candidates: [{
        vendor: 'anthropic',
        url: 'https://example.com/maybe',
        title: 'Maybe release',
        extraction: {
          isRelease: true,
          confidence: 0.5,
          model: 'Unknown',
          releaseDate: null,
          descriptionZh: '',
          descriptionEn: '',
          reasoning: 'Uncertain',
        },
      }],
    });
    const body = generatePrBody(summary);
    expect(body).toContain('低置信度');
    expect(body).toContain('未写入 yaml');
  });

  it('renders failures section', () => {
    const summary = makeSummary({
      failures: [{ vendor: 'google', url: 'https://example.com/fail', error: 'timeout' }],
    });
    const body = generatePrBody(summary);
    expect(body).toContain('失败');
    expect(body).toContain('timeout');
  });

  it('renders stats section', () => {
    const body = generatePrBody(makeSummary());
    expect(body).toContain('本次运行');
    expect(body).toContain('厂商总数: 10');
    expect(body).toContain('写入 yaml: 1');
  });
});
