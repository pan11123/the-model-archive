import { parseFilters, serializeFilters, type Filters } from '@/lib/url';
import { isValidPeriod, type Period } from '@/lib/period';

const META_SELECTOR = '[data-role="meta"]';

function getFilters(): Filters {
  return parseFilters(window.location.search);
}

function replaceUrl(next: Filters) {
  const qs = serializeFilters(next);
  const url = `${window.location.pathname}${qs}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}

function dateMatchesPeriod(date: string, period: Period): boolean {
  if (period === 'all') return true;
  if (period === 'last-12m' || period === 'last-6m') {
    const months = period === 'last-12m' ? 12 : 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return new Date(date) >= cutoff;
  }
  return date.startsWith(`${period}-`);
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

  const period = f.period ?? 'last-12m';
  document.querySelectorAll<HTMLTableRowElement>('tr[data-date]').forEach((row) => {
    const inPeriod = dateMatchesPeriod(row.dataset.date!, period as Period);
    if (!inPeriod) {
      row.classList.add('hidden');
      return;
    }
    const visible = row.querySelectorAll('td.col-vendor:not(.hidden) .chip');
    row.classList.toggle('hidden', visible.length === 0);
  });

  updateMeta(activeSet.size, allPills.length);
}

function updatePeriodButtons(f: Filters) {
  const active = f.period ?? 'last-12m';
  document.querySelectorAll<HTMLButtonElement>('.period-btn[data-v]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.v === active);
  });
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

  // Reset — clear all filters client-side
  document.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    replaceUrl({ vendors: null, period: null, lang: null });
    applyVendorVisibility({ vendors: null, period: null, lang: null });
    updatePeriodButtons({ vendors: null, period: null, lang: null });
  });

  // Period buttons — client-side filter (no reload)
  document.querySelectorAll<HTMLButtonElement>('.period-btn[data-v]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.v!;
      if (!isValidPeriod(v)) return;
      const p = v as Period;
      const next: Filters = { ...getFilters(), period: p === 'last-12m' ? null : p };
      replaceUrl(next);
      updatePeriodButtons(next);
      applyVendorVisibility(next);
    });
  });

  applyVendorVisibility(getFilters());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
