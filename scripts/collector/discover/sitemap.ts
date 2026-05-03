import { withRetry } from '../lib/retry.js';
import type { DiscoveredItem } from '../types.js';

export async function discoverSitemap(
  sitemapUrl: string,
  pathFilter: (url: string) => boolean,
): Promise<DiscoveredItem[]> {
  return withRetry(
    async () => {
      const res = await fetch(sitemapUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching sitemap`);
      const xml = await res.text();

      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
      const filtered = urls.filter(pathFilter);

      return filtered.map((url) => ({
        url,
        title: new URL(url).pathname.split('/').pop() ?? url,
      }));
    },
    { label: `sitemap:${sitemapUrl}` },
  );
}
