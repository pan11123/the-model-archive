# v1 Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the existing implementation with the v1 "Archival Plasma Terminal" visual aesthetic — 4-layer background, statusbar, oversized hero with KV stats and live ticker, terminal-prompt filter, framed matrix with section headings, detail dialog restyle, footer.

**Architecture:** Pure CSS/markup change over the existing working functional skeleton. One new pure-function library (`src/lib/stats.ts`) for build-time stats computation. Three component files deleted (Header, LangSwitch), three added (BgLayers, StatusBar, Footer), six restyled (Hero, FilterBar, ReleaseTable, ReleaseChip, ReleaseDetail, Footer). Two client scripts updated (filters, lang). Font file replaced for missing variable axes.

**Tech Stack:** Astro 5 · TypeScript · CSS custom properties · Fraunces + JetBrains Mono variable fonts · existing Vitest + Playwright.

**Reference spec:** `docs/superpowers/specs/2026-04-23-v1-visual-alignment-design.md`
**Visual anchor:** `.superpowers/brainstorm/151-1776845815/content/prototype-v1.html`

---

## File Structure

```
src/
├─ lib/
│  └─ stats.ts                    # NEW: countLastSevenDays + mostRecentDate
├─ components/
│  ├─ BgLayers.astro              # NEW: 4 fx divs
│  ├─ StatusBar.astro             # NEW: replaces Header + LangSwitch
│  ├─ Footer.astro                # NEW
│  ├─ Header.astro                # DELETE
│  ├─ LangSwitch.astro            # DELETE
│  ├─ Hero.astro                  # REWRITE
│  ├─ FilterBar.astro             # REWRITE
│  ├─ ReleaseTable.astro          # REWRITE
│  ├─ ReleaseChip.astro           # TWEAK (use ::before dot)
│  └─ ReleaseDetail.astro         # RESTYLE (structure preserved)
├─ scripts/
│  ├─ filters.client.ts           # REWRITE period handler + reset + meta
│  └─ lang.client.ts              # SELECTOR CHANGE (.lang-toggle .lang-btn)
├─ styles/
│  ├─ tokens.css                  # ADD v1 tokens (--grid, glows, statusbar-h)
│  ├─ global.css                  # REPLACE body::before/::after with BgLayers
│  └─ components.css              # FULL REWRITE
├─ i18n/
│  ├─ zh.ts                       # EXTEND
│  └─ en.ts                       # EXTEND
└─ pages/
   └─ index.astro                 # Wire stats + render new components
public/fonts/
└─ Fraunces.woff2                 # REPLACE with full-axes variable file
tests/
├─ unit/stats.test.ts             # NEW
└─ e2e/filter.spec.ts             # UPDATE period button test
```

---

## Stage A · Foundation

### Task 1: Stats helpers (`src/lib/stats.ts`) with TDD

**Files:**
- Create: `src/lib/stats.ts`
- Create: `tests/unit/stats.test.ts`

- [ ] **Step 1: Write failing tests**

Write `tests/unit/stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { countLastSevenDays, mostRecentDate, formatMMDD } from '@/lib/stats';
import type { Release } from '@/lib/schemas';

const mk = (date: string): Release => ({
  date, vendor: 'x', model: 'X',
  description: { zh: 'x', en: 'x' }, link: 'https://x.com',
});

describe('countLastSevenDays', () => {
  const now = new Date('2026-04-20T00:00:00Z');
  it('counts releases within the last 7 days inclusive', () => {
    expect(countLastSevenDays([mk('2026-04-20'), mk('2026-04-14'), mk('2026-04-13')], now)).toBe(2);
  });
  it('returns 0 for empty input', () => {
    expect(countLastSevenDays([], now)).toBe(0);
  });
  it('returns 0 when all releases are older than 7 days', () => {
    expect(countLastSevenDays([mk('2026-04-01'), mk('2025-01-01')], now)).toBe(0);
  });
});

describe('mostRecentDate', () => {
  it('returns the max date string', () => {
    expect(mostRecentDate([mk('2026-04-16'), mk('2025-09-12'), mk('2026-03-22')])).toBe('2026-04-16');
  });
  it('returns empty string for empty input', () => {
    expect(mostRecentDate([])).toBe('');
  });
});

describe('formatMMDD', () => {
  it('formats YYYY-MM-DD as "MM · DD"', () => {
    expect(formatMMDD('2026-04-16')).toBe('04 · 16');
  });
  it('returns "—" for empty input', () => {
    expect(formatMMDD('')).toBe('—');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- stats
```

Expected: fails with module-not-found.

- [ ] **Step 3: Implement `src/lib/stats.ts`**

```typescript
import type { Release } from '@/lib/schemas';

export function countLastSevenDays(releases: Release[], now: Date = new Date()): number {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  return releases.filter((r) => new Date(r.date) >= cutoff).length;
}

export function mostRecentDate(releases: Release[]): string {
  if (releases.length === 0) return '';
  return releases.reduce((max, r) => (r.date > max ? r.date : max), '0000-00-00');
}

export function formatMMDD(date: string): string {
  if (!date) return '—';
  const [, mm, dd] = date.split('-');
  return `${mm} · ${dd}`;
}
```

- [ ] **Step 4: Run tests — expect 7/7 pass**

```bash
npm test -- stats
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts tests/unit/stats.test.ts
git commit -m "feat: stats helpers (last-7d count, most-recent, MM DD format)"
```

---

### Task 2: i18n extensions

**Files:**
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: Rewrite `src/i18n/zh.ts`**

Replace the entire file with:

```typescript
export const zh = {
  siteTitle: '模型档案馆',
  siteSubtitle: '各大 AI 厂商的大语言模型发布档案',
  hero: {
    line1: 'The Model',
    line2: 'Archive',
    tagline: '头部厂商大语言模型发布时间线 · 人工整理',
    eyebrow: '模型档案 · 第 001 期',
    eyebrowSub: '大语言模型发布档案',
    subDescription: '追踪全球主要 AI 厂商的模型发布节奏。<strong>横向对比</strong>谁在什么时刻推送了什么模型,<strong>纵向查看</strong>任一家厂商的发布脉络。数据手工校阅,每日更新。',
    kv: {
      vendors: '收录厂商',
      totalReleases: '总发布数',
      last7Days: '近 7 日',
      mostRecent: '最新一条',
    },
  },
  statusbar: {
    sysPrefix: 'SYS',
    entries: (n: number) => `${n} 条发布`,
    delta: (n: number) => `Δ7D+${n}`,
  },
  ticker: { tag: 'LIVE_FEED ▸' },
  filter: {
    heading: '查询',
    headingMono: '// QUERY',
    subtitle: '构造筛选 · 写入 URL · 可分享',
    vendors: '厂商',
    period: '时段',
    all: '全选',
    none: '清空',
    reset: '重置',
    periodLast12m: '最近 12 个月',
    periodLast6m: '最近 6 个月',
    periodAll: '全部',
    periodYear: (y: string) => `${y} 年`,
    selectedMeta: (n: number, total: number, period: string) => `已选 ${n} / ${total} 家 · 期间 ${period}`,
  },
  matrix: {
    heading: '发布矩阵',
    number: (n: string) => `№ ${n}`,
    legendEmpty: '当日无发布',
    legendActive: '活跃厂商',
  },
  table: {
    colDate: '日期',
    empty: '当前筛选下没有发布记录。',
    moreSameDay: (n: number) => `+${n} 更多`,
  },
  detail: {
    close: '关闭',
    visit: '阅读官方发布',
    vendor: '厂商',
    model: '模型',
    date: '日期',
    link: '官方链接',
  },
  lang: { zh: '中', en: 'EN', switchTo: '切换至' },
  footer: {
    creditLine: '由 <a href="https://github.com/pan11123">@pan11123</a> 手工维护',
    openIssue: '缺失发布?提交 Issue',
    github: 'GITHUB',
    data: 'DATA',
    rss: 'RSS',
  },
};
```

- [ ] **Step 2: Rewrite `src/i18n/en.ts`**

Replace with:

