export type Lang = 'zh' | 'en';

export interface DetectInput {
  query: string | null;
  stored: string | null;
  navigator: string | null;
}

function normalize(v: string | null): Lang | null {
  if (v === 'zh' || v === 'en') return v;
  return null;
}

export function detectLanguage(input: DetectInput): Lang {
  const q = normalize(input.query);
  if (q) return q;
  const s = normalize(input.stored);
  if (s) return s;
  if (input.navigator && input.navigator.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}
