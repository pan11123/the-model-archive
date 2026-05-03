import type { RunSummary } from '../types.js';

export function generatePrBody(summary: RunSummary): string {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const lines: string[] = [];

  lines.push(`> 自动采集于 ${now}｜本次发现 ${summary.candidates.length} 条候选`);
  lines.push('');

  const high = summary.candidates.filter((c) => c.extraction.confidence >= 0.85);
  const medium = summary.candidates.filter((c) => c.extraction.confidence >= 0.7 && c.extraction.confidence < 0.85);
  const low = summary.candidates.filter((c) => c.extraction.confidence < 0.7);

  if (high.length > 0) {
    lines.push('## ✅ 已写入 releases.yaml（高置信度）');
    lines.push('');
    for (const c of high) {
      lines.push(`- **${c.vendor}/${c.extraction.model}** (confidence: ${c.extraction.confidence.toFixed(2)}, date: ${c.extraction.releaseDate})`);
      lines.push(`  - URL: ${c.url}`);
      lines.push(`  - 中文: ${c.extraction.descriptionZh}`);
      lines.push(`  - LLM reasoning: ${c.extraction.reasoning}`);
    }
    lines.push('');
  }

  if (medium.length > 0) {
    lines.push('## ⚠️ 已写入但中等置信度（请重点核对）');
    lines.push('');
    for (const c of medium) {
      lines.push(`- **${c.vendor}/${c.extraction.model}** (confidence: ${c.extraction.confidence.toFixed(2)}, date: ${c.extraction.releaseDate})`);
      lines.push(`  - URL: ${c.url}`);
      lines.push(`  - 中文: ${c.extraction.descriptionZh}`);
      lines.push(`  - LLM reasoning: ${c.extraction.reasoning}`);
    }
    lines.push('');
  }

  if (low.length > 0) {
    lines.push('## 💭 低置信度候选（未写入 yaml，需人工判断）');
    lines.push('');
    for (const c of low) {
      lines.push(`- **${c.vendor}/${c.extraction.model ?? '?'}** (confidence: ${c.extraction.confidence.toFixed(2)})`);
      lines.push(`  - URL: ${c.url}`);
      lines.push(`  - LLM reasoning: ${c.extraction.reasoning}`);
    }
    lines.push('');
  }

  if (summary.failures.length > 0) {
    lines.push('## ❌ 失败（已重试，下次 cron 会再试）');
    lines.push('');
    for (const f of summary.failures) {
      lines.push(`- **${f.vendor}**: ${f.url}`);
      lines.push(`  - Error: ${f.error}`);
    }
    lines.push('');
  }

  lines.push('## 📊 本次运行');
  lines.push(`- 厂商总数: ${summary.vendorCount}`);
  lines.push(`- discover 出候选: ${summary.discovered}`);
  lines.push(`- 去重后: ${summary.afterDedup}`);
  lines.push(`- LLM 抽取次数: ${summary.extracted}`);
  lines.push(`- 写入 yaml: ${summary.written}`);
  lines.push(`- 跳过: ${summary.skipped}`);

  return lines.join('\n');
}
