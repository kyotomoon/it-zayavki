/* Личный кабинет специалиста IT-отдела: назначенные заявки с фильтрами */

const Specialist = {
  myTasks() {
    return API.db.tickets.filter(t => t.executorId === App.user.id);
  },

  list(main) {
    const tasks = Specialist.myTasks();
    const count = s => tasks.filter(t => t.statusId === s).length;
    const overdue = tasks.filter(isOverdue).length;
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Мои задачи</h1><p>Заявки, которые администратор назначил вам</p></div>
      </div>
      <div class="kpis">
        <div class="kpi k-work"><span>В работе</span><b>${count(STATUS.WORK)}</b></div>
        <div class="kpi k-wait"><span>Ожидают ответа</span><b>${count(STATUS.WAIT)}</b></div>
        <div class="kpi k-red"><span>Просрочено</span><b>${overdue}</b></div>
        <div class="kpi k-done"><span>Выполнено</span><b>${count(STATUS.DONE)}</b></div>
      </div>
      ${filtersHtml()}
      <div class="filters-actions"><span class="found"></span><span>Нажмите на заявку, чтобы изменить статус</span></div>
      <div class="tickets-box"></div>`;
    setupFilters(main, Specialist.myTasks, { executor: false }, () => App.show('tasks'));
  },

  // Очередь: все заявки отдела, чтобы видеть общую картину
  queue(main) {
    main.innerHTML = `
      <div class="page-head">
        <div><h1>Все заявки</h1><p>Общая очередь IT-отдела (только просмотр и комментарии)</p></div>
      </div>
      ${filtersHtml({ executor: true })}
      <div class="filters-actions"><span class="found"></span></div>
      <div class="tickets-box"></div>`;
    setupFilters(main, () => API.db.tickets, {}, () => App.show('queue'));
  }
};
