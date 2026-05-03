import type { VendorAdapter } from '../types.js';
import anthropic from './anthropic.js';
import openai from './openai.js';
import google from './google.js';
import deepseek from './deepseek.js';
import alibaba from './alibaba.js';
import zhipu from './zhipu.js';
import moonshot from './moonshot.js';
import minimax from './minimax.js';

export const adapters: VendorAdapter[] = [
  openai,
  anthropic,
  google,
  deepseek,
  alibaba,
  zhipu,
  moonshot,
  minimax,
];

// Deferred: xai (403 Cloudflare), bytedance (JS-rendered, no stable endpoint)
// To add back: create adapter file and import above
