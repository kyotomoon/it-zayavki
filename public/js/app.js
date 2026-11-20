/*
 * Приложение «Личный кабинет»: вход, регистрация, шапка, боковое меню и переключение разделов.
 *
 * Вошедший пользователь хранится только в переменной App.user (в памяти страницы).
 * localStorage/sessionStorage не используются, поэтому после перезагрузки страницы
 * нужно войти снова — так и задумано по требованию к проекту.
 */
const MENUS = {
  [ROLE.EMPLOYEE]: [
    { id: 'tickets', title: 'Мои заявки', icon: 'list', render: m => Employee.list(m) },
    { id: 'new', title: 'Новая заявка', icon: 'plus', render: m => Employee.form(m) },
    { id: 'profile', title: 'Профиль', icon: 'user', render: m => renderProfile(m) }
  ],
  [ROLE.SPECIALIST]: [
    { id: 'tasks', title: 'Мои задачи', icon: 'tool', render: m => Specialist.list(m) },
    { id: 'queue', title: 'Все заявки', icon: 'list', render: m => Specialist.queue(m) },
    { id: 'profile', title: 'Профиль', icon: 'user', render: m => renderProfile(m) }
  ],
  [ROLE.ADMIN]: [
    { id: 'stats', title: 'Статистика', icon: 'chart', render: m => Admin.stats(m) },
    { id: 'all', title: 'Все заявки', icon: 'list', render: m => Admin.tickets(m) },
    { id: 'users', title: 'Пользователи', icon: 'users', render: m => Admin.users(m) },
    { id: 'dicts', title: 'Справочники', icon: 'book', render: m => Admin.dicts(m) },
    { id: 'profile', title: 'Профиль', icon: 'user', render: m => renderProfile(m) }
  ]
};

const DEMO = { employee: 'ivanov@firma.ru', specialist: 'kozlov@firma.ru', admin: 'smirnova@firma.ru' };

/*
 * Сессия входа. Хранится не в браузере, а в базе: у пользователя поле lastSeen
 * (время последней активности). Пока кабинет открыт, раз в 30 секунд поле обновляется
 * запросом PATCH /api/users/:id. При выходе или закрытии страницы оно очищается.
 * Если lastSeen свежее 90 секунд — пользователь уже авторизован, повторный вход запрещён.
 */
const Session = {
  timer: null,
  userId: null,
  TTL: 90 * 1000,

  isActive(user) {
    return !!user.lastSeen && Date.now() - new Date(user.lastSeen).getTime() < this.TTL;
  },
  async start(id) {
    this.userId = id;
    await API.update('users', id, { lastSeen: new Date().toISOString() }).catch(() => {});
    clearInterval(this.timer);
    this.timer = setInterval(() => API.update('users', id, { lastSeen: new Date().toISOString() }).catch(() => {}), 30 * 1000);
  },
  stop() {
    clearInterval(this.timer);
    if (this.userId) API.update('users', this.userId, { lastSeen: null }).catch(() => {});
    this.userId = null;
  },
  // Закрытие или перезагрузка вкладки — тоже выход
  leave() {
    clearInterval(this.timer);
    if (this.userId && !API.demo) API.patchOnLeave(`/users/${this.userId}`, { lastSeen: null });
  }
};
window.addEventListener('pagehide', () => Session.leave());

