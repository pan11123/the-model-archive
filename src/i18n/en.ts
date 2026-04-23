import type { zh } from './zh';

export const en: typeof zh = {
  siteTitle: 'AI Release Log',
  siteSubtitle: 'Release timeline for every major AI vendor',
  hero: {
    line1: 'AI Release',
    line2: 'Log',
    tagline: 'Curated release timeline for leading LLM vendors',
  },
  filter: {
    vendors: 'Vendors',
    period: 'Period',
    all: 'All',
    none: 'None',
    periodLast12m: 'Last 12 months',
    periodLast6m: 'Last 6 months',
    periodAll: 'All time',
    periodYear: (y: string) => y,
  },
  table: {
    colDate: 'Date',
    empty: 'No releases match the current filters.',
    moreSameDay: (n: number) => `+${n} more`,
  },
  detail: {
    close: 'Close',
    visit: 'Visit official link',
    vendor: 'Vendor',
    model: 'Model',
    date: 'Date',
    link: 'Link',
  },
  lang: { zh: '中', en: 'EN', switchTo: 'Switch to' },
  footer: {
    repo: 'GitHub repo',
    updated: 'Last updated',
    contribute: 'Contribute / Feedback',
  },
};
