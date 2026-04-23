# v1 Visual Alignment · 设计规格

- **日期**:2026-04-23
- **目标产品**:The Model Archive / 模型档案馆
- **参考原型**:`.superpowers/brainstorm/151-1776845815/content/prototype-v1.html`(Archival Plasma Terminal)

---

## 1. 背景与目标

首轮实现(commits `d059326` → `b8379d0`)把功能层搭完整了,但把 CSS 写得过于"功能化",v1 原型里的多数视觉装置没有落地。用户比对后指出主要差距:

- 背景网格过曝(14% opacity vs v1 的 3.5%)
- 缺 aurora 光晕、scan lines
- Hero 标题只到 128px,v1 是 230px
- 没有 statusbar / KV 统计格 / live ticker / 入场动画
- Filter 没有终端 prompt 风格,period 选择器退化成原生 `<select>`
- 矩阵没有外框和区块标题
- 没有 footer

本次迭代**不改任何业务逻辑**,只补齐视觉层,使成品对齐 v1 原型的 "Archival Plasma Terminal" 美学。

## 2. 范围

**In-scope**
- 全部 4 层背景(grid fix + 新增 aurora / scan lines)
- Hero 重写(eyebrow / 大标题 / 副标题 / KV 4 格 / live ticker / 入场动画)
- StatusBar 新增(替代 Header)
- Filter 区重写(区块标题 / 终端 prompt / 分段 period 按钮 / 重写 pill actions)
- 矩阵区重写(区块标题 / 外框容器 / 列头 `.vcol` 结构 / chip 细节)
- ReleaseDetail 样式重写(保留 `<dialog>` 模态)
- Footer 新增
- i18n 新增相关文案
- 入场 / 脉动 / 闪烁 / 滚动动画(全部 `prefers-reduced-motion` 友好)
- Fraunces 字体轴验证 + 必要时替换字体文件

**Out-of-scope(下次迭代)**
- RSS 订阅(footer 链接为 disabled 占位)
- 暗/亮主题切换
- 视觉回归测试
- 数据变更(vendors / releases YAML 不动)

## 3. 关键决策汇总

| 决策点 | 选项 | 理由 |
|---|---|---|
| 详情面板 | 保留居中 `<dialog>` 模态,v1 样式 | 保留 focus trap / Esc / backdrop 等 a11y |
| 顶部导航 | v1 风格 statusbar 替代 Header | 信息密度更高,GitHub 链接移至 footer |
| Period 选择器 | v1 分段按钮组 | 视觉一致;年份增多用 `overflow-x: auto` |
| Live ticker | 真实数据驱动(近 10 条) | 让装饰和数据对上 |
| Footer RSS | disabled 占位 + "Coming soon" tooltip | 本期不实现 `/rss.xml` |
| 字体轴 | Fraunces 需完整 `opsz/SOFT/WONK/wght` 轴 | 若自托管缺失则重新下载或接 Google Fonts CDN |

## 4. 布局结构

```
┌─ StatusBar ─────────────────────────────────────────────────────┐
│ ● TMA/V1.0.0 — SYS · DATE UTC · N ENTRIES · Δ7D+M      [中|EN]  │
├─ Hero ──────────────────────────────────────────────────────────┤
│ ──── ARCHIVE № 001 · ARCHIVE OF LLM RELEASES                    │
│                                                                  │
│    The Model                                                    │
│    Archive▌                                                     │
│                                                                  │
│    (副标题,强调横向/纵向对比)                                    │
│                                                                  │
│    VENDORS  │  TOTAL  │  LAST 7D  │  MOST RECENT                │
│     10      │   15    │    +2     │    04 · 16                  │
│                                                                  │
│    [LIVE_FEED ▸ 2026-04-16 · OpenAI · GPT-5 · ...  (scroll)]    │
├─ Filter ────────────────────────────────────────────────────────┤
│ Query // SEARCH                  Compose · Syncs to URL · Shareable
│ ────────────────────────────────────────────────────────────────│
│ $ filter --vendors  [pill] [pill] [pill] ...                    │
│ $ range  --period   [last-12m|last-6m|2026|2025|all]            │
│ ⊕ SELECT ALL · ⊖ CLEAR · ⟳ RESET         6 OF 10 · RANGE last-12m│
├─ Matrix ────────────────────────────────────────────────────────┤
│ № 001 · Release Matrix              — NO RELEASE   ● ACTIVE     │
│ ────────────────────────────────────────────────────────────────│
│ ╔═ (plasma 顶线 + 外框 + 大阴影) ═══════════════════════════════╗│
│ ║  Date │ OpenAI │ Anthropic │ Google │ ...                   ║│
│ ║  ──── │  ────  │   ────    │  ────  │    (.vcol swatch bar) ║│
│ ║  ...                                                         ║│
│ ╚══════════════════════════════════════════════════════════════╝│
├─ Footer ────────────────────────────────────────────────────────┤
│ AI RELEASE LOG · HAND-CURATED BY @pan11123 · OPEN ISSUE         │
│                                    GITHUB · DATA · RSS(灰)      │
└──────────────────────────────────────────────────────────────────┘
```

