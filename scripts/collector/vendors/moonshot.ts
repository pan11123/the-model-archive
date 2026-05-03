import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'moonshot',
  discover: {
    type: 'list',
    url: 'https://www.kimi.com/blog/',
    linkSelector: 'a[href*="/blog/"]',
    linkPrefix: 'https://www.kimi.com',
  },
  releaseHints: { titleKeywords: ['kimi', 'moonshot', 'k2'] },
  urlFilter: (url) => url.includes('/blog/') && url !== 'https://www.kimi.com/blog/' && url !== '/blog/',
};

export default adapter;
