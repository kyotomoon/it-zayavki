/* Главная страница: меню-бургер, цифры, последние заявки и категории из API */

document.getElementById('theme-slot').outerHTML = Theme.switchHtml();
Theme.init();

// Меню на телефоне
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', e => {
  if (e.target.tagName !== 'A') return;
  nav.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', false);
  nav.querySelectorAll('a').forEach(a => a.classList.toggle('active', a === e.target));
});

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS_CLASS = { 1: 'new', 2: 'work', 3: 'wait', 4: 'done', 5: 'rejected' };
const CAT_ICONS = {
  1: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  2: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/>',
  3: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  4: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  5: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  6: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>'
};
const svg = path => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

async function loadHome() {
  try {
    const [tickets, users, categories, statuses, departments] = await Promise.all(
      ['tickets', 'users', 'categories', 'statuses', 'departments'].map(t => API.get('/' + t))
    );

    // Цифры
    const values = [
      tickets.length,
      tickets.filter(t => t.statusId === 4).length,
      users.filter(u => u.roleId === 2).length,
      categories.length
    ];
    document.querySelectorAll('#stats b').forEach((b, i) => { b.textContent = values[i]; });

    // Последние заявки
    const user = id => users.find(u => u.id === id);
    const last = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
    document.getElementById('last-tickets').innerHTML = last.map(t => {
      const a = user(t.authorId);
      const ini = a.fullName.split(' ').slice(0, 2).map(w => w[0]).join('');
      const dep = departments.find(d => d.id === a.departmentId)?.name ?? '';
      const st = statuses.find(s => s.id === t.statusId)?.name ?? '';
      return `<div class="mini-ticket">
        <div class="avatar sm">${esc(ini)}</div>
        <div><b>${esc(t.title)}</b><span class="muted">№ ${String(t.id).padStart(4, '0')} · ${esc(dep)}</span></div>
        <span class="badge status-${STATUS_CLASS[t.statusId]}">${esc(st)}</span>
      </div>`;
    }).join('');

    // Категории
    document.getElementById('cat-grid').innerHTML = categories.map(c => `
      <div class="cat"><div class="icon">${svg(CAT_ICONS[c.id] || CAT_ICONS[6])}</div>
      <div><b>${esc(c.name)}</b><p>${esc(c.description)}</p></div></div>`).join('');
  } catch (err) {
    const msg = `<div class="server-error">${esc(err.message)}</div>`;
    document.getElementById('last-tickets').innerHTML = msg;
    document.getElementById('cat-grid').innerHTML = msg;
  }
}
loadHome();