## 5. 背景层(4 层 stack)

**新增 token**(`src/styles/tokens.css`):
```css
--grid: rgba(242, 235, 217, 0.035);   /* 新,专用 */
--grid-strong: rgba(242, 235, 217, 0.08);
--plasma-glow: rgba(255, 159, 47, 0.4);
--cyan-glow: rgba(75, 227, 193, 0.35);
```

### 5.1 Grid 层(修复主痛点)
```css
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
```

### 5.2 Aurora 层(新增)
```css
.fx-aurora {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.55;
  background:
    radial-gradient(ellipse 800px 400px at 85% 10%, rgba(255,159,47,.18), transparent 70%),
    radial-gradient(ellipse 600px 300px at 10% 90%, rgba(75,227,193,.12), transparent 70%),
    radial-gradient(ellipse 500px 500px at 50% 50%, rgba(255,159,47,.04), transparent 80%);
  filter: blur(10px);
}
```

### 5.3 Noise 层(保留,微调)
当前 `body::after` 实现不动。

### 5.4 Scan lines 层(新增)
```css
.fx-scan {
  position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0.12;
  background: repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,.4) 2px, rgba(0,0,0,.4) 3px);
  mix-blend-mode: multiply;
}
```

### 5.5 DOM 结构
把当前的 `body::before` / `body::after` 背景移除,在 `body` 开头加 4 个 `<div>`:
```html
<body>
  <div class="fx-grid"></div>
  <div class="fx-aurora"></div>
  <div class="fx-noise"></div>
  <div class="fx-scan"></div>
  <StatusBar ... />
  <main> ... </main>
  <Footer ... />
</body>
```

### 5.6 z-index 栈
```
z-100  .fx-scan
z-60   detail <dialog>(showModal 自带层)
z-50   statusbar
z-5    table thead(sticky)
z-2    main
z-1    .fx-noise
z-0    .fx-grid / .fx-aurora
```

## 6. Hero 重写

### 6.1 新 props
```ts
interface Props {
  lang: Lang;
  totalReleases: number;   // 已有
  totalVendors: number;    // 已有
  lastSevenDayCount: number;  // 新
  mostRecentDate: string;     // 新,格式 'YYYY-MM-DD'
}
```

在 `index.astro` 里构建期计算:
```ts
const now = new Date();
const sevenDaysAgo = new Date(now);
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const lastSevenDayCount = releases.filter(r => new Date(r.date) >= sevenDaysAgo).length;
const mostRecentDate = releases.reduce((max, r) => r.date > max ? r.date : max, '0000-00-00');
```

### 6.2 Eyebrow
```html
<div class="hero-eyebrow">
  <span>{t.hero.eyebrow}</span>
  <span class="sub">{t.hero.eyebrowSub}</span>
</div>
```
CSS:40px 横线前缀、plasma 色、`letter-spacing: .2em`。

### 6.3 Title
```html
<h1 class="hero-title">
  {t.hero.line1}<br>
  <span class="italic">{t.hero.line2}</span>
</h1>
```
- `font-size: clamp(84px, 16vw, 230px)`
- `line-height: .88`
- `font-variation-settings: 'opsz' 144, 'SOFT' 50, 'WONK' 0`
- italic 行:`font-style: italic`, `font-variation-settings: 'opsz' 144, 'SOFT' 100, 'WONK' 1, 'wght' 420`, plasma 色 + glow
- italic 行 `::after`:0.05em 宽 plasma 竖条,`animation: blink 1.1s steps(2) infinite`

### 6.4 副标题
```html
<p class="hero-sub" set:html={t.hero.subDescription}></p>
```
文案内嵌 `<strong>` 标签强调关键词。`max-width: 620px`、`font-size: 15px`。