```typescript
import type { zh } from './zh';

export const en: typeof zh = {
  siteTitle: 'The Model Archive',
  siteSubtitle: 'A curated archive of LLM releases from every major vendor',
  hero: {
    line1: 'The Model',
    line2: 'Archive',
    tagline: 'Curated release timeline for leading LLM vendors',
    eyebrow: 'ARCHIVE № 001',
    eyebrowSub: 'ARCHIVE OF LLM RELEASES',
    subDescription: 'Tracking the release cadence of every major AI vendor. <strong>Compare horizontally</strong> who shipped what when, <strong>read vertically</strong> any single vendor\'s release lineage. Hand-curated, updated daily.',
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
  ticker: { tag: 'LIVE_FEED ▸' },
  filter: {
    heading: 'Query',
    headingMono: '// SEARCH',
    subtitle: 'Compose · Syncs to URL · Shareable',
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
    creditLine: 'HAND-CURATED BY <a href="https://github.com/pan11123">@pan11123</a>',
    openIssue: 'MISSING A RELEASE? OPEN ISSUE',
    github: 'GITHUB',
    data: 'DATA',
    rss: 'RSS',
  },
};
```

- [ ] **Step 3: Build to verify TS compatibility**

```bash
npm run build
```

Expected: succeeds. Old references to `t.hero.line1/2/tagline` / `t.filter.vendors/period/all/none` / `t.table.colDate` etc still valid; new references (`t.statusbar.*`, `t.hero.kv.*`, `t.matrix.*`, `t.footer.creditLine`) available for upcoming tasks.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/zh.ts src/i18n/en.ts
git commit -m "feat(i18n): add statusbar, hero KV, matrix, footer strings"
```

---

### Task 3: Fraunces full-axes font

**Files:**
- Replace: `public/fonts/Fraunces.woff2`

Issue: the current `Fraunces.woff2` (~36 KB) is a `wght`-only variable file from fontsource. v1 needs `opsz`, `SOFT`, `WONK`, `wght` axes. Google Fonts provides the complete four-axis variable file.

- [ ] **Step 1: Back up current file**

```bash
cp public/fonts/Fraunces.woff2 public/fonts/Fraunces.woff2.bak
```

- [ ] **Step 2: Download full-axes variable font**

First, fetch the Google Fonts CSS that references the WOFF2 URL:

```bash
curl -L -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,30..100,0..1;1,9..144,300..900,30..100,0..1&display=swap" \
  -o /tmp/fraunces-css.txt
cat /tmp/fraunces-css.txt | head -30
```

Look for the first `@font-face` block whose `src: url(...)` ends in `.woff2` for `latin` range. Copy that URL.

Then download:

```bash
curl -L -o public/fonts/Fraunces.woff2 "<URL-from-CSS>"
ls -la public/fonts/Fraunces.woff2
```

Expected: file >100 KB (full axes font is ~120-160 KB; `wght`-only was ~36 KB — if size is near the old value, you got the wrong URL).

If Google Fonts is unreachable from this environment, fall back to the GitHub repo: `https://github.com/undercasetype/Fraunces/raw/main/fonts/variable/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf` — then convert TTF to WOFF2 with `woff2_compress` (install via `npm i -g woff2` or equivalent). If this path is taken, document the TTF→WOFF2 step in the commit message.

- [ ] **Step 3: Visual verify via dev server**

Start dev server and check font-variation-settings are honored:

```bash
# In one terminal:
npm run dev
# In browser at http://localhost:4321/the-model-archive/, DevTools → Elements → pick .hero-title (once Hero is redone; for now inspect <h1>)
# Computed panel → font-variation-settings should list opsz, SOFT, WONK (if Hero CSS applies them)
```

For this task: just confirm file download + size. Actual rendering verification happens after Task 6 (Hero rewrite).

- [ ] **Step 4: Remove backup + commit**

```bash
rm public/fonts/Fraunces.woff2.bak
git add public/fonts/Fraunces.woff2
git commit -m "chore(fonts): swap Fraunces to full-axes variable (opsz/SOFT/WONK/wght)"
```

---

## Stage B · Structural (BgLayers + StatusBar + Footer; delete Header)

### Task 4: CSS tokens extension

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Replace `src/styles/tokens.css`**

```css
:root {
  /* Canvas & surfaces */
  --canvas: #0a0906;
  --canvas-lift: #13100b;
  --canvas-lifted: #1c1811;

  /* Text tiers */
  --text: #f2ebd9;
  --text-dim: #9a8f7c;
  --text-faded: #5a5347;
  --paper: var(--text);

  /* Accents */
  --plasma: #ff9f2f;
  --plasma-soft: #ffbe6d;
  --plasma-glow: rgba(255, 159, 47, 0.4);
  --plasma-dim: rgba(255, 159, 47, 0.18);
  --cyan: #4be3c1;
  --cyan-glow: rgba(75, 227, 193, 0.35);
  --critical: #ff5f5f;

  /* Lines */
  --grid: rgba(242, 235, 217, 0.035);
  --grid-strong: rgba(242, 235, 217, 0.08);
  --rule: rgba(242, 235, 217, 0.14);
  --rule-strong: rgba(242, 235, 217, 0.32);
  --border: #251e15;
  --border-hot: #3a2d1c;

  /* Shadows */
  --shadow-lg: 0 20px 60px -20px rgba(255, 159, 47, 0.18);
  --shadow-plasma: 0 0 24px rgba(255, 159, 47, 0.35);

  /* Fonts */
  --font-display: 'Fraunces', 'Source Serif 4', ui-serif, Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-sans: 'Fraunces', ui-sans-serif, system-ui, sans-serif;

  /* Type scale */
  --step-0: clamp(0.875rem, 0.82rem + 0.25vw, 1rem);
  --step-1: clamp(1rem, 0.92rem + 0.4vw, 1.2rem);
  --step-hero: clamp(84px, 16vw, 230px);

  /* Radii */
  --r-sm: 2px;
  --r-md: 4px;
  --r-lg: 10px;

  /* Spacing */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 20px;
  --sp-5: 32px;
  --sp-6: 56px;
  --sp-7: 96px;

  /* Statusbar height (used by table thead sticky top) */
  --statusbar-h: 32px;
}
```

- [ ] **Step 2: Build to verify no regression**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "style(tokens): v1 color tiers, glows, --grid, --statusbar-h"
```

---

### Task 5: BgLayers component + global.css background removal

**Files:**
- Create: `src/components/BgLayers.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write `src/components/BgLayers.astro`**

```astro
---
---
<div class="fx-grid" aria-hidden="true"></div>
<div class="fx-aurora" aria-hidden="true"></div>
<div class="fx-noise" aria-hidden="true"></div>
<div class="fx-scan" aria-hidden="true"></div>
```

- [ ] **Step 2: Replace `src/styles/global.css`**

```css
@import './tokens.css';

@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/the-model-archive/fonts/Fraunces.woff2') format('woff2-variations');
}
@font-face {
  font-family: 'Fraunces';
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url('/the-model-archive/fonts/Fraunces.woff2') format('woff2-variations');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/the-model-archive/fonts/JetBrainsMono.woff2') format('woff2-variations');
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { min-height: 100vh; }

body {
  background: var(--canvas);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
  font-feature-settings: "ss02", "cv02", "cv11";
  -webkit-font-smoothing: antialiased;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 80px;
}

/* ─── Background layers ─── */
.fx-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse at 50% 20%, black 0%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 20%, black 0%, transparent 85%);
  animation: grid-drift 80s linear infinite;
}
@keyframes grid-drift {
  from { background-position: 0 0, 0 0; }
  to   { background-position: 56px 56px, 56px 56px; }
}

.fx-aurora {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.55;
  background:
    radial-gradient(ellipse 800px 400px at 85% 10%, rgba(255,159,47,0.18), transparent 70%),
    radial-gradient(ellipse 600px 300px at 10% 90%, rgba(75,227,193,0.12), transparent 70%),
    radial-gradient(ellipse 500px 500px at 50% 50%, rgba(255,159,47,0.04), transparent 80%);
  filter: blur(10px);
}

.fx-noise {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  opacity: 0.35; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.3 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

.fx-scan {
  position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0.12;
  background: repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 3px);
  mix-blend-mode: multiply;
}

main { position: relative; z-index: 2; }

a { color: var(--plasma); text-decoration: none; }
a:hover { text-decoration: underline; }

.mono { font-family: var(--font-mono); letter-spacing: 0.02em; }
.label { font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--plasma-soft); }
.rule { height: 1px; background: var(--rule-strong); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  .hero-eyebrow, .hero-title, .hero-sub, .hero-meta, .hero-ticker { opacity: 1 !important; }
  .hero-ticker .feed .item:nth-child(n+4) { display: none; }
}
```

