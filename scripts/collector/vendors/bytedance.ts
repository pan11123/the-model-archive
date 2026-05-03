import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'bytedance',
  discover: {
    type: 'list',
    url: 'https://www.volcengine.com/docs/82379/news',
    linkSelector: 'a[href*="/news"]',
    linkPrefix: 'https://www.volcengine.com',
  },
  releaseHints: { titleKeywords: ['doubao', 'seed', 'bytedance'] },
};

export default adapter;
