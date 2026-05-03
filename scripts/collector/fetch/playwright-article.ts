import { chromium } from 'playwright';
import type { FetchedArticle } from '../types.js';
import { withRetry } from '../lib/retry.js';
import { htmlToText } from '../lib/html-to-text.js';

export async function fetchArticle(url: string): Promise<FetchedArticle> {
  return withRetry(
    async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const title = await page.title();
        const html = await page.content();
        const plainText = htmlToText(html);
        return { url, html, plainText, title };
      } finally {
        await browser.close();
      }
    },
    { label: `fetch:${url}`, baseDelayMs: 2000 },
  );
}
