import type { VendorAdapter } from '../types.js';

const adapter: VendorAdapter = {
  id: 'zhipu',
  discover: {
    type: 'list',
    url: 'https://www.zhipuai.cn/news',
    linkSelector: 'a[href*="/news"]',
    linkPrefix: 'https://www.zhipuai.cn',
  },
  releaseHints: { titleKeywords: ['glm', 'chatglm', 'cogview', 'cogvideo'] },
};

export default adapter;
