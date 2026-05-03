import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'xai',
  discover: {
    type: 'list',
    url: 'https://x.ai/news',
    linkSelector: 'a[href*="/news/"]',
    linkPrefix: 'https://x.ai',
  },
  releaseHints: { titleKeywords: ['grok'] },
};

export default adapter;
