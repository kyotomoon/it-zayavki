/* Личный кабинет сотрудника: мои заявки, новая заявка */

const Employee = {
  myTickets() {
    return API.db.tickets.filter(t => t.authorId === App.user.id);
  },

  list(main) {
    const mine = Employee.myTickets();
    const count = s => mine.filter(t => t.statusId === s).length;
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Мои заявки</h1><p>Здесь видно, на каком этапе каждая ваша заявка</p></div>
        <button class="btn" data-go="new">${icon('plus')} Новая заявка</button>
      </div>
      <div class="kpis">
        <div class="kpi k-new"><span>Новые</span><b>${count(STATUS.NEW)}</b></div>
        <div class="kpi k-work"><span>В работе</span><b>${count(STATUS.WORK)}</b></div>
        <div class="kpi k-wait"><span>Ожидают ответа</span><b>${count(STATUS.WAIT)}</b></div>
        <div class="kpi k-done"><span>Выполнены</span><b>${count(STATUS.DONE)}</b></div>
      </div>
      ${filtersHtml()}
      <div class="filters-actions"><span class="found"></span></div>
      <div class="tickets-box"></div>`;
    setupFilters(main, Employee.myTickets, { author: false }, () => App.show('tickets'));
  },

  form(main) {
    main.innerHTML = `
      <div class="page-head"><div><h1>Новая заявка</h1><p>Опишите проблему — специалист IT-отдела возьмёт её в работу</p></div></div>
      <div class="card" style="max-width:760px">
        <form id="ticket-form" novalidate>
          <div class="field">
            <label for="tf-title">Тема заявки *</label>
            <input class="input" id="tf-title" name="title" maxlength="100" placeholder="Например: Не печатает принтер в кабинете 105">
          </div>
          <div class="form-row">
            <div class="field">
              <label for="tf-cat">Категория *</label>
              <select class="input" id="tf-cat" name="categoryId">${options('categories', 'Выберите категорию')}</select>
              <div class="hint" id="tf-cat-hint"></div>
            </div>
            <div class="field">
              <label for="tf-prio">Приоритет *</label>
              <select class="input" id="tf-prio" name="priorityId">${options('priorities', 'Выберите приоритет', 2)}</select>
              <div class="hint" id="tf-prio-hint"></div>
            </div>
          </div>
          <div class="field">
            <label for="tf-desc">Описание проблемы *</label>
            <textarea class="input" id="tf-desc" name="description" maxlength="1000" placeholder="Что случилось, когда началось, номер кабинета или компьютера"></textarea>
          </div>
          <div class="field">
            <label for="tf-file">Файл или скриншот</label>
            <input class="input" id="tf-file" name="file" type="file" accept="image/*,.pdf">
            <div class="hint">JPG, PNG или PDF, не больше 5 МБ</div>
          </div>
          <div class="form-actions">
            <button class="btn" type="submit">Отправить заявку</button>
            <button class="btn btn-ghost" type="button" data-go="tickets">Отмена</button>
          </div>
        </form>
      </div>`;

    const form = $('#ticket-form', main);
    const showHints = () => {
      const cat = find('categories', +form.elements.categoryId.value);
      const prio = find('priorities', +form.elements.priorityId.value);
      $('#tf-cat-hint').textContent = cat ? cat.description : '';
      $('#tf-prio-hint').textContent = prio ? `Срок выполнения — до ${prio.deadlineHours} ч.` : '';
    };
    form.addEventListener('change', showHints);
    showHints();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const ok = validate(form, {
        title: v => !v ? 'Укажите тему заявки' : v.length < 5 ? 'Тема должна быть не короче 5 символов' : '',
        categoryId: v => !v ? 'Выберите категорию' : '',
        priorityId: v => !v ? 'Выберите приоритет' : '',
        description: v => !v ? 'Опишите проблему' : v.length < 10 ? 'Опишите подробнее (минимум 10 символов)' : '',
        file: (v, input) => input.files[0]?.size > 5 * 1024 * 1024 ? 'Файл больше 5 МБ' : ''
      });
      if (!ok) return;

      const f = form.elements;
      const now = nowIso();
      const ticket = await API.create('tickets', {
        title: f.title.value.trim(),
        description: f.description.value.trim(),
        createdAt: now,
        updatedAt: now,
        authorId: App.user.id,
        executorId: null,
        categoryId: +f.categoryId.value,
        priorityId: +f.priorityId.value,
        statusId: STATUS.NEW
      });
      await API.create('statusHistory', { ticketId: ticket.id, statusId: STATUS.NEW, userId: App.user.id, changedAt: now });
      // Сам файл json-server принять не может, поэтому в переписке сохраняется его название
      const file = f.file.files[0];
      if (file) await API.create('comments', { ticketId: ticket.id, userId: App.user.id, text: `Прикреплён файл: ${file.name}`, createdAt: now });
      toast(`Заявка ${ticketNo(ticket.id)} отправлена`);
      App.show('tickets');
    });
  }
};
