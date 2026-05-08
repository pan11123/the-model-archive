import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'minimax',
  discover: {
    type: 'list',
    url: 'https://www.minimaxi.com/news',
    linkSelector: 'a[href*="/news"]',
    linkPrefix: 'https://www.minimaxi.com',
  },
  releaseHints: {
    titleKeywords: ['minimax', 'abab'],
    excludeKeywords: ['speech', 'tts', 'hailuo', 'video', 'audio', 'music'],
  },
};

export default adapter;
