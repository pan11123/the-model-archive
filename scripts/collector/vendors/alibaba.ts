import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'alibaba',
  discover: {
    type: 'list',
    url: 'https://qwenlm.github.io/blog/',
    linkSelector: 'a[href*="/blog/"]',
    linkPrefix: 'https://qwenlm.github.io',
  },
  releaseHints: { titleKeywords: ['qwen', 'qwq', 'vl'] },
};

export default adapter;
