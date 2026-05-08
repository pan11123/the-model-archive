import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'zhipu',
  discover: {
    type: 'list',
    url: 'https://www.zhipuai.cn/news',
    linkSelector: 'a[href*="/news"]',
    linkPrefix: 'https://www.zhipuai.cn',
  },
  releaseHints: {
    titleKeywords: ['glm', 'chatglm'],
    excludeKeywords: ['cogview', 'cogvideo', 'cogaudio', 'video', 'image generation', 'tts', 'speech'],
  },
};

export default adapter;
