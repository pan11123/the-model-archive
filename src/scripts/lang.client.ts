import { zh } from '@/i18n/zh';
import { en } from '@/i18n/en';
import type { Dict } from '@/i18n';

type Lang = 'zh' | 'en';
const STORAGE_KEY = 'the-model-archive:lang';
const dicts: Record<Lang, Dict> = { zh, en };

function detectLang(): Lang {
  const params = new URLSearchParams(window.location.search);
  const p = params.get('lang');
  if (p === 'zh' || p === 'en') return p;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === 'zh' || s === 'en') return s;
  } catch { /* ignore */ }
  const nav = (navigator.language || '').toLowerCase();
  return nav.indexOf('zh') === 0 ? 'zh' : 'en';
}

function setUrlLang(lang: Lang) {
  const url = new URL(window.location.href);
  const current = url.searchParams.get('lang');
  if (current === lang) return;
  url.searchParams.set('lang', lang);
  window.history.replaceState(null, '', url.toString());
}

// Static text replacements: selector → function that returns text from dict
const STATIC_TEXT: Array<{ sel: string; fn: (d: Dict) => string; html?: boolean }> = [
  { sel: 'title', fn: d => `${d.siteTitle} · ${d.siteSubtitle}` },
  // Hero
  { sel: '.hero-eyebrow > span:first-child', fn: d => d.hero.eyebrow },
  { sel: '.hero-eyebrow .sub', fn: d => `· ${d.hero.eyebrowSub}` },
  { sel: '.hero-sub', fn: d => d.hero.subDescription, html: true },
  { sel: '.hero-meta .kv:nth-child(1) .k', fn: d => d.hero.kv.vendors },
  { sel: '.hero-meta .kv:nth-child(2) .k', fn: d => d.hero.kv.totalReleases },
  { sel: '.hero-meta .kv:nth-child(3) .k', fn: d => d.hero.kv.last7Days },
  { sel: '.hero-meta .kv:nth-child(4) .k', fn: d => d.hero.kv.mostRecent },
  { sel: '.hero-ticker .tag', fn: d => d.ticker.tag },
  // Filter
  { sel: '.filter-heading h2', fn: d => `${d.filter.heading} `, html: true, selOverride: '.filter-heading h2' },
  { sel: '.filter-heading .dim', fn: d => d.filter.subtitle },
  { sel: 'a[data-action="select-all"]', fn: d => `⊕ ${d.filter.all}` },
  { sel: 'a[data-action="select-none"]', fn: d => `⊖ ${d.filter.none}` },
  { sel: 'a[data-action="reset"]', fn: d => `⟳ ${d.filter.reset}` },
  // Matrix
  { sel: '.matrix-head .legend span:nth-child(1)', fn: d => `— ${d.matrix.legendEmpty}` },
  { sel: '.matrix-head .legend span:nth-child(2)', fn: d => `● ${d.matrix.legendActive}` },
  // Footer
  { sel: '.site-footer .footer-main span:nth-child(3)', fn: d => d.footer.creditLine, html: true },
  { sel: '.site-footer .footer-main a', fn: d => d.footer.openIssue },
  { sel: '.site-footer .marks a:nth-child(1)', fn: d => d.footer.github },
  { sel: '.site-footer .marks a:nth-child(2)', fn: d => d.footer.data },
  { sel: '.site-footer .marks a:nth-child(3)', fn: d => d.footer.rss },
];

// Update vendor name spans. They have data-name-zh and data-name-en attributes.
function updateVendorNames(lang: Lang) {
  document.querySelectorAll<HTMLElement>('[data-name-zh]').forEach(el => {
    el.textContent = lang === 'zh' ? el.dataset.nameZh! : el.dataset.nameEn!;
  });
}

// Update statusbar meta (needs numeric data from data attributes)
function updateStatusbarMeta(d: Dict) {
  const el = document.querySelector<HTMLElement>('.sb-meta');
  if (!el) return;
  const total = el.dataset.total ?? '0';
  const delta = el.dataset.delta ?? '0';
  const date = el.dataset.date ?? '';
  el.textContent = `${d.statusbar.sysPrefix} · ${date} UTC · ${d.statusbar.entries(+total)} · ${d.statusbar.delta(+delta)}`;
}