### 6.5 KV 4 格
```html
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
```
- `.k` 10px caps faded 色
- `.v` 26px Fraunces italic,`'opsz' 36, 'SOFT' 50`
- `.v.accent` plasma 色

### 6.6 Ticker
见 §10.3。

### 6.7 入场动画
```css
.hero-eyebrow, .hero-title, .hero-sub, .hero-meta, .hero-ticker {
  opacity: 0; animation: fadeUp .8s ease-out forwards;
}
.hero-eyebrow { animation-delay: .05s; }
.hero-title   { animation-delay: .15s; animation-duration: 1.1s; }
.hero-sub     { animation-delay: .4s; }
.hero-meta    { animation-delay: .55s; }
.hero-ticker  { animation-delay: .7s; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}
```

## 7. Filter 重写

### 7.1 区块标题
```html
<div class="filter-heading">
  <h2>{t.filter.heading} <span class="mono">{t.filter.headingMono}</span></h2>
  <span class="dim">{t.filter.subtitle}</span>
</div>
```
- `h2` Fraunces italic 28px
- `.mono` 等宽 plasma 18px
- `.dim` 11px caps faded

### 7.2 两行命令
```html
<div class="filter-line">
  <span class="prompt">$</span>
  <span class="cmd">filter</span>
  <span class="flag">--vendors</span>
  <div class="pills"> {vendors.map(...)} </div>
</div>
<div class="filter-line">
  <span class="prompt">$</span>
  <span class="cmd">range</span>
  <span class="flag">--period</span>
  <div class="period"> {periodOptions.map(...)} </div>
</div>
```

### 7.3 Pills(重写样式)
- `border-radius: 2px`(改直角)
- `border: 1px solid var(--border)`
- `background: transparent`
- 激活态:`color: var(--text)`,`background: rgba(255,159,47,.05)`,`border-color: var(--vc)`
- 激活态 dot:`box-shadow: 0 0 12px var(--vc)`
- 激活态 `::before` 光效叠层:`background: linear-gradient(90deg, var(--vc), transparent)`,`opacity: .06`

### 7.4 Period 分段按钮(替换 `<select>`)
```html
<div class="period" data-current={period}>
  <button data-v="last-12m" class:list={...}>last-12m</button>
  <button data-v="last-6m" class:list={...}>last-6m</button>
  {availableYears.map((y) => <button data-v={y} class:list={...}>{y}</button>)}
  <button data-v="all" class:list={...}>all</button>
</div>
```
- 容器 `border: 1px solid var(--border)`, `border-radius: 2px`, `overflow: hidden`
- 按钮 `border-right: 1px solid var(--border)`, 最后一个 `border-right: 0`
- active 态:`background: var(--plasma)`, `color: var(--canvas)`, `font-weight: 700`
- `filters.client.ts` 删除 `select.addEventListener('change')` 改为遍历 `.period button`,click 时 `window.location.assign(...)` 带新 period 参数。

### 7.5 Pill actions
```html
<div class="pill-actions">
  <a data-action="select-all">⊕ {t.filter.all}</a>
  <a data-action="select-none">⊖ {t.filter.none}</a>
  <a data-action="reset">⟳ {t.filter.reset}</a>
  <span class="meta">{t.filter.selectedMeta(selectedN, totalN, period)}</span>
</div>
```
- 三 `<a>`:`border-bottom: 1px dashed`,hover → plasma
- `.meta` 右对齐,`color: var(--text-faded)`,客户端 JS 实时更新 N 和 period

### 7.6 客户端逻辑扩展
`filters.client.ts` 新增:
- `applyPeriodButtons(period)`:更新 `.period button.active` 状态
- `updateSelectedMeta()`:实时更新 `.pill-actions .meta` 文案(读 `dataset.lang` 或 `<html lang>` 判断语言)
- `data-action="reset"` handler:`setFilters({ vendors: null, period: null, lang: null })`;等价于直接 `window.location.assign(pathname)`

## 8. 矩阵区重写

### 8.1 区块标题
```html
<div class="matrix-head">
  <h2>
    <span class="num">№ 001</span>
    {t.matrix.heading}
  </h2>
  <div class="legend">
    <span><span class="dash">—</span> {t.matrix.legendEmpty}</span>
    <span>● {t.matrix.legendActive}</span>
  </div>
</div>
```

