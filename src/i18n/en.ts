import type { zh } from './zh';

export const en: typeof zh = {
  siteTitle: 'The Model Archive',
  siteSubtitle: 'A curated archive of LLM releases from every major vendor',
  hero: {
    line1: 'The Model',
    line2: 'Archive',
    eyebrow: 'ARCHIVE',
    eyebrowSub: 'ARCHIVE OF LLM RELEASES',
    subDescription: 'Tracking the release cadence of every major AI vendor.',
    kv: {
      vendors: 'VENDORS',
      totalReleases: 'TOTAL RELEASES',
      last7Days: 'LAST 7 DAYS',
      mostRecent: 'MOST RECENT',
    },
  },
  statusbar: {
    sysPrefix: 'SYS',
    entries: (n: number) => `${n} ENTRIES`,
    delta: (n: number) => `Δ7D+${n}`,
  },
  filter: {
    heading: 'Query',
    vendors: 'Vendors',
    period: 'Period',
    all: 'SELECT ALL',
    none: 'CLEAR',
    reset: 'RESET',
    periodLast12m: 'last-12m',
    periodLast6m: 'last-6m',
    periodAll: 'all',
    periodYear: (y: string) => y,
    selectedMeta: (n: number, total: number, period: string) => `${n} OF ${total} ACTIVE · RANGE ${period}`,
  },
  matrix: {
    heading: 'Release Matrix',
    number: (n: string) => `№ ${n}`,
    legendEmpty: 'NO RELEASE',
    legendActive: 'ACTIVE VENDOR',
  },
  table: {
    colDate: 'Date',
    empty: 'No releases match the current filters.',
    moreSameDay: (n: number) => `+${n} more`,
  },
  detail: {
    close: 'Close',
    visit: 'Read official announcement',
    vendor: 'Vendor',
    model: 'Model',
    date: 'Date',
    link: 'Link',
  },
  lang: { zh: '中', en: 'EN', switchTo: 'Switch to' },
  footer: {
    openIssue: 'MISSING A RELEASE? OPEN ISSUE',
    github: 'GITHUB',
    data: 'DATA',
    rss: 'RSS',
  },
};
