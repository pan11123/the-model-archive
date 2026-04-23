export const zh = {
  siteTitle: 'AI Release Log',
  siteSubtitle: '各大 AI 厂商的模型发布时刻表',
  hero: {
    line1: 'AI 发布',
    line2: '日志',
    tagline: '头部厂商大语言模型发布时间线 · 人工整理',
  },
  filter: {
    vendors: '厂商',
    period: '时段',
    all: '全选',
    none: '全不选',
    periodLast12m: '最近 12 个月',
    periodLast6m: '最近 6 个月',
    periodAll: '全部',
    periodYear: (y: string) => `${y} 年`,
  },
  table: {
    colDate: '日期',
    empty: '当前筛选下没有发布记录。',
    moreSameDay: (n: number) => `+${n} 更多`,
  },
  detail: {
    close: '关闭',
    visit: '访问官方链接',
    vendor: '厂商',
    model: '模型',
    date: '日期',
    link: '官方链接',
  },
  lang: { zh: '中文', en: 'EN', switchTo: '切换至' },
  footer: {
    repo: 'GitHub 仓库',
    updated: '最后更新',
    contribute: '贡献 / 反馈',
  },
};