### 8.2 外框容器
```html
<div class="matrix-scroll">
  <table class="release-table"> ... </table>
</div>
```
- `border: 1px solid var(--border)`
- `background: linear-gradient(180deg, var(--canvas-lift), var(--canvas))`
- `box-shadow: 0 20px 60px -20px rgba(255,159,47,.18)`
- `overflow-x: auto`
- `position: relative`
- `::before`:`linear-gradient(90deg, var(--plasma) 0, transparent 2px) top left /100% 1px no-repeat` —— 顶部 plasma 横线

### 8.3 列头 `.vcol`
```html
<th class="col-vendor" data-vendor={v.id} style={`--vc: ${v.color}`}>
  <div class="vcol">
    <div class="swatch"></div>
    <div class="name">{v.name[lang]}</div>
  </div>
</th>
```
CSS:
- `.vcol` flex-column,`gap: 6px`
- `.swatch` width 100%, height 2px, `background: var(--vc)`, `box-shadow: 0 0 8px var(--vc)`
- `.name` text 色(非 dim)

### 8.4 Thead sticky 位置
- 当前 `top: 64px`
- 改为 `top: var(--statusbar-h, 32px)`,`:root` 里定义 `--statusbar-h: 32px`

### 8.5 Chip 微调
- `border: 1px solid color-mix(in oklab, var(--vc) 30%, transparent)`
- `background: color-mix(in oklab, var(--vc) 8%, transparent)`
- 使用 `::before` 伪元素替代 `.chip-dot` span(5px 圆点 + glow)
- hover:background 提至 20%

### 8.6 空单元格
```css
td.empty {
  color: var(--text-faded);
  text-align: center;
  font-size: 16px;
  padding-top: 8px;
}
```

## 9. StatusBar · Detail · Footer

### 9.1 `StatusBar.astro`(新)
```astro
---
import type { Lang } from '@/lib/url';
import { getDict } from '@/i18n';
interface Props {
  lang: Lang;
  version: string;
  buildDate: string;          // 'YYYY-MM-DD'
  totalReleases: number;
  lastSevenDayCount: number;
}
const { lang, version, buildDate, totalReleases, lastSevenDayCount } = Astro.props;
const t = getDict(lang);
---
<div class="statusbar">
  <span><span class="dot"></span><strong>TMA</strong> / V{version}</span>
  <span class="sb-sep">—</span>
  <span class="sb-meta">
    {t.statusbar.sysPrefix} · {buildDate} UTC · {t.statusbar.entries(totalReleases)} · {t.statusbar.delta(lastSevenDayCount)}
  </span>
  <span></span>
  <span class="lang-toggle">
    <button data-target="zh" class:list={["lang-btn", { active: lang === 'zh' }]}>中</button>
    <button data-target="en" class:list={["lang-btn", { active: lang === 'en' }]}>EN</button>
  </span>
</div>
<script>
  import '@/scripts/lang.client.ts';
</script>
```

**构建期注入**:`index.astro` 读 `package.json` 的 `version`,用 `new Date().toISOString().slice(0,10)` 生成 `buildDate`。

### 9.2 `Hero.astro` Ticker 子结构
```html
<div class="hero-ticker">
  <span class="tag">LIVE_FEED ▸</span>
  <span class="feed">
    {[...recent, ...recent].map((r) => (
      <span class="item">
        <span class="date">{r.date}</span>
        <span class="vendor">{vendorName(r)}</span>
        <span class="model">{r.model}</span>
      </span>
    ))}
  </span>
</div>
```
- `recent = releases.sort(desc).slice(0, 10)`,在 `Hero` props 里传入
- `.feed` `animation: scroll-x 40s linear infinite`
- `@media (prefers-reduced-motion: reduce)`:`.feed { animation: none; }` + 只保留前 3 条(用 CSS `:nth-child(n+4) { display: none }`)

### 9.3 `ReleaseDetail.astro`(样式重写,结构不动)
- 保留 `<dialog id="release-detail">` + `showModal()`
- 容器:`background: rgba(28,24,17,.96)`, `backdrop-filter: blur(10px)`, `border-left: 2px solid var(--vendor-color)`
- Label("OPENAI · 2026-04-16"):厂商色 caps 10px + `letter-spacing: .2em`
- `.detail-model`:Fraunces italic 28px, `'opsz' 36, 'SOFT' 50`
- `.detail-date`:11px dim + `letter-spacing: .05em`
- `.detail-link`:厂商色 + caps + `border-bottom: 1px solid`(去掉当前的 plasma border)

