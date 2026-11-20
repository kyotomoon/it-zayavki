/* Общие функции интерфейса: форматирование, метки, таблица заявок, карточка заявки */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STATUS = { NEW: 1, WORK: 2, WAIT: 3, DONE: 4, REJECTED: 5 };
const ROLE = { EMPLOYEE: 1, SPECIALIST: 2, ADMIN: 3 };
const STATUS_CLASS = { 1: 'new', 2: 'work', 3: 'wait', 4: 'done', 5: 'rejected' };
const PRIORITY_CLASS = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };

// Иконки (SVG, чтобы не подключать сторонние библиотеки)
const ICONS = {
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// Экранирование текста, чтобы пользовательский ввод не ломал разметку
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso, withTime = true) {
  if (!iso) return '—';
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Date(iso).toLocaleString('ru-RU', opts);
}

// Текущее время в формате базы: 2026-10-05T08:15:00
function nowIso() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const find = (table, id) => API.db[table].find(r => r.id === id);
const nameOf = (table, id) => find(table, id)?.name ?? '—';
const userName = id => find('users', id)?.fullName ?? 'Не назначен';

function shortName(fullName) {
  if (!fullName) return 'Не назначен';
  const [last, first = '', middle = ''] = fullName.split(' ');
  return `${last} ${first ? first[0] + '.' : ''}${middle ? ' ' + middle[0] + '.' : ''}`;
}
const initials = fullName => fullName.split(' ').slice(0, 2).map(w => w[0]).join('');

const statusBadge = id => `<span class="badge status-${STATUS_CLASS[id]}">${esc(nameOf('statuses', id))}</span>`;
const priorityBadge = id => `<span class="badge prio prio-${PRIORITY_CLASS[id]}">${esc(nameOf('priorities', id))}</span>`;
const ticketNo = id => '№ ' + String(id).padStart(4, '0');

// Крайний срок = дата создания + норматив приоритета
function deadline(ticket) {
  const hours = find('priorities', ticket.priorityId)?.deadlineHours ?? 24;
  return new Date(new Date(ticket.createdAt).getTime() + hours * 3600 * 1000);
}
function isOverdue(ticket) {
  const closed = [STATUS.DONE, STATUS.REJECTED].includes(ticket.statusId);
  return !closed && deadline(ticket) < new Date();
}

const byNewest = (a, b) => b.createdAt.localeCompare(a.createdAt);

