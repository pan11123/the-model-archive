import { parseFilters, serializeFilters, type Filters } from '@/lib/url';
import { isValidPeriod, type Period } from '@/lib/period';

function getFilters(): Filters {
  return parseFilters(window.location.search);
}

function setFilters(next: Filters) {
  const qs = serializeFilters(next);
  const url = `${window.location.pathname}${qs}${window.location.hash}`;
  window.history.replaceState(null, '', url);
  applyFilters(next);
}

function applyFilters(f: Filters) {
  const allVendorButtons = document.querySelectorAll<HTMLButtonElement>('.pill[data-vendor]');
  const selected = f.vendors ? new Set(f.vendors) : null;

  allVendorButtons.forEach((btn) => {
    const id = btn.dataset.vendor!;
    const active = selected ? selected.has(id) : true;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const activeVendorSet = new Set<string>();
  allVendorButtons.forEach((btn) => {
    if (btn.classList.contains('active')) activeVendorSet.add(btn.dataset.vendor!);
  });

  document.querySelectorAll<HTMLElement>('[data-vendor]').forEach((el) => {
    if (el.classList.contains('pill')) return;
    const id = el.dataset.vendor!;
    el.classList.toggle('hidden', !activeVendorSet.has(id));
  });

  document.querySelectorAll<HTMLTableRowElement>('tr[data-date]').forEach((row) => {
    const visibleCells = row.querySelectorAll('td.col-vendor:not(.hidden) .chip');
    row.classList.toggle('hidden', visibleCells.length === 0);
  });

  const select = document.querySelector<HTMLSelectElement>('.period-select');
  if (select) select.value = f.period ?? 'last-12m';
}

function init() {
  document.querySelectorAll<HTMLButtonElement>('.pill[data-vendor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = getFilters();
      const all = Array.from(document.querySelectorAll<HTMLButtonElement>('.pill[data-vendor]'))
        .map((b) => b.dataset.vendor!);
      const currentSet = new Set(current.vendors ?? all);
      const id = btn.dataset.vendor!;
      if (currentSet.has(id)) currentSet.delete(id);
      else currentSet.add(id);
      const next: Filters = {
        ...current,
        vendors: currentSet.size === all.length ? null : Array.from(currentSet),
      };
      setFilters(next);
    });
  });

  document.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
    setFilters({ ...getFilters(), vendors: null });
  });
  document.querySelector('[data-action="select-none"]')?.addEventListener('click', () => {
    setFilters({ ...getFilters(), vendors: [] });
  });

  const select = document.querySelector<HTMLSelectElement>('.period-select');
  select?.addEventListener('change', () => {
    const v = select.value;
    if (!isValidPeriod(v)) return;
    const p = v as Period;
    const next: Filters = { ...getFilters(), period: p === 'last-12m' ? null : p };
    const qs = serializeFilters(next);
    window.location.assign(`${window.location.pathname}${qs}${window.location.hash}`);
  });

  applyFilters(getFilters());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