### 9.4 `Footer.astro`(新)
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
  <div>
    <span set:html={t.footer.creditLine} />
    · <a href={`${REPO}/issues/new`}>{t.footer.openIssue}</a>
  </div>
  <div class="marks">
    <a href={REPO}>{t.footer.github}</a>
    <a href={`${REPO}/blob/main/src/data/releases.yaml`}>{t.footer.data}</a>
    <a aria-disabled="true" title="Coming soon" class="disabled">{t.footer.rss}</a>
  </div>
</footer>
```

CSS:
- `max-width: 1440px; margin: 80px auto 0; padding: 24px;`
- `border-top: 1px solid var(--border)`
- `grid-template-columns: 1fr auto; gap: 20px`
- `color: var(--text-faded); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase`
- `.marks { display: flex; gap: 28px }`
- `.marks a.disabled { opacity: 0.35; pointer-events: none; cursor: not-allowed }`

## 10. 动画统一清单

| 名称 | 时长 | 应用位置 | `prefers-reduced-motion` 行为 |
|---|---|---|---|
| `grid-drift` | 80s linear infinite | `.fx-grid` | `animation: none` |
| `pulse` | 2s ease-in-out infinite | statusbar `.dot` | `animation: none` |
| `fadeUp` | 0.8s ease-out forwards | hero 各子元素(staggered) | `animation: none; opacity: 1` |
| `blink` | 1.1s steps(2) infinite | hero italic `::after` 光标 | `animation: none` |
| `scroll-x` | 40s linear infinite | ticker `.feed` | `animation: none`;`.item:nth-child(n+4) { display: none }` |

统一在 `src/styles/global.css` 底部:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  .hero-eyebrow, .hero-title, .hero-sub, .hero-meta, .hero-ticker { opacity: 1; }
  .hero-ticker .feed .item:nth-child(n+4) { display: none; }
}
```

## 11. Fraunces 字体轴验证

当前自托管的 `public/fonts/Fraunces.woff2`(36 KB)大概率只包含 `wght` 轴。v1 需要 `opsz`, `SOFT`, `WONK`, `wght` 全部生效。

**实施阶段验证流程**:
1. `npm run dev` 打开,用 DevTools Computed 面板查看 `.hero-title` 的 `font-variation-settings`
2. 如果 axes 中只列出 `wght`,说明字体不完整

**修复方案**(实施阶段选 A):
- **A.** 从 Google Fonts 下载完整可变字体(含所有 axes)的 WOFF2,替换 `public/fonts/Fraunces.woff2`。参考 URL:`https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,30..100,0..1;1,9..144,300..900,30..100,0..1&display=swap`(拿到的 CSS 里的 `src: url(...)` 指向完整 WOFF2)
- **B.** 改用 Google Fonts CDN(`<link>` in head),加 `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` 降低握手成本。但引入跨域 + 离线失效风险。

默认走 A。

## 12. i18n 文案变更

**新增 `t.statusbar`**:
```ts
statusbar: {
  sysPrefix: 'SYS',
  entries: (n: number) => `${n} ENTRIES`,
  delta: (n: number) => `Δ7D+${n}`,
}
```

**新增 / 修改 `t.hero`**:
```ts
hero: {
  line1: ...,     // 已有
  line2: ...,     // 已有
  tagline: ...,   // 已有,保留作为 meta description 用
  eyebrow: '模型档案 · 第 001 期' | 'ARCHIVE № 001',
  eyebrowSub: '大语言模型发布档案' | 'ARCHIVE OF LLM RELEASES',
  subDescription: '追踪全球主要 AI 厂商的模型发布节奏。<strong>横向对比</strong>谁在什么时刻推送了什么模型,<strong>纵向查看</strong>任一家厂商的发布脉络。数据手工校阅,每日更新。' |
                  'Tracking the release cadence of every major AI vendor. <strong>Compare horizontally</strong> who shipped what when, <strong>read vertically</strong> any single vendor\'s release lineage. Hand-curated, updated daily.',
  kv: {
    vendors: '收录厂商' | 'VENDORS',
    totalReleases: '总发布数' | 'TOTAL RELEASES',
    last7Days: '近 7 日' | 'LAST 7 DAYS',
    mostRecent: '最新一条' | 'MOST RECENT',
  },
}
```

**新增 `t.ticker`**:
```ts
ticker: { tag: 'LIVE_FEED ▸' }
```

