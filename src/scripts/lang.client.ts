const STORAGE_KEY = 'the-model-archive:lang';

document.querySelectorAll<HTMLElement>('.lang-switch').forEach((root) => {
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