function toast(message) {
  $('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2800);
}

function emptyState(title, text = '') {
  return `<div class="empty">${icon('inbox', 40)}<b>${esc(title)}</b>${esc(text)}</div>`;
}

/* ---------- Проверка форм ---------- */
function setError(input, message) {
  input.classList.toggle('invalid', !!message);
  let box = input.parentElement.querySelector('.error-text');
  if (!box) {
    box = document.createElement('div');
    box.className = 'error-text';
    input.parentElement.append(box);
  }
  box.textContent = message || '';
  return !message;
}
// rules: { имяПоля: value => 'текст ошибки' | '' }
function validate(form, rules) {
  let ok = true;
  for (const [name, check] of Object.entries(rules)) {
    const input = form.elements[name];
    const valid = setError(input, check(input.value.trim(), input));
    if (!valid && ok) input.focus();
    ok = ok && valid;
  }
  return ok;
}
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/* ---------- Таблица заявок ---------- */
function ticketsTable(tickets, { author = true, executor = true } = {}) {
  if (!tickets.length) return `<div class="table-wrap">${emptyState('Заявок не найдено', 'Измените условия поиска или фильтры.')}</div>`;
  const rows = tickets.map(t => `
    <tr class="clickable" data-ticket="${t.id}">
      <td class="num" data-label="Номер">${ticketNo(t.id)}</td>
      <td class="t-title"><b>${esc(t.title)}</b><span>${esc(nameOf('categories', t.categoryId))}</span></td>
      ${author ? `<td data-label="Автор">${esc(shortName(userName(t.authorId)))}</td>` : ''}
      ${executor ? `<td data-label="Исполнитель">${t.executorId ? esc(shortName(userName(t.executorId))) : '<span class="muted">Не назначен</span>'}</td>` : ''}
      <td data-label="Приоритет">${priorityBadge(t.priorityId)}</td>
      <td data-label="Статус">${statusBadge(t.statusId)}</td>
      <td data-label="Создана" class="${isOverdue(t) ? 'overdue' : ''}" title="${isOverdue(t) ? 'Срок истёк' : ''}">${fmtDate(t.createdAt)}</td>
    </tr>`).join('');
  return `
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Номер</th><th>Тема</th>${author ? '<th>Автор</th>' : ''}${executor ? '<th>Исполнитель</th>' : ''}<th>Приоритет</th><th>Статус</th><th>Создана</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

// Клик по строке открывает карточку заявки
function bindTicketRows(root, onChange) {
  $$('[data-ticket]', root).forEach(row => {
    row.addEventListener('click', () => openTicket(+row.dataset.ticket, onChange));
  });
}

/* ---------- Фильтры списка заявок ---------- */
function options(table, placeholder, selected) {
  return `<option value="">${placeholder}</option>` +
    API.db[table].map(r => `<option value="${r.id}" ${r.id === selected ? 'selected' : ''}>${esc(r.name ?? r.fullName)}</option>`).join('');
}

function filtersHtml({ executor = false } = {}) {
  return `
    <form class="filters" autocomplete="off">
      <input class="input search" name="q" type="search" placeholder="Поиск по номеру или теме">
      <select class="input" name="status">${options('statuses', 'Все статусы')}</select>
      <select class="input" name="priority">${options('priorities', 'Все приоритеты')}</select>
      <select class="input" name="category">${options('categories', 'Все категории')}</select>
      ${executor
        ? `<select class="input" name="executor"><option value="">Все исполнители</option><option value="none">Без исполнителя</option>${API.db.users.filter(u => u.roleId === ROLE.SPECIALIST).map(u => `<option value="${u.id}">${esc(shortName(u.fullName))}</option>`).join('')}</select>`
        : '<input class="input" name="date" type="date" title="Дата создания">'}
    </form>`;
}

function applyFilters(tickets, form) {
  const f = Object.fromEntries(new FormData(form));
  const q = (f.q || '').toLowerCase().replace('№', '').trim();
  return tickets.filter(t =>
    (!q || t.title.toLowerCase().includes(q) || String(t.id) === q.replace(/^0+/, '')) &&
    (!f.status || t.statusId === +f.status) &&
    (!f.priority || t.priorityId === +f.priority) &&
    (!f.category || t.categoryId === +f.category) &&
    (!f.date || t.createdAt.startsWith(f.date)) &&
    (!f.executor || (f.executor === 'none' ? !t.executorId : t.executorId === +f.executor))
  );
}

// Связывает фильтры с перерисовкой таблицы
function setupFilters(root, getTickets, tableOpts, onChange) {
  const form = $('.filters', root);
  const box = $('.tickets-box', root);
  const counter = $('.found', root);
  const render = () => {
    const list = applyFilters(getTickets(), form).sort(byNewest);
    box.innerHTML = ticketsTable(list, tableOpts);
    if (counter) counter.textContent = `Найдено: ${list.length}`;
    bindTicketRows(box, onChange);
  };
  form.addEventListener('input', render);
  form.addEventListener('submit', e => e.preventDefault());
  render();
}

/* ---------- Модальное окно ---------- */
function openModal(html) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  backdrop.addEventListener('click', e => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal(); });
  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';
  return backdrop;
}
function closeModal() {
  $('.modal-backdrop')?.remove();
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------- Карточка заявки ---------- */
function openTicket(id, onChange) {
  const t = find('tickets', id);
  const me = App.user;
  const isAdmin = me.roleId === ROLE.ADMIN;
  const isExecutor = me.roleId === ROLE.SPECIALIST && t.executorId === me.id;
  const author = find('users', t.authorId);

  const history = API.db.statusHistory.filter(h => h.ticketId === id).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  const comments = API.db.comments.filter(c => c.ticketId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const specialists = API.db.users.filter(u => u.roleId === ROLE.SPECIALIST);

  let actions = '';
  if (isAdmin || isExecutor) {
    actions = `
      <form class="actions-box" id="ticket-actions">
        ${isAdmin ? `
          <div class="field"><label for="ta-exec">Исполнитель</label>
            <select class="input" id="ta-exec" name="executorId">
              <option value="">Не назначен</option>
              ${specialists.map(u => `<option value="${u.id}" ${u.id === t.executorId ? 'selected' : ''}>${esc(u.fullName)}</option>`).join('')}
            </select></div>` : ''}
        <div class="field"><label for="ta-status">Статус</label>
          <select class="input" id="ta-status" name="statusId">${options('statuses', 'Выберите статус', t.statusId).replace('<option value="">Выберите статус</option>', '')}</select></div>
        <button class="btn" type="submit">Сохранить</button>
      </form>`;
  }

  const html = `
    <div class="modal-head">
      <div>
        <div class="muted">${ticketNo(t.id)} · ${esc(nameOf('categories', t.categoryId))}</div>
        <h2>${esc(t.title)}</h2>
        <div class="badges">${statusBadge(t.statusId)} ${priorityBadge(t.priorityId)} ${isOverdue(t) ? '<span class="badge status-rejected">Просрочена</span>' : ''}</div>
      </div>
      <button class="modal-close" data-close aria-label="Закрыть">&times;</button>
    </div>
    <div class="modal-body">
      <div class="details">
        <div><span>Автор</span><b>${esc(author?.fullName)}</b></div>
        <div><span>Отдел</span><b>${esc(nameOf('departments', author?.departmentId))}</b></div>
        <div><span>Исполнитель</span><b>${esc(userName(t.executorId))}</b></div>
        <div><span>Создана</span><b>${fmtDate(t.createdAt)}</b></div>
        <div><span>Обновлена</span><b>${fmtDate(t.updatedAt)}</b></div>
        <div><span>Срок выполнения</span><b class="${isOverdue(t) ? 'overdue' : ''}">${fmtDate(deadline(t))}</b></div>
      </div>
      <h3>Описание</h3>
      <p class="description">${esc(t.description)}</p>
      ${actions}
      <h3>История статусов</h3>
      <ul class="timeline">
        ${history.map(h => `<li>${statusBadge(h.statusId)} <span>${fmtDate(h.changedAt)} · ${esc(shortName(userName(h.userId)))}</span></li>`).join('') || '<li class="muted">Нет записей</li>'}
      </ul>
      <h3>Комментарии (${comments.length})</h3>
      <div>
        ${comments.map(c => {
          const u = find('users', c.userId);
          return `<div class="comment ${c.userId === me.id ? 'mine' : ''}">
            <div class="avatar">${esc(initials(u.fullName))}</div>
            <div class="bubble"><div><b>${esc(shortName(u.fullName))}</b> · ${esc(nameOf('roles', u.roleId))} · ${fmtDate(c.createdAt)}</div><p>${esc(c.text)}</p></div>
          </div>`;
        }).join('') || '<p class="muted">Комментариев пока нет.</p>'}
      </div>
      <form id="comment-form" novalidate>
        <div class="field"><label for="cf-text">Комментарий</label><textarea class="input" id="cf-text" name="text" placeholder="Напишите комментарий…" rows="3"></textarea></div>
        <button class="btn btn-outline" type="submit">${icon('send')} Отправить комментарий</button>
      </form>
    </div>`;

  const modal = openModal(html);
  const refresh = () => { onChange?.(); openTicket(id, onChange); };

  $('#ticket-actions', modal)?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target.elements;
    const patch = { updatedAt: nowIso() };
    const newStatus = +f.statusId.value;
    if (f.executorId) patch.executorId = f.executorId.value ? +f.executorId.value : null;
    if (newStatus !== t.statusId) {
      patch.statusId = newStatus;
      await API.create('statusHistory', { ticketId: id, statusId: newStatus, userId: me.id, changedAt: patch.updatedAt });
    }
    await API.update('tickets', id, patch);
    toast('Изменения сохранены');
    refresh();
  });

  $('#comment-form', modal).addEventListener('submit', async e => {
    e.preventDefault();
    const input = e.target.elements.text;
    if (!validate(e.target, { text: v => v.length < 2 ? 'Введите текст комментария' : '' })) return;
    await API.create('comments', { ticketId: id, userId: me.id, text: input.value.trim(), createdAt: nowIso() });
    await API.update('tickets', id, { updatedAt: nowIso() });
    toast('Комментарий добавлен');
    refresh();
  });
}

/* ---------- Профиль (общий для всех ролей) ---------- */
function renderProfile(main) {
  const u = App.user;
  const myTickets = API.db.tickets.filter(t => t.authorId === u.id || t.executorId === u.id);
  main.innerHTML = `
    <div class="page-head"><div><h1>Профиль</h1><p>Личные данные пользователя</p></div></div>
    <div class="card">
      <div class="profile">
        <div class="avatar lg">${esc(initials(u.fullName))}</div>
        <div><h2>${esc(u.fullName)}</h2><span class="role-badge">${esc(nameOf('roles', u.roleId))}</span></div>
      </div>
      <div class="info-grid">
        <div><span>Электронная почта</span><b>${esc(u.email)}</b></div>
        <div><span>Телефон</span><b>${esc(u.phone || '—')}</b></div>
        <div><span>Отдел</span><b>${esc(nameOf('departments', u.departmentId))}</b></div>
        <div><span>Связанных заявок</span><b>${myTickets.length}</b></div>
      </div>
    </div>`;
}
