import { chromium } from 'playwright';
import type { DiscoveredItem } from '../types.js';
import { withRetry } from '../lib/retry.js';

export async function discoverList(
  url: string,
  linkSelector: string,
  linkPrefix?: string,
): Promise<DiscoveredItem[]> {
  return withRetry(
    async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const links = await page.$$eval(linkSelector, (els, prefix) =>
          els.map((el) => {
            const href = el.getAttribute('href') ?? '';
            const fullUrl = prefix && href.startsWith('/') ? prefix + href : href;
            return { url: fullUrl, title: el.textContent?.trim() ?? '' };
          }).filter((item) => item.url),
          linkPrefix ?? '',
        );
        return links as DiscoveredItem[];
      } finally {
        await browser.close();
      }
    },
    { label: `playwright-list:${url}` },
  );
}
