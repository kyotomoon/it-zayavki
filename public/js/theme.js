/*
 * Светлая и тёмная тема.
 * Тема задаётся классом "dark" на <html>, цвета — CSS-переменными (css/style.css).
 * Выбор НЕ сохраняется в localStorage: при открытии берётся параметр ?theme= из адреса
 * (его передают ссылки между страницами) или системная настройка prefers-color-scheme.
 */
const Theme = {
  current: 'light',

  init() {
    const param = new URLSearchParams(location.search).get('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.set(param === 'dark' || param === 'light' ? param : system);
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-theme]');
      if (btn) this.set(btn.dataset.theme);
    });
  },

  set(theme) {
    this.current = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelectorAll('[data-theme]').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === theme);
      b.setAttribute('aria-pressed', b.dataset.theme === theme);
    });
    this.updateLinks();
  },

  // Добавляет ?theme=... к ссылкам на страницы сайта, чтобы тема сохранялась при переходе
  updateLinks() {
    document.querySelectorAll('a[href$=".html"], a[href*=".html?"], a[href*=".html#"]').forEach(a => {
      const url = new URL(a.getAttribute('href'), location.href);
      url.searchParams.set('theme', this.current);
      a.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
    });
  },

  // Разметка переключателя «солнце / луна»
  switchHtml() {
    return `
      <div class="theme-switch" role="group" aria-label="Тема оформления">
        <button type="button" data-theme="light" title="Светлая тема" aria-label="Светлая тема">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        </button>
        <button type="button" data-theme="dark" title="Тёмная тема" aria-label="Тёмная тема">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>`;
  }
};