Notes:
- Removes the `body::before` grid and `body::after` noise — replaced by `<BgLayers>` DOM + `.fx-*` classes.
- Changes default font from `var(--font-sans)` (which was Fraunces) to `var(--font-mono)` (JetBrains Mono) per v1. Fraunces is reserved for display via `.hero-title`, etc.
- Font-face declared twice (normal + italic) so italic hero line uses the same variable file (variable fonts don't provide italic axis by default; CSS simulates).
- `.fx-scan` z-index 100 covers everything. To keep the `<dialog>` modal above it, later we'll set `dialog { z-index: 200 }` inside components.css.
- `.fx-grid` mask-image needs browser support — the `-webkit-mask-image` duplicate covers Chromium/Safari. Firefox uses `mask-image`.

- [ ] **Step 3: Build + verify no regression**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BgLayers.astro src/styles/global.css
git commit -m "feat(bg): 4-layer fx background via BgLayers component"
```

---

### Task 6: StatusBar component + delete Header / LangSwitch

**Files:**
- Create: `src/components/StatusBar.astro`
- Delete: `src/components/Header.astro`, `src/components/LangSwitch.astro`
- Modify: `src/scripts/lang.client.ts`

- [ ] **Step 1: Write `src/components/StatusBar.astro`**

```astro
---
import type { Lang } from '@/lib/url';
import { getDict } from '@/i18n';
interface Props {
  lang: Lang;
  version: string;
  buildDate: string;
  totalReleases: number;
  lastSevenDayCount: number;
}
const { lang, version, buildDate, totalReleases, lastSevenDayCount } = Astro.props;
const t = getDict(lang);
---
<div class="statusbar">
  <span class="sb-brand">
    <span class="dot" aria-hidden="true"></span>
    <strong>TMA</strong> / V{version}
  </span>
  <span class="sb-sep">—</span>
  <span class="sb-meta">
    {t.statusbar.sysPrefix} · {buildDate} UTC · {t.statusbar.entries(totalReleases)} · {t.statusbar.delta(lastSevenDayCount)}
  </span>
  <span></span>
  <span class="lang-toggle">
    <button type="button" data-target="zh" class:list={["lang-btn", { active: lang === 'zh' }]}>中</button>
    <button type="button" data-target="en" class:list={["lang-btn", { active: lang === 'en' }]}>EN</button>
  </span>
</div>
<script>
  import '@/scripts/lang.client.ts';
</script>
```

- [ ] **Step 2: Update `src/scripts/lang.client.ts`**

Replace content:

```typescript
const STORAGE_KEY = 'the-model-archive:lang';

document.querySelectorAll<HTMLElement>('.lang-toggle').forEach((root) => {
  root.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target !== 'zh' && target !== 'en') return;
      localStorage.setItem(STORAGE_KEY, target);
      const url = new URL(window.location.href);
      url.searchParams.set('lang', target);
      window.location.assign(url.toString());
    });
  });
});
```

- [ ] **Step 3: Delete old components**

```bash
rm src/components/Header.astro src/components/LangSwitch.astro
```

- [ ] **Step 4: Verify Astro still builds (index.astro still imports deleted files — build will fail)**

```bash
npm run build
```

Expected: build FAILS with "Cannot find module Header.astro". This is expected — Task 11 wires StatusBar into index.astro. For this task, skip build verification or comment out the Header import in index.astro temporarily:

If you want to keep the repo buildable between commits, add a minimal change in `src/pages/index.astro`:

```diff
-import Header from '@/components/Header.astro';
+// StatusBar will replace Header in Task 11
+import StatusBar from '@/components/StatusBar.astro';
...
-<Header lang={lang} />
+<StatusBar lang={lang} version="0.0.1" buildDate="2026-04-23" totalReleases={releases.length} lastSevenDayCount={0} />
```

This is a temporary stub — Task 11 will compute real values. The priority is keeping `main` green between commits.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusBar.astro src/scripts/lang.client.ts src/pages/index.astro
git rm src/components/Header.astro src/components/LangSwitch.astro
git commit -m "feat(header): replace Header+LangSwitch with v1 StatusBar"
```

---

### Task 7: Footer component

**Files:**
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Write `src/components/Footer.astro`**

```astro
---
import type { Lang } from '@/lib/url';
import { getDict } from '@/i18n';
interface Props { lang: Lang; }
const { lang } = Astro.props;
const t = getDict(lang);
const REPO = 'https://github.com/pan11123/the-model-archive';
---
<footer class="site-footer">
  <div class="footer-main">
    <span class="brand-tag">THE MODEL ARCHIVE</span>
    <span class="sep">·</span>
    <span set:html={t.footer.creditLine} />
    <span class="sep">·</span>
    <a href={`${REPO}/issues/new`}>{t.footer.openIssue}</a>
  </div>
  <div class="marks">
    <a href={REPO}>{t.footer.github}</a>
    <a href={`${REPO}/blob/main/src/data/releases.yaml`}>{t.footer.data}</a>
    <a aria-disabled="true" title="Coming soon" class="disabled">{t.footer.rss}</a>
  </div>
</footer>
```