// Update the filter heading (has both italic text and mono code)
function updateFilterHeading(d: Dict) {
  const h2 = document.querySelector('.filter-heading h2');
  if (h2) {
    h2.innerHTML = `${d.filter.heading} <span class="hmono">${d.filter.headingMono}</span>`;
  }
}

// Update matrix heading
function updateMatrixHeading(d: Dict) {
  const h2 = document.querySelector('.matrix-head h2');
  if (h2) {
    h2.innerHTML = `<span class="num">${d.matrix.number('001')}</span> ${d.matrix.heading}`;
  }
}

// Update thead date column
function updateTableHead(d: Dict) {
  const th = document.querySelector('table.release-table thead th.col-date');
  if (th) th.textContent = d.table.colDate;
}

// Update period button labels
function updatePeriodButtons(d: Dict) {
  document.querySelectorAll<HTMLButtonElement>('.period-btn[data-v]').forEach(btn => {
    const v = btn.dataset.v!;
    if (v === 'last-12m') btn.textContent = d.filter.periodLast12m;
    else if (v === 'last-6m') btn.textContent = d.filter.periodLast6m;
    else if (v === 'all') btn.textContent = d.filter.periodAll;
    else btn.textContent = d.filter.periodYear(v);
  });
}

// Update the filter meta line
function updateFilterMeta(d: Dict, lang: Lang) {
  const meta = document.querySelector<HTMLElement>('[data-role="meta"]');
  if (!meta) return;
  const allPills = document.querySelectorAll('.pill[data-vendor]');
  const activePills = document.querySelectorAll('.pill.active[data-vendor]');
  const periodBtn = document.querySelector<HTMLButtonElement>('.period-btn.active');
  const periodLabel = periodBtn?.textContent?.trim() ?? '';
  const n = activePills.length;
  const total = allPills.length;
  meta.textContent = d.filter.selectedMeta(n, total, periodLabel);
}

// Update hero title
function updateHeroTitle(d: Dict) {
  const title = document.querySelector('.hero-title');
  if (title) {
    title.innerHTML = `${d.hero.line1}<br><span class="italic">${d.hero.line2}</span>`;
  }
}

// Update detail dialog dict
function updateDetailDict(d: Dict) {
  window.__RL_DICT = d.detail;
}

// Update detail dialog payload vendor names
function updateDetailPayload(lang: Lang) {
  const payloadEl = document.getElementById('release-payload');
  if (!payloadEl) return;
  try {
    const payload = JSON.parse(payloadEl.textContent || '{}');
    const vendorDataEl = document.getElementById('vendor-data');
    const vendorData: Record<string, { nameZh: string; nameEn: string }> = vendorDataEl
      ? JSON.parse(vendorDataEl.textContent || '{}')
      : {};
    for (const key of Object.keys(payload)) {
      const item = payload[key];
      const vd = vendorData[item.vendor];
      if (vd) item.vendorName = lang === 'zh' ? vd.nameZh : vd.nameEn;
    }
    payloadEl.textContent = JSON.stringify(payload);
  } catch { /* ignore */ }
}

// Main apply function
function applyLang(lang: Lang) {
  const d = dicts[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  // Static text
  for (const { sel, fn, html } of STATIC_TEXT) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (html) el.innerHTML = fn(d);
    else el.textContent = fn(d);
  }

  // Special updates
  updateHeroTitle(d);
  updateFilterHeading(d);
  updateMatrixHeading(d);
  updateStatusbarMeta(d);
  updateTableHead(d);
  updatePeriodButtons(d);
  updateVendorNames(lang);
  updateFilterMeta(d, lang);
  updateDetailDict(d);
  updateDetailPayload(lang);

  // Toggle active state
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === lang);
  });

  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  setUrlLang(lang);
}

// Export for other scripts
(window as any).__getLang = detectLang;

// Init
function init() {
  const lang = detectLang();

  // If the rendered language doesn't match, apply the correct one
  const renderedLang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
  if (lang !== renderedLang) {
    applyLang(lang);
  }

  // Toggle buttons
  document.querySelectorAll<HTMLButtonElement>('.lang-toggle').forEach(root => {
    root.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target as Lang;
        if (target !== 'zh' && target !== 'en') return;
        applyLang(target);
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
