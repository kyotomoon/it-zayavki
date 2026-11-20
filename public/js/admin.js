/* Личный кабинет администратора: статистика, все заявки, пользователи, справочники */

const Admin = {
  stats(main) {
    const { tickets, statuses, categories, users } = API.db;
    const total = tickets.length;
    const count = (field, id) => tickets.filter(t => t[field] === id).length;
    const active = t => [STATUS.NEW, STATUS.WORK, STATUS.WAIT].includes(t.statusId);
    const pct = n => total ? Math.round(n / total * 100) : 0;
    const bars = (rows, cls) => rows.map(r => `
      <div class="bar-row"><span>${esc(r.name)}</span><div class="bar"><i class="${cls(r)}" style="width:${r.pct}%"></i></div><b>${r.n}</b></div>`).join('');

    const byStatus = statuses.map(s => ({ ...s, n: count('statusId', s.id) })).map(r => ({ ...r, pct: pct(r.n) }));
    const byCategory = categories.map(c => ({ ...c, n: count('categoryId', c.id) })).map(r => ({ ...r, pct: pct(r.n) }));
    const specialists = users.filter(u => u.roleId === ROLE.SPECIALIST).map(u => {
      const mine = tickets.filter(t => t.executorId === u.id);
      return { u, active: mine.filter(active).length, done: mine.filter(t => t.statusId === STATUS.DONE).length };
    });
    const maxLoad = Math.max(1, ...specialists.map(s => s.active));
    const unassigned = tickets.filter(t => !t.executorId && active(t));

    // Расчёты: время выполнения считается по истории статусов (от создания до статуса «Выполнена»)
    const doneTickets = tickets.filter(t => t.statusId === STATUS.DONE);
    const doneAt = t => API.db.statusHistory
      .filter(h => h.ticketId === t.id && h.statusId === STATUS.DONE)
      .map(h => new Date(h.changedAt)).sort((a, b) => b - a)[0] || new Date(t.updatedAt);
    const hours = t => (doneAt(t) - new Date(t.createdAt)) / 3600000;
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const fmtHours = h => h >= 24 ? `${(h / 24).toFixed(1)} дн.` : `${h.toFixed(1)} ч`;
    const onTime = doneTickets.filter(t => doneAt(t) <= deadline(t)).length;
    const specCount = users.filter(u => u.roleId === ROLE.SPECIALIST).length;
    const metrics = [
      ['Выполнено заявок', `${pct(doneTickets.length)} %`, `${doneTickets.length} из ${total}`],
      ['Выполнено в срок', `${doneTickets.length ? Math.round(onTime / doneTickets.length * 100) : 0} %`, `${onTime} из ${doneTickets.length} выполненных`],
      ['Среднее время выполнения', fmtHours(avg(doneTickets.map(hours))), 'от создания до статуса «Выполнена»'],
      ['Средняя нагрузка', `${(tickets.filter(active).length / Math.max(1, specCount)).toFixed(1)}`, 'активных заявок на одного специалиста']
    ];
    const specRows = users.filter(u => u.roleId === ROLE.SPECIALIST).map(u => {
      const mine = tickets.filter(t => t.executorId === u.id);
      const done = mine.filter(t => t.statusId === STATUS.DONE);
      return `<tr><td class="t-title"><b>${esc(u.fullName)}</b></td>
        <td data-label="Всего">${mine.length}</td><td data-label="Активных">${mine.filter(active).length}</td>
        <td data-label="Выполнено">${done.length}</td>
        <td data-label="Среднее время">${done.length ? fmtHours(avg(done.map(hours))) : '—'}</td>
        <td data-label="Просрочено">${mine.filter(isOverdue).length}</td></tr>`;
    }).join('');

    main.innerHTML = `
      <div class="page-head"><div><h1>Статистика</h1><p>Общая картина по заявкам IT-отдела</p></div></div>
      <div class="kpis">
        <div class="kpi"><span>Всего заявок</span><b>${total}</b></div>
        <div class="kpi k-new"><span>Без исполнителя</span><b>${unassigned.length}</b></div>
        <div class="kpi k-work"><span>В работе</span><b>${tickets.filter(active).length}</b></div>
        <div class="kpi k-red"><span>Просрочено</span><b>${tickets.filter(isOverdue).length}</b></div>
      </div>
      <div class="card"><h2>Показатели работы отдела</h2>
        <div class="metrics">${metrics.map(([name, value, note]) => `<div><span>${name}</span><b>${value}</b><small>${note}</small></div>`).join('')}</div>
      </div>
      <div class="grid-2">
        <div class="card"><h2>По статусам</h2>${bars(byStatus, r => 'c-' + STATUS_CLASS[r.id])}</div>
        <div class="card"><h2>По категориям</h2>${bars(byCategory, () => '')}</div>
      </div>
      <div class="grid-2">
        <div class="card"><h2>Загрузка специалистов</h2>
          ${specialists.map(s => `
            <div class="bar-row"><span>${esc(shortName(s.u.fullName))}</span>
            <div class="bar"><i class="c-work" style="width:${Math.round(s.active / maxLoad * 100)}%"></i></div><b>${s.active}</b></div>`).join('')}
          <p class="muted" style="margin:0;font-size:13px">Число активных заявок у каждого специалиста</p>
        </div>
        <div class="card"><h2>Ждут назначения</h2>
          ${unassigned.length ? `<ul class="list">${unassigned.sort(byNewest).map(t => `
            <li><div class="grow"><b>${ticketNo(t.id)} ${esc(t.title)}</b><span>${esc(shortName(userName(t.authorId)))} · ${fmtDate(t.createdAt)}</span></div>
            ${priorityBadge(t.priorityId)}<button class="btn btn-sm" data-ticket="${t.id}">Назначить</button></li>`).join('')}</ul>`
            : emptyState('Все заявки распределены')}
        </div>
      </div>
      <h2 class="section-h">Работа специалистов</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Специалист</th><th>Всего</th><th>Активных</th><th>Выполнено</th><th>Среднее время</th><th>Просрочено</th></tr></thead>
        <tbody>${specRows}</tbody></table></div>`;
    bindTicketRows(main, () => App.show('stats'));
  },

  tickets(main) {
    main.innerHTML = `
      <div class="page-head"><div><h1>Все заявки</h1><p>Назначение исполнителей и контроль статусов</p></div></div>
      ${filtersHtml({ executor: true })}
      <div class="filters-actions"><span class="found"></span><span>Нажмите на заявку, чтобы назначить исполнителя</span></div>
      <div class="tickets-box"></div>`;
    setupFilters(main, () => API.db.tickets, {}, () => App.show('all'));
  },

  users(main) {
    const { users, roles } = API.db;
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Пользователи</h1><p>Учётные записи и роли</p></div>
        <button class="btn" id="add-user">${icon('plus')} Добавить пользователя</button>
      </div>
      <form class="filters" style="grid-template-columns:2fr 1fr" autocomplete="off">
        <input class="input search" name="q" type="search" placeholder="Поиск по ФИО или почте">
        <select class="input" name="role">${options('roles', 'Все роли')}</select>
      </form>
      <div class="users-box"></div>`;

    const form = $('.filters', main);
    const render = () => {
      const q = form.elements.q.value.toLowerCase().trim();
      const role = +form.elements.role.value;
      const list = users.filter(u => (!q || (u.fullName + u.email).toLowerCase().includes(q)) && (!role || u.roleId === role));
      $('.users-box', main).innerHTML = !list.length ? `<div class="table-wrap">${emptyState('Никого не найдено')}</div>` : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>ФИО</th><th>Почта</th><th>Телефон</th><th>Отдел</th><th>Роль</th><th></th></tr></thead>
          <tbody>${list.map(u => `
            <tr>
              <td class="t-title"><b>${esc(u.fullName)}</b></td>
              <td data-label="Почта">${esc(u.email)}</td>
              <td data-label="Телефон">${esc(u.phone || '—')}</td>
              <td data-label="Отдел">${esc(nameOf('departments', u.departmentId))}</td>
              <td data-label="Роль"><select class="input" data-role="${u.id}" ${u.id === App.user.id ? 'disabled title="Свою роль менять нельзя"' : ''}>
                ${roles.map(r => `<option value="${r.id}" ${r.id === u.roleId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td>
              <td data-label="">${u.id === App.user.id ? '<span class="muted">Это вы</span>' : `<button class="btn btn-sm btn-ghost" data-del="${u.id}">Удалить</button>`}</td>
            </tr>`).join('')}</tbody>
        </table></div>`;

      $$('[data-role]', main).forEach(sel => sel.addEventListener('change', async () => {
        await API.update('users', +sel.dataset.role, { roleId: +sel.value });
        toast('Роль изменена');
      }));
      $$('[data-del]', main).forEach(btn => btn.addEventListener('click', async () => {
        const id = +btn.dataset.del;
        const busy = API.db.tickets.some(t => t.authorId === id || t.executorId === id);
        if (busy) return toast('Нельзя удалить: у пользователя есть заявки');
        if (!confirm(`Удалить пользователя ${userName(id)}?`)) return;
        await API.remove('users', id);
        toast('Пользователь удалён');
        Admin.users(main);
      }));
    };
    form.addEventListener('input', render);
    form.addEventListener('submit', e => e.preventDefault());
    render();

    $('#add-user', main).addEventListener('click', () => Admin.userForm(() => Admin.users(main)));
  },

  userForm(onSave) {
    const modal = openModal(`
      <div class="modal-head"><div><h2>Новый пользователь</h2><div class="muted">Пароль по умолчанию сотрудник сменит при входе</div></div>
        <button class="modal-close" data-close aria-label="Закрыть">&times;</button></div>
      <div class="modal-body">
        <form id="user-form" novalidate>
          <div class="field"><label>ФИО *</label><input class="input" name="fullName" placeholder="Фамилия Имя Отчество"></div>
          <div class="form-row">
            <div class="field"><label>Почта *</label><input class="input" name="email" type="email" placeholder="name@firma.ru"></div>
            <div class="field"><label>Телефон</label><input class="input" name="phone" placeholder="+7 (900) 000-00-00"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Отдел *</label><select class="input" name="departmentId">${options('departments', 'Выберите отдел')}</select></div>
            <div class="field"><label>Роль *</label><select class="input" name="roleId">${options('roles', 'Выберите роль', ROLE.EMPLOYEE)}</select></div>
          </div>
          <div class="field"><label>Пароль *</label><input class="input" name="password" type="text" value="test123"></div>
          <div class="form-actions"><button class="btn" type="submit">Сохранить</button><button class="btn btn-ghost" type="button" data-close>Отмена</button></div>
        </form>
      </div>`);
    $('#user-form', modal).addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target;
      const ok = validate(form, {
        fullName: v => v.split(/\s+/).length < 2 ? 'Укажите фамилию и имя' : '',
        email: v => !isEmail(v) ? 'Неверный формат почты' : API.db.users.some(u => u.email === v) ? 'Такая почта уже есть' : '',
        departmentId: v => !v ? 'Выберите отдел' : '',
        roleId: v => !v ? 'Выберите роль' : '',
        password: v => v.length < 6 ? 'Минимум 6 символов' : ''
      });
      if (!ok) return;
      const f = form.elements;
      await API.create('users', {
        fullName: f.fullName.value.trim(), email: f.email.value.trim(), password: f.password.value,
        phone: f.phone.value.trim(), roleId: +f.roleId.value, departmentId: +f.departmentId.value
      });
      closeModal();
      toast('Пользователь добавлен');
      onSave();
    });
  },

  dicts(main) {
    const { categories, priorities, departments, tickets, users } = API.db;
    main.innerHTML = `
      <div class="page-head"><div><h1>Справочники</h1><p>Категории заявок, приоритеты и отделы</p></div></div>
      <div class="grid-2">
        <div class="card">
          <h2>Категории заявок</h2>
          <ul class="list">${categories.map(c => `
            <li><div class="grow"><b>${esc(c.name)}</b><span>${esc(c.description)}</span></div>
            <span class="tag">${tickets.filter(t => t.categoryId === c.id).length} заяв.</span>
            <button class="btn btn-sm btn-ghost" data-del-cat="${c.id}">Удалить</button></li>`).join('')}</ul>
          <form class="inline-form" id="cat-form" novalidate>
            <div class="field" style="flex:1;margin:0"><input class="input" name="name" placeholder="Новая категория"></div>
            <button class="btn" type="submit">Добавить</button>
          </form>
        </div>
        <div>
          <div class="card">
            <h2>Приоритеты</h2>
            <ul class="list">${priorities.map(p => `
              <li><div class="grow">${priorityBadge(p.id)}</div><span class="muted">срок ${p.deadlineHours} ч.</span></li>`).join('')}</ul>
          </div>
          <div class="card">
            <h2>Отделы</h2>
            <ul class="list">${departments.map(d => `
              <li><div class="grow"><b>${esc(d.name)}</b></div><span class="tag">${users.filter(u => u.departmentId === d.id).length} чел.</span></li>`).join('')}</ul>
            <form class="inline-form" id="dep-form" novalidate>
              <div class="field" style="flex:1;margin:0"><input class="input" name="name" placeholder="Новый отдел"></div>
              <button class="btn" type="submit">Добавить</button>
            </form>
          </div>
        </div>
      </div>`;

    const addTo = (formId, table, extra = {}) => $(formId, main).addEventListener('submit', async e => {
      e.preventDefault();
      const ok = validate(e.target, {
        name: v => !v ? 'Введите название' : API.db[table].some(r => r.name.toLowerCase() === v.toLowerCase()) ? 'Такое название уже есть' : ''
      });
      if (!ok) return;
      await API.create(table, { name: e.target.elements.name.value.trim(), ...extra });
      toast('Добавлено');
      Admin.dicts(main);
    });
    addTo('#cat-form', 'categories', { description: 'Новая категория' });
    addTo('#dep-form', 'departments');

    $$('[data-del-cat]', main).forEach(btn => btn.addEventListener('click', async () => {
      const id = +btn.dataset.delCat;
      if (tickets.some(t => t.categoryId === id)) return toast('Нельзя удалить: есть заявки этой категории');
      await API.remove('categories', id);
      toast('Категория удалена');
      Admin.dicts(main);
    }));
  }
};