const App = {
  user: null,
  section: null,
  root: document.getElementById('app'),

  start() {
    Theme.init();
    // Переходы по кнопкам с атрибутом data-go="раздел"
    document.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go && App.user) { e.preventDefault(); App.show(go.dataset.go); }
      if (!e.target.closest('.bell-wrap') || e.target.closest('.bell-item')) $('.bell-menu')?.classList.add('hidden');
    });
    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (App.user && id && id !== App.section) App.show(id);
    });
    App.renderAuth();
  },

  /* ---------- Вход и регистрация ---------- */
  renderAuth(tab = 'login') {
    App.root.innerHTML = `
      <header class="header">
        <div class="header-inner container">
          <a class="logo" href="index.html"><img src="img/logo.svg" alt=""><span>IT-Заявки<small>учёт заявок в IT-отдел</small></span></a>
          <div class="header-actions" style="margin-left:auto">
            ${Theme.switchHtml()}
            <a class="back-link" href="index.html">← На главную</a>
          </div>
        </div>
      </header>
      <main class="auth-page">
        <div class="auth-card">
          <h1>${tab === 'login' ? 'Вход в систему' : 'Регистрация'}</h1>
          <p class="auth-sub">${tab === 'login' ? 'Войдите под рабочей почтой' : 'Создайте учётную запись сотрудника'}</p>
          <div class="tabs" role="tablist">
            <button type="button" role="tab" class="${tab === 'login' ? 'active' : ''}" data-tab="login">Вход</button>
            <button type="button" role="tab" class="${tab === 'register' ? 'active' : ''}" data-tab="register">Регистрация</button>
          </div>
          <div id="auth-body"><div class="loader">Загрузка…</div></div>
        </div>
      </main>`;
    Theme.set(Theme.current);
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => App.renderAuth(b.dataset.tab)));
    tab === 'login' ? App.loginForm() : App.registerForm();
  },

  loginForm() {
    $('#auth-body').innerHTML = `
      <form id="login-form" novalidate>
        <div class="form-error hidden" id="login-error"></div>
        <div class="field"><label for="lf-email">Электронная почта</label>
          <input class="input" id="lf-email" name="email" type="email" placeholder="ivanov@firma.ru" autocomplete="username"></div>
        <div class="field"><label for="lf-pass">Пароль</label>
          <input class="input" id="lf-pass" name="password" type="password" placeholder="••••••" autocomplete="current-password"></div>
        <div class="auth-row"><a href="#" id="forgot">Забыли пароль?</a></div>
        <button class="btn btn-block btn-lg" type="submit">Войти</button>
      </form>
      <div class="demo">
        <p>Быстрый вход для проверки (пароль test123)</p>
        <div class="demo-buttons">
          <button class="btn btn-outline btn-sm" type="button" data-demo="employee">Сотрудник</button>
          <button class="btn btn-outline btn-sm" type="button" data-demo="specialist">Специалист</button>
          <button class="btn btn-outline btn-sm" type="button" data-demo="admin">Админ</button>
        </div>
      </div>`;

    const form = $('#login-form');
    const errorBox = $('#login-error');
    $('#forgot').addEventListener('click', e => { e.preventDefault(); toast('Для сброса пароля обратитесь в IT-отдел: доб. 100'); });
    $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
      form.elements.email.value = DEMO[b.dataset.demo];
      form.elements.password.value = 'test123';
      form.requestSubmit();
    }));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errorBox.classList.add('hidden');
      const ok = validate(form, {
        email: v => !v ? 'Введите почту' : !isEmail(v) ? 'Неверный формат почты' : '',
        password: v => !v ? 'Введите пароль' : ''
      });
      if (!ok) return;
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const email = form.elements.email.value.trim();
        const fail = msg => { errorBox.textContent = msg; errorBox.classList.remove('hidden'); };
        // Войти могут только пользователи, которые есть в базе
        if (!(await API.emailExists(email))) return fail('Пользователь с такой почтой не зарегистрирован. Проверьте почту или пройдите регистрацию.');
        const user = await API.login(email, form.elements.password.value);
        if (!user) return fail('Неверный пароль. Попробуйте ещё раз.');
        // Нельзя войти повторно, пока пользователь уже авторизован (в другой вкладке или на другом компьютере)
        if (Session.isActive(user)) return fail('Этот пользователь уже авторизован. Сначала выйдите из личного кабинета, затем войдите снова.');
        App.enter(user);
        toast(`Добро пожаловать, ${user.fullName.split(' ').slice(1).join(' ') || user.fullName}!`);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });
  },

  async registerForm() {
    let departments = [];
    try { departments = await API.get('/departments'); }
    catch (err) { $('#auth-body').innerHTML = `<div class="form-error">${esc(err.message)}</div>`; return; }

    $('#auth-body').innerHTML = `
      <form id="reg-form" novalidate>
        <div class="form-error hidden" id="reg-error"></div>
        <div class="field"><label for="rf-name">ФИО *</label>
          <input class="input" id="rf-name" name="fullName" placeholder="Фамилия Имя Отчество" autocomplete="name"></div>
        <div class="field"><label for="rf-email">Рабочая почта *</label>
          <input class="input" id="rf-email" name="email" type="email" placeholder="name@firma.ru" autocomplete="email"></div>
        <div class="form-row">
          <div class="field"><label for="rf-phone">Телефон</label>
            <input class="input" id="rf-phone" name="phone" type="tel" placeholder="+7 (900) 000-00-00"></div>
          <div class="field"><label for="rf-dep">Отдел *</label>
            <select class="input" id="rf-dep" name="departmentId"><option value="">Выберите отдел</option>
              ${departments.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="field"><label for="rf-pass">Пароль *</label>
            <input class="input" id="rf-pass" name="password" type="password" placeholder="Не короче 6 символов" autocomplete="new-password"></div>
          <div class="field"><label for="rf-pass2">Повторите пароль *</label>
            <input class="input" id="rf-pass2" name="password2" type="password" autocomplete="new-password"></div>
        </div>
        <button class="btn btn-block btn-lg" type="submit">Зарегистрироваться</button>
        <p class="hint center">Новые пользователи получают роль «Сотрудник». Роль специалиста назначает администратор.</p>
      </form>`;

    const form = $('#reg-form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = form.elements;
      const ok = validate(form, {
        fullName: v => v.split(/\s+/).filter(Boolean).length < 2 ? 'Укажите фамилию и имя' : '',
        email: v => !isEmail(v) ? 'Неверный формат почты' : '',
        phone: v => v && v.replace(/\D/g, '').length < 10 ? 'Неверный номер телефона' : '',
        departmentId: v => !v ? 'Выберите отдел' : '',
        password: v => v.length < 6 ? 'Минимум 6 символов' : '',
        password2: v => v !== f.password.value ? 'Пароли не совпадают' : ''
      });
      if (!ok) return;
      const errorBox = $('#reg-error');
      try {
        if (await API.emailExists(f.email.value.trim())) return setError(f.email, 'Пользователь с такой почтой уже есть');
        const user = await API.create('users', {
          fullName: f.fullName.value.trim().replace(/\s+/g, ' '),
          email: f.email.value.trim(),
          password: f.password.value,
          phone: f.phone.value.trim(),
          roleId: ROLE.EMPLOYEE,
          departmentId: +f.departmentId.value
        });
        App.enter(user);
        toast('Регистрация прошла успешно. Добро пожаловать!');
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      }
    });
  },

  /* ---------- Личный кабинет ---------- */
  enter(user) {
    App.user = user;
    Session.start(user.id);
    App.renderLayout();
    const first = location.hash.slice(1);
    App.show(MENUS[user.roleId].some(m => m.id === first) ? first : MENUS[user.roleId][0].id);
  },

  logout() {
    if (!confirm('Выйти из личного кабинета?')) return;
    Session.stop();
    App.user = null;
    App.section = null;
    API.db = null;
    history.replaceState(null, '', location.pathname + location.search);
    App.renderAuth();
    toast('Вы вышли из системы');
  },

  renderLayout() {
    const u = App.user;
    App.root.innerHTML = `
      <header class="header">
        <div class="header-inner cab-header">
          <a class="logo" href="#" data-go="${MENUS[u.roleId][0].id}" title="В начало личного кабинета"><img src="img/logo.svg" alt=""><span>IT-Заявки<small>учёт заявок в IT-отдел</small></span></a>
          <div class="header-user">
            ${Theme.switchHtml()}
            <div class="bell-wrap">
              <button class="icon-btn" id="bell" aria-label="Уведомления">${icon('bell', 20)}<i class="dot hidden"></i></button>
              <div class="bell-menu hidden" id="bell-menu"></div>
            </div>
            <div class="avatar">${esc(initials(u.fullName))}</div>
            <div class="who"><span class="name">${esc(u.fullName)}</span><span class="role" id="who-role"></span></div>
            <button class="btn btn-ghost btn-sm" id="logout">${icon('logout')}<span class="logout-text">Выйти</span></button>
          </div>
        </div>
      </header>
      <div class="cabinet">
        <aside class="sidebar">
          <div class="sidebar-title">Личный кабинет</div>
          <nav class="menu">
            ${MENUS[u.roleId].map(m => `<button type="button" data-go="${m.id}">${icon(m.icon)}<span>${m.title}</span><span class="count hidden"></span></button>`).join('')}
          </nav>
        </aside>
        <main class="main" id="main"></main>
      </div>`;
    Theme.set(Theme.current);
    $('#logout').addEventListener('click', () => App.logout());
    $('#bell').addEventListener('click', () => $('#bell-menu').classList.toggle('hidden'));
  },

  // Показать раздел: свежие данные с сервера + отрисовка
  async show(id) {
    const menu = MENUS[App.user.roleId];
    const item = menu.find(m => m.id === id) || menu[0];
    App.section = item.id;
    if (location.hash !== '#' + item.id) history.pushState(null, '', '#' + item.id);
    $$('.menu [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === item.id));
    const main = $('#main');
    if (!API.db) main.innerHTML = '<div class="loader">Загрузка данных…</div>';
    try {
      await API.load();
      // Данные пользователя тоже берём с сервера (роль могли изменить)
      App.user = find('users', App.user.id) || App.user;
      item.render(main);
      App.updateHeader();
      window.scrollTo(0, 0);
    } catch (err) {
      main.innerHTML = `<div class="server-error"><b>Нет связи с сервером</b>${esc(err.message)}
        <button class="btn btn-sm" onclick="App.show('${item.id}')">Повторить</button></div>`;
    }
  },

  // Счётчики в меню и уведомления
  updateHeader() {
    const u = App.user;
    const active = t => [STATUS.NEW, STATUS.WORK, STATUS.WAIT].includes(t.statusId);
    $('#who-role').textContent = `${nameOf('roles', u.roleId)} · ${nameOf('departments', u.departmentId)}`;

    let counts = {}, notes = [], title = '';
    const tickets = API.db.tickets;
    if (u.roleId === ROLE.EMPLOYEE) {
      const mine = tickets.filter(t => t.authorId === u.id);
      counts = { tickets: mine.filter(active).length };
      notes = mine.filter(t => t.statusId === STATUS.WAIT);
      title = 'Ждут вашего ответа';
    } else if (u.roleId === ROLE.SPECIALIST) {
      const mine = tickets.filter(t => t.executorId === u.id);
      counts = { tasks: mine.filter(active).length };
      notes = mine.filter(t => t.statusId === STATUS.NEW || isOverdue(t));
      title = 'Новые и просроченные задачи';
    } else {
      notes = tickets.filter(t => !t.executorId && active(t));
      counts = { all: notes.length };
      title = 'Заявки без исполнителя';
    }
    $$('.menu [data-go]').forEach(b => {
      const n = counts[b.dataset.go];
      const box = $('.count', b);
      box.textContent = n || '';
      box.classList.toggle('hidden', !n);
    });
    $('#bell .dot').classList.toggle('hidden', !notes.length);
    $('#bell-menu').innerHTML = `<div class="bell-title">${title}</div>` + (notes.length
      ? notes.sort(byNewest).slice(0, 6).map(t => `
          <button type="button" class="bell-item" data-ticket="${t.id}">
            <b>${ticketNo(t.id)} ${esc(t.title)}</b><span>${esc(nameOf('statuses', t.statusId))} · ${fmtDate(t.createdAt)}</span>
          </button>`).join('')
      : '<div class="bell-empty">Новых уведомлений нет</div>');
    bindTicketRows($('#bell-menu'), () => App.show(App.section));
  }
};

App.start();
