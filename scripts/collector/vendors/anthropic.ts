import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'anthropic',
  discover: {
    type: 'list',
    url: 'https://www.anthropic.com/news',
    linkSelector: 'a[href*="/news/"]',
    linkPrefix: 'https://www.anthropic.com',
  },
  releaseHints: { excludeKeywords: ['policy', 'safety report', 'transparency', 'election', 'update'] },
  urlFilter: (url) => url.includes('/news/') && !url.endsWith('/news'),
};

export default adapter;
