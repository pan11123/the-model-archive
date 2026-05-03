import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'google',
  discover: { type: 'rss', url: 'https://blog.google/innovation-and-ai/technology/ai/rss/' },
  releaseHints: { titleKeywords: ['gemini', 'gemma', 'palm', 'bard', 'gemma'] },
};

export default adapter;
