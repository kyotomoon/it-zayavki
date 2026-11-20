/*
 * Работа с данными через REST API (json-server).
 *
 * Все данные сайт получает извне: запросами fetch к json-server,
 * который отдаёт базу db.json по адресам /api/... (см. routes.json).
 *   GET    /api/tickets          — список
 *   GET    /api/users?email=...  — поиск по полю
 *   POST   /api/tickets          — добавить запись
 *   PATCH  /api/tickets/5        — изменить запись
 *   DELETE /api/users/7          — удалить запись
 *
 * localStorage, sessionStorage и cookie не используются:
 * в браузере данные хранятся только в памяти до перезагрузки страницы.
 */
const API = {
  // Если сайт открыт с самого json-server (http://127.0.0.1:3000) — адрес относительный,
  // если через Live Server или другой порт — обращаемся к json-server напрямую.
  // Адрес API из js/config.js (для сайта в интернете), иначе — локальный json-server.
  baseUrl: (typeof API_URL !== 'undefined' && API_URL) || (location.port === '3000' ? '/api' : 'http://127.0.0.1:3000/api'),
  tables: ['roles', 'departments', 'users', 'categories', 'priorities', 'statuses', 'tickets', 'comments', 'statusHistory'],
  db: null,

  // Демо-режим для бесплатного хостинга без сервера (Netlify, GitHub Pages):
  // включается сам, если сайт открыт не с локального компьютера и в config.js не задан API_URL.
  // Данные загружаются запросом fetch из файла data/db.json, изменения живут до перезагрузки страницы.
  demo: false,
  memory: null,
  ready: null,

  // Определяем, откуда брать данные:
  // 1) адрес из config.js; 2) локальный json-server; 3) json-server на том же сайте (например, Render);
  // 4) если сервера нет (Netlify, GitHub Pages) — демо-режим.
  init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
      if ((typeof API_URL !== 'undefined' && API_URL) || local || location.port === '3000') return;
      try {
        const res = await fetch('/api/roles', { cache: 'no-store' });
        const ok = res.ok && (res.headers.get('content-type') || '').includes('json');
        if (ok) { this.baseUrl = '/api'; return; }
      } catch (e) { /* сервера нет */ }
      this.demo = true;
    })();
    return this.ready;
  },

  async demoRequest(method, path, body) {
    if (!this.memory) {
      const res = await fetch('data/db.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Не удалось загрузить data/db.json');
      this.memory = await res.json();
    }
    const [route, query = ''] = path.slice(1).split('?');
    const [table, idPart] = route.split('/');
    const rows = this.memory[table];
    const id = +idPart;
    if (method === 'GET') {
      const params = [...new URLSearchParams(query)];
      return params.length ? rows.filter(r => params.every(([k, v]) => String(r[k]) === v)) : rows;
    }
    if (method === 'POST') {
      const row = { id: Math.max(0, ...rows.map(r => r.id)) + 1, ...body };
      rows.push(row);
      return row;
    }
    if (method === 'PATCH') return Object.assign(rows.find(r => r.id === id), body);
    if (method === 'DELETE') { this.memory[table] = rows.filter(r => r.id !== id); return null; }
  },

  async request(method, path, body) {
    await this.init();
    if (this.demo) return this.demoRequest(method, path, body);
    let res;
    try {
      res = await fetch(this.baseUrl + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
    } catch (e) {
      throw new Error('Сервер не запущен. Запустите start.bat в папке проекта (или команду npm start) и откройте http://127.0.0.1:3000');
    }
    if (!res.ok) throw new Error(`Ошибка запроса ${method} ${path}: ${res.status}`);
    return res.status === 204 ? null : res.json();
  },

  get(path) { return this.request('GET', path); },

  // Запрос, который браузер отправит даже при закрытии страницы (keepalive)
  patchOnLeave(path, body) {
    try {
      fetch(this.baseUrl + path, { method: 'PATCH', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) { /* страница уже закрывается */ }
  },

  // Загрузка всех таблиц с сервера (вызывается при каждом переходе по разделам,
  // чтобы на экране всегда были свежие данные)
  async load() {
    const parts = await Promise.all(this.tables.map(t => this.get(`/${t}`)));
    this.db = {};
    this.tables.forEach((t, i) => { this.db[t] = parts[i]; });
    return this.db;
  },

  // POST /table — добавить запись (id назначает сервер)
  async create(table, data) {
    const row = await this.request('POST', `/${table}`, data);
    if (!this.demo) this.db?.[table]?.push(row);
    return row;
  },

  // PATCH /table/id — изменить запись
  async update(table, id, patch) {
    const row = await this.request('PATCH', `/${table}/${id}`, patch);
    const local = this.db?.[table]?.find(r => r.id === id);
    if (local) Object.assign(local, row);
    return row;
  },

  // DELETE /table/id — удалить запись
  async remove(table, id) {
    await this.request('DELETE', `/${table}/${id}`);
    if (this.demo) { this.db[table] = this.memory[table]; return; }
    if (this.db?.[table]) this.db[table] = this.db[table].filter(r => r.id !== id);
  },

  // Вход: GET /api/users?email=...&password=...
  async login(email, password) {
    const q = new URLSearchParams({ email, password });
    const found = await this.get(`/users?${q}`);
    return found[0] || null;
  },

  async emailExists(email) {
    const found = await this.get(`/users?${new URLSearchParams({ email })}`);
    return found.length > 0;
  }
};
