import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'openai',
  discover: { type: 'rss', url: 'https://openai.com/news/rss.xml' },
  releaseHints: { titleKeywords: ['gpt', 'o1', 'o3', 'o4', 'dall-e', 'whisper', 'chatgpt', 'model'] },
  urlFilter: (url) => url.includes('/news/') || url.includes('/blog/') || url.includes('/index/'),
};

export default adapter;
