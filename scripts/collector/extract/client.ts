import OpenAI from 'openai';
import type { ExtractionResult } from '../types.js';
import { extractionJsonSchema } from './schema.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { withRetry } from '../lib/retry.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Common words that appear after hyphens but are NOT model variants
const NON_VARIANT_SUFFIXES = new Set([
  'based', 'style', 'like', 'related', 'powered', 'driven', 'compatible',
  'ready', 'specific', 'only', 'friendly', 'optimized', 'enhanced', 'focused',
  'centric', 'aware', 'native', 'grade', 'level', 'tier', 'type', 'mode',
]);

/**
 * If the reasoning or article content mentions a more specific model variant name
 * (e.g. "GPT-5.5-Cyber") while the returned model is a base name (e.g. "GPT-5.5"),
 * upgrade to the variant.
 */
function upgradeModelFromContext(model: string | null, reasoning: string, content: string): string | null {
  if (!model) return model;
  const m = model.trim();
  const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escaped}[-–][A-Za-z][\\w-]*)`, 'gi');

  // Check reasoning first (more specific signal)
  for (const text of [reasoning, content]) {
    if (!text) continue;
    let longest = '';
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1];
      if (candidate.length <= m.length) continue;
      // Extract the suffix after the base model name
      const suffix = candidate.slice(m.length + 1).toLowerCase();
      if (NON_VARIANT_SUFFIXES.has(suffix)) continue;
      if (candidate.length > longest.length) longest = candidate;
    }
    if (longest.length > m.length) return longest;
  }
  return model;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return DATE_RE.test(trimmed) ? trimmed : null;
}

function normalizeNullable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });
}

export async function extractRelease(opts: {
  vendor: string;
  title: string;
  publishedAt?: string;
  content: string;
}): Promise<ExtractionResult> {
  return withRetry(
    async () => {
      const client = getClient();
      const response = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(opts) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('Empty response from LLM');
      }

      const parsed = JSON.parse(text) as ExtractionResult;
      const reasoning = String(parsed.reasoning ?? '');
      const rawModel = normalizeNullable(parsed.model);
      const model = upgradeModelFromContext(rawModel, reasoning, opts.content);
      if (model !== rawModel) {
        console.log(`    🔧 model upgraded from "${rawModel}" → "${model}" (variant found in context)`);
      }
      return {
        isRelease: Boolean(parsed.isRelease),
        confidence: Number(parsed.confidence),
        model,
        releaseDate: normalizeDate(parsed.releaseDate),
        descriptionZh: String(parsed.descriptionZh ?? ''),
        descriptionEn: String(parsed.descriptionEn ?? ''),
        reasoning,
      };
    },
    { label: `extract:${opts.vendor}:${opts.title}`, baseDelayMs: 2000 },
  );
}
