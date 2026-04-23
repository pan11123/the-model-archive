import { zh } from './zh';
import { en } from './en';

export type Lang = 'zh' | 'en';
export type Dict = typeof zh;

export function getDict(lang: Lang): Dict {
  return lang === 'zh' ? zh : en;
}

export { zh, en };