- [ ] **Step 2: No build verification yet (index.astro doesn't render it till Task 11). Commit as-is.**

```bash
git add src/components/Footer.astro
git commit -m "feat(footer): Footer component with GITHUB / DATA / RSS links"
```

---

## Stage C · Hero overhaul

### Task 8: Hero component rewrite

**Files:**
- Modify: `src/components/Hero.astro`

- [ ] **Step 1: Replace `src/components/Hero.astro`**

```astro
---
import type { Release, Vendor } from '@/lib/schemas';
import type { Lang } from '@/lib/url';
import { getDict } from '@/i18n';
import { formatMMDD } from '@/lib/stats';

interface Props {
  lang: Lang;
  totalReleases: number;
  totalVendors: number;
  lastSevenDayCount: number;
  mostRecentDate: string;
  recent: Release[];
  vendorsById: Record<string, Vendor>;
}
const { lang, totalReleases, totalVendors, lastSevenDayCount, mostRecentDate, recent, vendorsById } = Astro.props;
const t = getDict(lang);
const tickerItems = [...recent, ...recent];
---
<section class="hero">
  <div class="hero-eyebrow">
    <span>{t.hero.eyebrow}</span>
    <span class="sub">· {t.hero.eyebrowSub}</span>
  </div>

  <h1 class="hero-title">
    {t.hero.line1}<br><span class="italic">{t.hero.line2}</span>
  </h1>

  <p class="hero-sub" set:html={t.hero.subDescription} />

  <div class="hero-meta">
    <div class="kv">
      <span class="k">{t.hero.kv.vendors}</span>
      <span class="v">{totalVendors}</span>
    </div>
    <div class="kv">
      <span class="k">{t.hero.kv.totalReleases}</span>
      <span class="v">{totalReleases}</span>
    </div>
    <div class="kv">
      <span class="k">{t.hero.kv.last7Days}</span>
      <span class="v accent">+{lastSevenDayCount}</span>
    </div>
    <div class="kv">
      <span class="k">{t.hero.kv.mostRecent}</span>
      <span class="v">{formatMMDD(mostRecentDate)}</span>
    </div>
  </div>

  <div class="hero-ticker">
    <span class="tag">{t.ticker.tag}</span>
    <span class="feed">
      {tickerItems.map((r) => {
        const v = vendorsById[r.vendor];
        return (
          <span class="item">
            <span class="date">{r.date}</span>
            <span class="vendor">{v?.name[lang] ?? r.vendor}</span>
            <span class="model">{r.model}</span>
          </span>
        );
      })}
    </span>
  </div>
</section>
```

- [ ] **Step 2: Commit (CSS comes in Task 12's full rewrite)**

```bash
git add src/components/Hero.astro
git commit -m "feat(hero): eyebrow + KV stats grid + live ticker + stats props"
```

---

## Stage D · Filter overhaul

### Task 9: FilterBar component rewrite

**Files:**
- Modify: `src/components/FilterBar.astro`

- [ ] **Step 1: Replace `src/components/FilterBar.astro`**

```astro
---
import type { Vendor } from '@/lib/schemas';
import type { Lang } from '@/lib/url';
import type { Period } from '@/lib/period';
import { getDict } from '@/i18n';

interface Props {
  vendors: Vendor[];
  selectedVendorIds: Set<string>;
  period: Period;
  availableYears: string[];
  lang: Lang;
}
const { vendors, selectedVendorIds, period, availableYears, lang } = Astro.props;
const t = getDict(lang);

const periodOptions: Array<{ value: string; label: string }> = [
  { value: 'last-12m', label: t.filter.periodLast12m },
  { value: 'last-6m', label: t.filter.periodLast6m },
  ...availableYears.map((y) => ({ value: y, label: t.filter.periodYear(y) })),
  { value: 'all', label: t.filter.periodAll },
];

const periodLabelMap: Record<string, string> = Object.fromEntries(periodOptions.map(o => [o.value, o.label]));
const currentPeriodLabel = periodLabelMap[period] ?? period;
const selectedCount = selectedVendorIds.size;
---
<section class="filter" data-initial-period={period}>
  <div class="filter-heading">
    <h2>{t.filter.heading} <span class="hmono">{t.filter.headingMono}</span></h2>
    <span class="dim">{t.filter.subtitle}</span>
  </div>

  <div class="filter-line">
    <span class="prompt">$</span>
    <span class="cmd">filter</span>
    <span class="flag">--vendors</span>
    <div class="pills" role="group">
      {vendors.map((v) => (
        <button
          type="button"
          class:list={["pill", { active: selectedVendorIds.has(v.id) }]}
          data-vendor={v.id}
          style={`--vc: ${v.color};`}
          aria-pressed={selectedVendorIds.has(v.id)}
        >
          <span class="bullet" aria-hidden="true"></span>
          <span>{v.name[lang]}</span>
        </button>
      ))}
    </div>
  </div>

  <div class="filter-line">
    <span class="prompt">$</span>
    <span class="cmd">range</span>
    <span class="flag">--period</span>
    <div class="period" data-current={period}>
      {periodOptions.map((o) => (
        <button
          type="button"
          class:list={["period-btn", { active: o.value === period }]}
          data-v={o.value}
        >{o.label}</button>
      ))}
    </div>
  </div>

  <div class="pill-actions">
    <a data-action="select-all">⊕ {t.filter.all}</a>
    <a data-action="select-none">⊖ {t.filter.none}</a>
    <a data-action="reset">⟳ {t.filter.reset}</a>
    <span class="meta" data-role="meta">{t.filter.selectedMeta(selectedCount, vendors.length, currentPeriodLabel)}</span>
  </div>
</section>
<script>
  import '@/scripts/filters.client.ts';
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FilterBar.astro
git commit -m "feat(filter): terminal-prompt heading + segmented period buttons + reset"
```

---

### Task 10: filters.client.ts rewrite

**Files:**
- Modify: `src/scripts/filters.client.ts`

- [ ] **Step 1: Replace `src/scripts/filters.client.ts`**

```typescript
import { parseFilters, serializeFilters, type Filters } from '@/lib/url';
import { isValidPeriod, type Period } from '@/lib/period';

const META_SELECTOR = '[data-role="meta"]';

function getFilters(): Filters {
  return parseFilters(window.location.search);
}

function assign(next: Filters) {
  const qs = serializeFilters(next);
  const url = `${window.location.pathname}${qs}${window.location.hash}`;
  window.location.assign(url);
}

function replaceUrl(next: Filters) {
  const qs = serializeFilters(next);
  const url = `${window.location.pathname}${qs}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}

function applyVendorVisibility(f: Filters) {
  const allPills = document.querySelectorAll<HTMLButtonElement>('.pill[data-vendor]');
  const selected = f.vendors ? new Set(f.vendors) : null;
  const activeSet = new Set<string>();

  allPills.forEach((btn) => {
    const id = btn.dataset.vendor!;
    const active = selected ? selected.has(id) : true;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
    if (active) activeSet.add(id);
  });

  document.querySelectorAll<HTMLElement>('[data-vendor]').forEach((el) => {
    if (el.classList.contains('pill')) return;
    el.classList.toggle('hidden', !activeSet.has(el.dataset.vendor!));
  });

  document.querySelectorAll<HTMLTableRowElement>('tr[data-date]').forEach((row) => {
    const visible = row.querySelectorAll('td.col-vendor:not(.hidden) .chip');
    row.classList.toggle('hidden', visible.length === 0);
  });

  updateMeta(activeSet.size, allPills.length);
}

function updateMeta(activeN: number, totalN: number) {
  const meta = document.querySelector<HTMLElement>(META_SELECTOR);
  if (!meta) return;
  const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  const periodBtn = document.querySelector<HTMLButtonElement>('.period-btn.active');
  const periodLabel = periodBtn?.textContent?.trim() ?? '';
  meta.textContent = lang === 'zh'
    ? `已选 ${activeN} / ${totalN} 家 · 期间 ${periodLabel}`
    : `${activeN} OF ${totalN} ACTIVE · RANGE ${periodLabel}`;
}

function init() {
  // Vendor pills — client-side toggle, URL replace (no reload)
  document.querySelectorAll<HTMLButtonElement>('.pill[data-vendor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = getFilters();
      const all = Array.from(document.querySelectorAll<HTMLButtonElement>('.pill[data-vendor]'))
        .map((b) => b.dataset.vendor!);
      const set = new Set(current.vendors ?? all);
      const id = btn.dataset.vendor!;
      if (set.has(id)) set.delete(id);
      else set.add(id);
      const next: Filters = {
        ...current,
        vendors: set.size === all.length ? null : Array.from(set),
      };
      replaceUrl(next);
      applyVendorVisibility(next);
    });
  });

  // Select all / clear (no reload)
  document.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
    const next: Filters = { ...getFilters(), vendors: null };
    replaceUrl(next);
    applyVendorVisibility(next);
  });
  document.querySelector('[data-action="select-none"]')?.addEventListener('click', () => {
    const next: Filters = { ...getFilters(), vendors: [] };
    replaceUrl(next);
    applyVendorVisibility(next);
  });

  // Reset — clear all filters (full reload to re-render period)
  document.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    window.location.assign(window.location.pathname);
  });

  // Period buttons — full reload with new period query
  document.querySelectorAll<HTMLButtonElement>('.period-btn[data-v]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.v!;
      if (!isValidPeriod(v)) return;
      const p = v as Period;
      const next: Filters = { ...getFilters(), period: p === 'last-12m' ? null : p };
      assign(next);
    });
  });

  applyVendorVisibility(getFilters());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scripts/filters.client.ts
git commit -m "feat(filter): period button handler + reset action + live selected-meta"
```

---

## Stage E · Matrix overhaul

### Task 11: ReleaseTable + ReleaseChip rewrite

**Files:**
- Modify: `src/components/ReleaseTable.astro`
- Modify: `src/components/ReleaseChip.astro`

- [ ] **Step 1: Replace `src/components/ReleaseTable.astro`**

```astro
---
import type { Matrix } from '@/lib/matrix';
import type { Lang } from '@/lib/url';
import { getDict } from '@/i18n';
import ReleaseChip from './ReleaseChip.astro';

