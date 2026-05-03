import OpenAI from 'openai';
import type { ExtractionResult } from '../types.js';
import { extractionJsonSchema } from './schema.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { withRetry } from '../lib/retry.js';

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
      return {
        isRelease: Boolean(parsed.isRelease),
        confidence: Number(parsed.confidence),
        model: parsed.model ?? null,
        releaseDate: parsed.releaseDate ?? null,
        descriptionZh: String(parsed.descriptionZh ?? ''),
        descriptionEn: String(parsed.descriptionEn ?? ''),
        reasoning: String(parsed.reasoning ?? ''),
      };
    },
    { label: `extract:${opts.vendor}:${opts.title}`, baseDelayMs: 2000 },
  );
}
