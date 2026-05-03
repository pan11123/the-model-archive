import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'deepseek',
  discover: {
    type: 'sitemap',
    url: 'https://api-docs.deepseek.com/sitemap.xml',
    pathFilter: (url) => url.includes('/news/'),
  },
  releaseHints: { titleKeywords: ['deepseek', 'v2', 'v3', 'v4', 'r1', 'r2', 'coder'] },
};

export default adapter;