interface Props { matrix: Matrix; lang: Lang; }
const { matrix, lang } = Astro.props;
const t = getDict(lang);
const vendorById = new Map(matrix.columns.map(v => [v.id, v]));
---
<section class="matrix-wrap">
  <div class="matrix-head">
    <h2>
      <span class="num">{t.matrix.number('001')}</span>
      {t.matrix.heading}
    </h2>
    <div class="legend">
      <span><span class="dash">—</span> {t.matrix.legendEmpty}</span>
      <span>● {t.matrix.legendActive}</span>
    </div>
  </div>

  {matrix.rows.length === 0 ? (
    <p class="empty">{t.table.empty}</p>
  ) : (
    <div class="matrix-scroll">
      <table class="release-table">
        <thead>
          <tr>
            <th class="col-date">{t.table.colDate}</th>
            {matrix.columns.map((v) => (
              <th class="col-vendor" data-vendor={v.id} style={`--vc: ${v.color};`}>
                <div class="vcol">
                  <div class="swatch" aria-hidden="true"></div>
                  <div class="name">{v.name[lang]}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr data-date={row.date}>
              <td class="col-date">{row.date}</td>
              {matrix.columns.map((v) => {
                const cell = row.cells[v.id];
                const vendor = vendorById.get(v.id)!;
                return (
                  <td class="col-vendor" data-vendor={v.id}>
                    {cell && cell.length > 0 ? (
                      <div class="cell-stack">
                        {cell.map((r) => (
                          <ReleaseChip release={r} vendor={vendor} lang={lang} />
                        ))}
                      </div>
                    ) : (
                      <span class="empty" aria-hidden="true">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
```

- [ ] **Step 2: Replace `src/components/ReleaseChip.astro`**

```astro
---
import type { Release, Vendor } from '@/lib/schemas';
import type { Lang } from '@/lib/url';
import { releaseAnchor } from '@/lib/slug';

interface Props { release: Release; vendor: Vendor; lang: Lang; }
const { release, vendor } = Astro.props;
const anchor = releaseAnchor(release.vendor, release.model, release.date);
---
<button
  class="chip"
  type="button"
  data-anchor={anchor}
  data-vendor={release.vendor}
  style={`--vc: ${vendor.color};`}
>
  <span class="chip-model">{release.model}</span>
</button>
```

Note: `.chip-dot` span removed. Dot now drawn via `::before` in CSS (Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/components/ReleaseTable.astro src/components/ReleaseChip.astro
git commit -m "feat(matrix): section heading, matrix-scroll frame, vcol headers, chip ::before dot"
```

---

## Stage F · Detail overhaul

### Task 12: ReleaseDetail restyle

**Files:**
- Modify: `src/components/ReleaseDetail.astro`
- Modify: `src/scripts/detail.client.ts`

- [ ] **Step 1: Replace `src/components/ReleaseDetail.astro`**

```astro
---
import type { Release, Vendor } from '@/lib/schemas';
import type { Lang } from '@/lib/url';
import { getDict } from '@/i18n';
import { releaseAnchor } from '@/lib/slug';

interface Props { releases: Release[]; vendors: Vendor[]; lang: Lang; }
const { releases, vendors, lang } = Astro.props;
const t = getDict(lang);

const vendorById = new Map(vendors.map(v => [v.id, v]));

const payload = Object.fromEntries(releases.map((r) => {
  const v = vendorById.get(r.vendor)!;
  return [releaseAnchor(r.vendor, r.model, r.date), {
    ...r,
    vendorName: v.name[lang],
    vendorColor: v.color,
    vendorWebsite: v.website,
  }];
}));
---
<dialog class="detail" id="release-detail" aria-label="Release detail">
  <form method="dialog" class="detail-close-form">
    <button type="submit" class="detail-close" aria-label={t.detail.close}>✕</button>
  </form>
  <div class="detail-body" data-role="body"></div>
</dialog>

<script type="application/json" id="release-payload" set:html={JSON.stringify(payload)}></script>

<script define:vars={{ dict: t.detail }}>
  window.__RL_DICT = dict;
</script>
<script>
  import '@/scripts/detail.client.ts';
</script>
```

- [ ] **Step 2: Replace `src/scripts/detail.client.ts`**

```typescript
type DialogItem = {
  date: string; vendor: string; model: string;
  description: { zh: string; en: string };
  link: string;
  vendorName: string; vendorColor: string; vendorWebsite: string;
};

declare global {
  interface Window {
    __RL_DICT: { close: string; visit: string; vendor: string; model: string; date: string; link: string };
  }
}

const payloadEl = document.getElementById('release-payload');
const dialog = document.getElementById('release-detail') as HTMLDialogElement | null;
if (!payloadEl || !dialog) throw new Error('detail dialog assets missing');

const payload: Record<string, DialogItem> = JSON.parse(payloadEl.textContent || '{}');
const dict = window.__RL_DICT;
const body = dialog.querySelector<HTMLElement>('[data-role="body"]')!;

function currentLang(): 'zh' | 'en' {
  const p = new URLSearchParams(window.location.search).get('lang');
  if (p === 'zh' || p === 'en') return p;
  return document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
}

function render(item: DialogItem) {
  const lang = currentLang();
  const weekday = new Date(item.date).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long' });
  body.innerHTML = `
    <header class="detail-head" style="--vc:${item.vendorColor}">
      <span class="detail-label">${item.vendorName.toUpperCase()} · ${item.date}</span>
    </header>
    <h2 class="detail-model">${item.model}</h2>
    <div class="detail-date">${weekday.toUpperCase()} · ${item.date}</div>
    <p class="detail-desc">${item.description[lang]}</p>
    <a class="detail-link" href="${item.link}" target="_blank" rel="noreferrer noopener" style="--vc:${item.vendorColor}">
      ${dict.visit} →
    </a>
  `;
}

function openByAnchor(anchor: string) {
  const item = payload[anchor];
  if (!item) return;
  render(item);
  if (!dialog.open) dialog.showModal();
  const newHash = `#${anchor}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${newHash}`);
  }
}

function closeDialog() {
  if (dialog.open) dialog.close();
  if (window.location.hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

document.querySelectorAll<HTMLButtonElement>('.chip[data-anchor]').forEach((btn) => {
  btn.addEventListener('click', () => openByAnchor(btn.dataset.anchor!));
});

dialog.addEventListener('close', () => {
  if (window.location.hash) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) closeDialog();
});

if (window.location.hash.length > 1) {
  openByAnchor(window.location.hash.slice(1));
}
```

Changes from old:
- Structure inside `.detail-body` changed: `.detail-label` (vendor · date in vendor color) + `.detail-model` (Fraunces italic) + `.detail-date` (weekday) + `.detail-desc` + `.detail-link` (vendor-colored).
- `--vc` custom property set on link element so its border color uses vendor color.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReleaseDetail.astro src/scripts/detail.client.ts
git commit -m "feat(detail): vendor-colored label and link, weekday subtitle"
```

---

## Stage G · components.css full rewrite

### Task 13: Replace `src/styles/components.css`

**Files:**
- Modify: `src/styles/components.css`

This is the largest task by line count — replace entire file. All selectors come from the components written above; all tokens come from `tokens.css`.

- [ ] **Step 1: Replace `src/styles/components.css`**

```css
/* ─────────────────────────────────────────────────────────────
   STATUSBAR
   ───────────────────────────────────────────────────────────── */

.statusbar {
  position: sticky; top: 0; z-index: 50;
  display: grid;
  grid-template-columns: auto auto auto 1fr auto;
  align-items: center;
  gap: 22px;
  padding: 9px 24px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(10, 9, 6, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.statusbar .dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--plasma);
  box-shadow: 0 0 10px var(--plasma-glow);
  animation: pulse 2s ease-in-out infinite;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes pulse { 50% { opacity: 0.4; transform: scale(0.75); } }
.statusbar .sb-brand strong { font-weight: 700; }
.statusbar .sb-meta { color: var(--text-dim); }
.statusbar .sb-sep { color: var(--text-faded); }
.statusbar .lang-toggle {
  display: flex;
  background: var(--canvas-lift);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 2px;
}
.statusbar .lang-toggle .lang-btn {
  background: transparent;
  border: 0;
  color: var(--text-dim);
  font: inherit;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  cursor: pointer;
  border-radius: 1px;
  transition: all 0.15s;
}
.statusbar .lang-toggle .lang-btn.active {
  background: var(--plasma);
  color: var(--canvas);
  font-weight: 700;
}
.statusbar .lang-toggle .lang-btn:not(.active):hover { color: var(--text); }

@media (max-width: 768px) {
  .statusbar { grid-template-columns: 1fr auto; gap: 8px; font-size: 9.5px; padding: 8px 16px; }
  .statusbar .sb-sep, .statusbar .sb-meta { display: none; }
}

/* ─────────────────────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────────────────────── */

.hero {
  padding: 96px 24px 48px;
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
}
.hero-eyebrow {
  display: flex; align-items: center; gap: 14px;
  color: var(--plasma);
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  margin-bottom: 32px;
  font-weight: 600;
}
.hero-eyebrow::before {
  content: ""; width: 40px; height: 1px; background: var(--plasma);
}
.hero-eyebrow .sub { color: var(--text-faded); letter-spacing: 0.1em; }

.hero-title {
  font-family: var(--font-display);
  font-size: var(--step-hero);
  line-height: 0.88;
  font-weight: 400;
  font-variation-settings: "opsz" 144, "SOFT" 50, "WONK" 0;
  letter-spacing: -0.04em;
  color: var(--text);
  margin-bottom: 20px;
  text-shadow:
    -1px 0 0 rgba(255, 159, 47, 0.2),
     1px 0 0 rgba(75, 227, 193, 0.12);
}
.hero-title .italic {
  font-style: italic;
  font-variation-settings: "opsz" 144, "SOFT" 100, "WONK" 1, "wght" 420;
  color: var(--plasma);
  font-weight: 400;
  padding-left: 0.08em;
  position: relative;
  display: inline-block;
}
.hero-title .italic::after {
  content: "";
  position: absolute; right: -0.2em; top: 0.1em; bottom: 0.25em;
  width: 0.05em;
  background: var(--plasma);
  box-shadow: 0 0 24px var(--plasma-glow);
  animation: blink 1.1s steps(2) infinite;
}
@keyframes blink { 50% { opacity: 0; } }

.hero-sub {
  font-size: 15px;
  color: var(--text-dim);
  max-width: 620px;
  margin-top: 28px;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.02em;
}
.hero-sub strong { color: var(--text); font-weight: 500; }

.hero-meta {
  display: flex; gap: 32px;
  margin-top: 44px;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--text-dim);
  text-transform: uppercase;
}
.hero-meta .kv { display: flex; flex-direction: column; gap: 4px; }
.hero-meta .k { color: var(--text-faded); font-size: 10px; }
.hero-meta .v {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 26px;
  color: var(--text);
  letter-spacing: -0.01em;
  font-variation-settings: "opsz" 36, "SOFT" 50, "WONK" 0;
  text-transform: none;
  font-weight: 400;
}
.hero-meta .v.accent { color: var(--plasma); }

.hero-ticker {
  margin-top: 54px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-left: 2px solid var(--plasma);
  background: linear-gradient(90deg, var(--canvas-lift), transparent);
  font-size: 12px;
  display: flex; align-items: center; gap: 14px;
  overflow: hidden;
}
.hero-ticker .tag {
  color: var(--plasma);
  font-weight: 600;
  letter-spacing: 0.15em;
  font-size: 10px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.hero-ticker .feed {
  color: var(--text-dim);
  white-space: nowrap;
  animation: scroll-x 40s linear infinite;
}
.hero-ticker .feed .item { display: inline-block; margin-right: 48px; }
.hero-ticker .feed .date { color: var(--text-faded); }
.hero-ticker .feed .vendor { color: var(--text); font-weight: 600; margin: 0 8px; }
.hero-ticker .feed .model { color: var(--plasma-soft); }
@keyframes scroll-x { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.hero-eyebrow, .hero-title, .hero-sub, .hero-meta, .hero-ticker {
  opacity: 0;
  animation: fadeUp 0.8s ease-out forwards;
}
.hero-eyebrow { animation-delay: 0.05s; }
.hero-title   { animation-delay: 0.15s; animation-duration: 1.1s; }
.hero-sub     { animation-delay: 0.4s; }
.hero-meta    { animation-delay: 0.55s; }
.hero-ticker  { animation-delay: 0.7s; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}

/* ─────────────────────────────────────────────────────────────
   FILTER
   ───────────────────────────────────────────────────────────── */

.filter {
  max-width: 1440px;
  margin: 0 auto;
  padding: 12px 24px 32px;
}
.filter-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
  flex-wrap: wrap;
}
.filter-heading h2 {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 28px;
  font-weight: 400;
  color: var(--text);
  font-variation-settings: "opsz" 36, "SOFT" 50, "WONK" 0;
}
.filter-heading .hmono {
  font-style: normal;
  color: var(--plasma);
  font-size: 20px;
  font-family: var(--font-mono);
  margin-left: 8px;
  letter-spacing: 0.02em;
}
.filter-heading .dim {
  font-size: 11px;
  color: var(--text-faded);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.filter-line {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  font-size: 13px;
  flex-wrap: wrap;
}
.filter-line .prompt {
  color: var(--plasma);
  font-weight: 700;
  letter-spacing: 0.1em;
}
.filter-line .cmd { color: var(--text); font-weight: 600; }
.filter-line .flag { color: var(--cyan); font-style: italic; }

.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  --vc: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px 5px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-dim);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.pill .bullet {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--vc);
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow 0.2s;
}
.pill:hover { color: var(--text); border-color: var(--border-hot); }
.pill.active {
  color: var(--text);
  background: rgba(255, 159, 47, 0.05);
  border-color: var(--vc);
}
.pill.active .bullet { box-shadow: 0 0 12px var(--vc); }
.pill.active::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--vc), transparent);
  opacity: 0.06;
  pointer-events: none;
}

.period {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 2px;
  overflow-x: auto;
  max-width: 100%;
}
.period .period-btn {
  background: transparent;
  border: 0;
  border-right: 1px solid var(--border);
  color: var(--text-dim);
  font: inherit;
  font-size: 12px;
  padding: 5px 12px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: all 0.15s;
  white-space: nowrap;
}
.period .period-btn:last-child { border-right: 0; }
.period .period-btn:hover { color: var(--text); background: var(--canvas-lift); }
.period .period-btn.active {
  background: var(--plasma);
  color: var(--canvas);
  font-weight: 700;
}

.pill-actions {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  font-size: 11px;
  color: var(--text-faded);
  letter-spacing: 0.08em;
  flex-wrap: wrap;
}
.pill-actions a {
  color: var(--text-dim);
  text-decoration: none;
  border-bottom: 1px dashed var(--border-hot);
  padding-bottom: 1px;
  cursor: pointer;
  transition: color 0.15s;
}
.pill-actions a:hover { color: var(--plasma); border-color: var(--plasma); }
.pill-actions .meta {
  margin-left: auto;
  color: var(--text-faded);
}

/* ─────────────────────────────────────────────────────────────
   MATRIX
   ───────────────────────────────────────────────────────────── */

.matrix-wrap {
  max-width: 1440px;
  margin: 20px auto 0;
  padding: 0 24px;
}
.matrix-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
  flex-wrap: wrap;
}
.matrix-head h2 {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 28px;
  font-weight: 400;
  color: var(--text);
  font-variation-settings: "opsz" 36, "SOFT" 50, "WONK" 0;
}
.matrix-head h2 .num {
  color: var(--plasma);
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 18px;
  letter-spacing: 0.02em;
  margin-right: 10px;
  vertical-align: 2px;
}
.matrix-head .legend {
  display: flex;
  gap: 20px;
  font-size: 11px;
  color: var(--text-faded);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.matrix-head .legend span { display: inline-flex; align-items: center; gap: 7px; }
.matrix-head .legend .dash { color: var(--text-faded); }

.matrix-scroll {
  overflow-x: auto;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--canvas-lift), var(--canvas));
  box-shadow: var(--shadow-lg);
  position: relative;
}
.matrix-scroll::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, var(--plasma) 0, transparent 2px) top left / 100% 1px no-repeat;
}

table.release-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 1020px;
  font-size: 12.5px;
}
table.release-table thead th {
  position: sticky;
  top: var(--statusbar-h);
  z-index: 5;
  background: var(--canvas-lift);
  padding: 14px 12px 13px;
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  color: var(--text-dim);
  white-space: nowrap;
}
table.release-table thead th.col-date {
  color: var(--text-faded);
  width: 130px;
  position: sticky;
  left: 0;
  z-index: 6;
  background: var(--canvas-lift);
  border-right: 1px solid var(--border);
}
table.release-table thead th .vcol {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
table.release-table thead th .vcol .swatch {
  width: 100%;
  height: 2px;
  background: var(--vc);
  box-shadow: 0 0 8px var(--vc);
}
table.release-table thead th .vcol .name { color: var(--text); }

table.release-table tbody td {
  padding: 11px 12px;
  vertical-align: top;
  border-bottom: 1px solid var(--border);
  min-width: 110px;
}
table.release-table tbody tr { transition: background 0.12s; }
table.release-table tbody tr:hover {
  background: linear-gradient(90deg, rgba(255, 159, 47, 0.04), transparent);
}
table.release-table tbody tr:hover td.col-date { color: var(--plasma); }

table.release-table td.col-date {
  position: sticky;
  left: 0;
  z-index: 2;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
  background: var(--canvas);
  border-right: 1px solid var(--border);
  font-size: 11.5px;
  letter-spacing: 0.02em;
  padding-top: 12px;
}
table.release-table tbody tr:hover td.col-date { background: var(--canvas-lift); }

.cell-stack { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }

span.empty {
  color: var(--text-faded);
  font-size: 16px;
  font-family: var(--font-mono);
  display: inline-block;
  width: 100%;
  text-align: center;
  padding-top: 8px;
}

.matrix-wrap > p.empty {
  text-align: center;
  padding: 96px 32px;
  color: color-mix(in srgb, var(--text) 55%, transparent);
  font-family: var(--font-mono);
}

.hidden { display: none !important; }

/* ─────────────────────────────────────────────────────────────
   CHIP
   ───────────────────────────────────────────────────────────── */

.chip {
  --vc: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  border: 1px solid color-mix(in oklab, var(--vc) 30%, transparent);
  background: color-mix(in oklab, var(--vc) 8%, transparent);
  color: var(--vc);
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s;
  max-width: 100%;
}
.chip::before {
  content: "";
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--vc);
  flex-shrink: 0;
  box-shadow: 0 0 6px var(--vc);
}
.chip:hover {
  background: color-mix(in oklab, var(--vc) 20%, transparent);
  border-color: var(--vc);
  transform: translateY(-1px);
}

/* ─────────────────────────────────────────────────────────────
   DETAIL DIALOG
   ───────────────────────────────────────────────────────────── */

.detail {
  width: min(520px, 92vw);
  max-height: 80vh;
  padding: 0;
  border: 1px solid var(--border-hot);
  border-left: 2px solid var(--vc, var(--plasma));
  background: rgba(28, 24, 17, 0.96);
  color: var(--text);
  border-radius: var(--r-lg);
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(75, 227, 193, 0.08);
  backdrop-filter: blur(10px);
  z-index: 200;
}
.detail::backdrop { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(3px); }
.detail-close-form { position: absolute; top: 10px; right: 10px; margin: 0; }
.detail-close {
  background: transparent;
  color: var(--text-faded);
  border: 0;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  padding: 2px 6px;
}
.detail-close:hover { color: var(--text); }
.detail-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; }
.detail-body .detail-head { --vc: var(--plasma); }
.detail-label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--vc);
  font-weight: 600;
}
.detail-model {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 28px;
  color: var(--text);
  font-weight: 400;
  font-variation-settings: "opsz" 36, "SOFT" 50;
  line-height: 1;
  margin: 0;
}
.detail-date {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.detail-desc {
  font-size: 12.5px;
  color: var(--text);
  line-height: 1.55;
  margin: 0 0 12px 0;
}
.detail-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vc, var(--plasma));
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid color-mix(in oklab, var(--vc, var(--plasma)) 40%, transparent);
  padding-bottom: 3px;
}
.detail-link:hover { border-color: var(--vc, var(--plasma)); }

/* ─────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────── */

.site-footer {
  max-width: 1440px;
  margin: 80px auto 0;
  padding: 24px 24px 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  border-top: 1px solid var(--border);
  color: var(--text-faded);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  position: relative;
  z-index: 2;
}
.site-footer .footer-main { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.site-footer .brand-tag { color: var(--text-dim); font-weight: 600; }
.site-footer .sep { color: var(--text-faded); }
.site-footer a {
  color: var(--text-dim);
  text-decoration: none;
  transition: color 0.15s;
}
.site-footer a:hover { color: var(--plasma); }
.site-footer .marks { display: flex; gap: 28px; }
.site-footer .marks a.disabled {
  opacity: 0.35;
  pointer-events: none;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .hero { padding: 60px 16px 36px; }
  .hero-meta { gap: 16px; flex-wrap: wrap; }
  .filter, .matrix-wrap { padding: 12px 16px; }
  .site-footer { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Run `npm run build` — should still fail (index.astro not wired)**

```bash
npm run build
```

Expected: fails at `index.astro` due to missing props. Task 14 wires it all.

- [ ] **Step 3: Commit anyway**

```bash
git add src/styles/components.css
git commit -m "style: full v1-aligned components.css rewrite"
```

---

## Stage H · Wiring & testing

### Task 14: `index.astro` wiring

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace `src/pages/index.astro`**

```astro
---
import '@/styles/global.css';
import '@/styles/components.css';
import fs from 'node:fs';
import path from 'node:path';

import { loadAll } from '@/lib/loadData';
import { filterByPeriod, type Period } from '@/lib/period';
import { buildMatrix } from '@/lib/matrix';
import { parseFilters } from '@/lib/url';
import { countLastSevenDays, mostRecentDate } from '@/lib/stats';
import type { Lang } from '@/i18n';
import { getDict } from '@/i18n';

import BgLayers from '@/components/BgLayers.astro';
import StatusBar from '@/components/StatusBar.astro';
import Hero from '@/components/Hero.astro';
import FilterBar from '@/components/FilterBar.astro';
import ReleaseTable from '@/components/ReleaseTable.astro';
import ReleaseDetail from '@/components/ReleaseDetail.astro';
import Footer from '@/components/Footer.astro';

const { vendors, releases } = loadAll();

const f = parseFilters(Astro.url.search);
const lang: Lang = f.lang ?? 'en';
const period: Period = f.period ?? 'last-12m';

const selectedVendorIds = new Set(f.vendors ?? vendors.map((v) => v.id));

const periodReleases = filterByPeriod(releases, period);
const matrix = buildMatrix(periodReleases, vendors, selectedVendorIds);

const availableYears = Array.from(new Set(releases.map((r) => r.date.slice(0, 4))))
  .sort((a, b) => b.localeCompare(a));

// Build-time computed stats
const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
const version = pkg.version as string;
const buildDate = new Date().toISOString().slice(0, 10);
const lastSevenDayCount = countLastSevenDays(releases);
const mostRecent = mostRecentDate(releases);

// Ticker: last 10 releases by date desc
const recent = [...releases]
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .slice(0, 10);
const vendorsById: Record<string, typeof vendors[number]> = Object.fromEntries(
  vendors.map((v) => [v.id, v])
);

const t = getDict(lang);
---
<!doctype html>
<html lang={lang === 'zh' ? 'zh-CN' : 'en'}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{t.siteTitle} · {t.siteSubtitle}</title>
    <meta name="description" content={t.siteSubtitle} />
    <link rel="icon" href="/the-model-archive/favicon.svg" />
  </head>
  <body>
    <BgLayers />
    <StatusBar
      lang={lang}
      version={version}
      buildDate={buildDate}
      totalReleases={releases.length}
      lastSevenDayCount={lastSevenDayCount}
    />
    <main>
      <Hero
        lang={lang}
        totalReleases={releases.length}
        totalVendors={vendors.length}
        lastSevenDayCount={lastSevenDayCount}
        mostRecentDate={mostRecent}
        recent={recent}
        vendorsById={vendorsById}
      />
      <FilterBar
        vendors={vendors}
        selectedVendorIds={selectedVendorIds}
        period={period}
        availableYears={availableYears}
        lang={lang}
      />
      <ReleaseTable matrix={matrix} lang={lang} />
    </main>
    <Footer lang={lang} />
    <ReleaseDetail releases={releases} vendors={vendors} lang={lang} />

    <script is:inline>
      (function () {
        var url = new URL(window.location.href);
        if (url.searchParams.has('lang')) return;
        var stored = null;
        try { stored = localStorage.getItem('the-model-archive:lang'); } catch (e) {}
        var target = stored;
        if (!target) {
          var nav = (navigator.language || '').toLowerCase();
          target = nav.indexOf('zh') === 0 ? 'zh' : 'en';
        }
        if (target !== 'zh' && target !== 'en') return;
        if (document.documentElement.lang.slice(0, 2) === target) return;
        url.searchParams.set('lang', target);
        window.location.replace(url.toString());
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 2: Build + verify**

```bash
npm run build
```

Expected: builds clean. Font-path warnings from Vite about `/the-model-archive/fonts/...` are known and OK (they resolve at runtime).

Inspect `dist/index.html`:

```bash
grep -c "class=\"statusbar\"" dist/index.html   # expect 1
grep -c "class=\"hero-ticker\"" dist/index.html # expect 1
grep -c "class=\"matrix-scroll\"" dist/index.html # expect 1
grep -c "class=\"site-footer\"" dist/index.html # expect 1
grep -c "class=\"fx-grid\"" dist/index.html     # expect 1
```

All should return `1`.

- [ ] **Step 3: Manual visual smoke**

```bash
npm run dev
```

Open `http://localhost:4321/the-model-archive/?lang=en`. Verify:
- [ ] Background grid is barely visible (much fainter than before)
- [ ] Aurora orange glow visible top-right
- [ ] Scan lines visible as faint horizontal bands
- [ ] StatusBar at top with pulsing dot, `TMA / V0.0.1 · SYS · DATE · 15 ENTRIES · Δ7D+N`
- [ ] Hero title is huge (fills viewport width substantially); italic "Archive" has plasma blinking cursor
- [ ] 4 KV stat cells visible with italic Fraunces numbers
- [ ] Live ticker scrolls left at ~40s/loop
- [ ] Filter shows `Query // SEARCH` heading with italic + mono
- [ ] `$ filter --vendors [pills]` and `$ range --period [buttons]` lines rendered
- [ ] Period buttons in segmented group, `last-12m` is plasma-orange filled
- [ ] Matrix has `№ 001 Release Matrix` heading with orange number
- [ ] Table wrapped in bordered frame with plasma top-line
- [ ] Column headers show swatch bar above vendor name
- [ ] Footer appears with `THE MODEL ARCHIVE · HAND-CURATED BY ...` and GITHUB/DATA/RSS marks (RSS greyed)
- [ ] Click a chip → dialog opens with vendor color on left border
- [ ] Esc closes dialog, URL hash cleared
- [ ] Toggle to zh via statusbar → page reloads in Chinese with correct strings

Stop dev server (Ctrl+C) after verification.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(wiring): assemble v1 layout (BgLayers + StatusBar + Footer + new Hero props)"
```

---

### Task 15: E2E update

**Files:**
- Modify: `tests/e2e/filter.spec.ts`

The period-dropdown test uses `page.selectOption('.period-select', 'all')` which no longer exists (replaced by segmented buttons). Update the test.

- [ ] **Step 1: Replace `tests/e2e/filter.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('deselecting a vendor hides its column', async ({ page }) => {
  await page.goto('./?lang=en');
  const vendorHeader = page.locator('th.col-vendor[data-vendor="openai"]');
  await expect(vendorHeader).toBeVisible();
  await page.locator('.pill[data-vendor="openai"]').click();
  await expect(vendorHeader).toBeHidden();
  await expect(page).toHaveURL(/vendors=/);
});

test('period button reloads with matching query', async ({ page }) => {
  await page.goto('./?lang=en');
  await page.locator('.period-btn[data-v="all"]').click();
  await page.waitForURL(/period=all/);
  await expect(page.locator('table.release-table tbody tr').first()).toBeVisible();
});
```

- [ ] **Step 2: Verify smoke.spec.ts still compatible**

No change needed — it only selectors `.chip`, `dialog#release-detail`, `h1`, `table.release-table tbody tr`, all of which still exist.

- [ ] **Step 3: Run full E2E**

```bash
npm run test:e2e
```

Expected: 5/5 pass.

- [ ] **Step 4: Run unit tests**

```bash
npm test
```

Expected: 7 test files / 31 passing (28 old + 3 new in `stats.test.ts`).

- [ ] **Step 5: Final build confirmation**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/filter.spec.ts
git commit -m "test(e2e): update period test to use segmented button"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Implemented in task(s) |
|---|---|
| §2 scope: 4 bg layers | Task 5 (global.css fx-*), Task 4 (tokens) |
| §2 scope: statusbar | Task 6, Task 13 CSS |
| §2 scope: hero KV + ticker | Task 8, Task 1 stats helpers, Task 13 CSS |
| §2 scope: filter terminal prompt + period buttons | Task 9, Task 10, Task 13 CSS |
| §2 scope: matrix frame + vcol | Task 11, Task 13 CSS |
| §2 scope: detail restyle | Task 12, Task 13 CSS |
| §2 scope: footer | Task 7, Task 13 CSS |
| §2 scope: font axes | Task 3 |
| §5 background layers | Task 4, 5 |
| §6 hero | Task 1 (stats), Task 8 (component), Task 13 (CSS) |
| §7 filter | Task 9, 10, 13 |
| §8 matrix | Task 11, 13 |
| §9 StatusBar / Detail / Footer | Task 6, 7, 12, 13 |
| §10 animations | Task 5 (global reduced-motion), Task 13 (pulse / blink / fadeUp / scroll-x) |
| §11 font axes | Task 3 |
| §12 i18n | Task 2 |
| §13 file changes | Covered across tasks |
| §14 testing | Task 1 (unit), Task 15 (e2e) |
| §15 YAGNI (RSS placeholder) | Task 7 (disabled class) |

All sections covered.

**2. Placeholder scan:** No "TBD", no "implement later", no "similar to". All code blocks are full. Task 3 fallback path (Google Fonts TTF→WOFF2) is concrete with exact URL and tool name.

**3. Type consistency:**
- `Props` of `StatusBar.astro` (Task 6): `lang`, `version`, `buildDate`, `totalReleases`, `lastSevenDayCount` — matches `index.astro` render in Task 14.
- `Props` of `Hero.astro` (Task 8): `lang`, `totalReleases`, `totalVendors`, `lastSevenDayCount`, `mostRecentDate`, `recent`, `vendorsById` — matches Task 14.
- `Props` of `Footer.astro` (Task 7): just `lang` — matches Task 14.
- `countLastSevenDays(releases, now?)`, `mostRecentDate(releases)`, `formatMMDD(date)` — signatures used in `stats.test.ts`, `Hero.astro`, `index.astro` all match.
- `data-role="meta"` in FilterBar (Task 9) matches `META_SELECTOR` in filters.client.ts (Task 10).
- `.period-btn` class used in FilterBar (Task 9), filters.client.ts (Task 10), and CSS (Task 13).
- `.lang-toggle .lang-btn` in StatusBar (Task 6), lang.client.ts (Task 6 updated script), CSS (Task 13).

All consistent.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-23-v1-visual-alignment.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
