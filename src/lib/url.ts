import { isValidPeriod, type Period } from '@/lib/period';

export type Lang = 'zh' | 'en';

export interface Filters {
  vendors: string[] | null;
  period: Period | null;
  lang: Lang | null;
}

export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const vendorRaw = params.get('vendors');
  const vendors = vendorRaw ? vendorRaw.split(',').map((s) => s.trim()).filter(Boolean) : null;

  const periodRaw = params.get('period');
  const period = periodRaw && isValidPeriod(periodRaw) ? (periodRaw as Period) : null;

  const langRaw = params.get('lang');
  const lang = langRaw === 'zh' || langRaw === 'en' ? (langRaw as Lang) : null;

  return { vendors: vendors?.length ? vendors : null, period, lang };
}

export function serializeFilters(f: Filters): string {
  const p = new URLSearchParams();
  if (f.vendors && f.vendors.length) p.set('vendors', f.vendors.join(','));
  if (f.period) p.set('period', f.period);
  if (f.lang) p.set('lang', f.lang);
  const s = p.toString();
  return s ? `?${s}` : '';
}
