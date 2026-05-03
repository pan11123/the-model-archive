import Parser from 'rss-parser';
import type { DiscoveredItem } from '../types.js';
import { withRetry } from '../lib/retry.js';

const parser = new Parser({ timeout: 15000 });

export async function discoverRss(url: string): Promise<DiscoveredItem[]> {
  return withRetry(
    async () => {
      const feed = await parser.parseURL(url);
      return (feed.items ?? []).map((item) => ({
        url: item.link ?? item.guid ?? '',
        title: item.title ?? '',
        publishedAt: item.isoDate ?? item.pubDate ?? undefined,
      })).filter((item) => item.url);
    },
    { label: `rss:${url}` },
  );
}