**新增 `t.matrix`**:
```ts
matrix: {
  heading: '发布矩阵' | 'Release Matrix',
  number: (n: string) => `№ ${n}`,
  legendEmpty: '当日无发布' | 'NO RELEASE',
  legendActive: '活跃厂商' | 'ACTIVE VENDOR',
}
```

**修改 / 新增 `t.filter`**:
```ts
filter: {
  // 已有字段保留
  heading: '查询' | 'Query',
  headingMono: '// QUERY' | '// SEARCH',
  subtitle: '构造筛选 · 写入 URL · 可分享' | 'Compose · Syncs to URL · Shareable',
  reset: '重置' | 'RESET',
  selectedMeta: (n: number, total: number, period: string) =>
    `已选 ${n} / ${total} 家 · 期间 ${period}` | `${n} OF ${total} ACTIVE · RANGE ${period}`,
}
```

**修改 / 新增 `t.footer`**:
```ts
footer: {
  creditLine: '由 <a href="https://github.com/pan11123">@pan11123</a> 手工维护' |
              'HAND-CURATED BY <a href="https://github.com/pan11123">@pan11123</a>',
  openIssue: '缺失发布?提交 Issue' | 'MISSING A RELEASE? OPEN ISSUE',
  github: 'GITHUB',
  data: 'DATA',
  rss: 'RSS',
}
```

(当前已有的 `footer.repo / updated / contribute` 可以移除,未被引用。)

## 13. 文件变更汇总

**新增**
- `src/components/StatusBar.astro`
- `src/components/Footer.astro`
- `src/components/BgLayers.astro`(4 个 fx div 的封装,保持 DOM 干净)

**删除**
- `src/components/Header.astro`
- `src/components/LangSwitch.astro`(内联进 StatusBar)

**修改**
- `src/components/Hero.astro` — eyebrow / title cursor / subDescription / KV / ticker
- `src/components/FilterBar.astro` — 区块标题 / prompt / pills 样式 / 分段按钮 period
- `src/components/ReleaseTable.astro` — 区块标题 / matrix-scroll 外框 / vcol 列头 / empty cell 样式
- `src/components/ReleaseChip.astro` — `::before` dot / 色值微调
- `src/components/ReleaseDetail.astro` — 样式重写(结构保留)
- `src/scripts/filters.client.ts` — Period 按钮处理 / reset action / selected meta 更新
- `src/scripts/lang.client.ts` — 选择器改为 `.lang-toggle .lang-btn`
- `src/styles/tokens.css` — 新 color / opacity tokens + `--statusbar-h`
- `src/styles/global.css` — 4 层 fx CSS + animations + reduced-motion 规则
- `src/styles/components.css` — 全部重写(statusbar / hero / filter / matrix / chip / detail / footer)
- `src/i18n/zh.ts` + `src/i18n/en.ts` — 按 §12 扩展
- `src/pages/index.astro` — 渲染 BgLayers / StatusBar / Hero(新 props)/ Footer;计算 `lastSevenDayCount` 和 `mostRecentDate`

**公共数据**
- `public/fonts/Fraunces.woff2` — 可能需要用完整 axes 版本替换(实施阶段验证)

## 14. 测试

### 14.1 Unit tests
- 现有 28 个测试应全部保留且通过。
- 新增一个 `tests/unit/heroStats.test.ts` 验证统计辅助函数(如果抽成独立 pure function):
  - `countLastSevenDays(releases, now)`:给定固定 `now` 和一组 release,返回正确计数
  - `mostRecentDate(releases)`:返回最大日期字符串
  - 这两个函数如果内联在 `index.astro` 就不写单测;抽到 `src/lib/stats.ts` 则写 3-4 个小测试

### 14.2 E2E
现有 5 个测试需要更新 selector:
- `smoke.spec.ts`:`h1` 位置没变;`.chip` 仍存在;`dialog#release-detail` 仍存在。**无需改动。**
- `filter.spec.ts` 第一个测试:`.pill[data-vendor="openai"]` 仍存在。`vendors=` 查询参数机制不变。**无需改动。**
- `filter.spec.ts` 第二个测试:`selectOption('.period-select', 'all')` 将不再工作(改成了 button)。**需要改写** → 点击 `.period button[data-v="all"]`,waitForURL 不变。

## 15. 不做(明确 YAGNI)

- RSS 真实 feed 生成(footer 链接占位)
- 主题切换(深/浅)
- 视觉回归测试
- 数据量扩大(仍用现有 10 vendors / 15 releases)
- 字体子集化 / gzip 优化
- 自定义域名
