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
