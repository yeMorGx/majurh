'use client';

import { Icon } from '@/components/ui/icon';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type View = 'overview' | 'kanban' | 'tasks' | 'tracker' | 'calendar' | 'brainstorm';
type KanbanColumnId = 'backlog' | 'doing' | 'done';
type IdeaColumnId = 'raw' | 'shape' | 'next';
type Priority = 'high' | 'medium' | 'low';
type EventTone = 'green' | 'blue' | 'amber';

type BoardCard = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  column: KanbanColumnId;
};

type TodoTask = {
  id: string;
  title: string;
  due: string;
  priority: Priority;
  done: boolean;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  tone: EventTone;
  source: 'local' | 'google' | 'outlook';
};

type Idea = {
  id: string;
  title: string;
  body: string;
  author: string;
  color: 'yellow' | 'lilac' | 'blue' | 'peach';
  column: IdeaColumnId;
};

const tabs: Array<{ id: View; label: string; icon: 'layout-dashboard' | 'kanban' | 'list-checks' | 'clock' | 'calendar' | 'lightbulb' }> = [
  { id: 'overview', label: 'Visão geral', icon: 'layout-dashboard' },
  { id: 'kanban', label: 'Kanban', icon: 'kanban' },
  { id: 'tasks', label: 'TO-DO', icon: 'list-checks' },
  { id: 'tracker', label: 'Time tracker', icon: 'clock' },
  { id: 'calendar', label: 'Calendário', icon: 'calendar' },
  { id: 'brainstorm', label: 'Brainstorm', icon: 'lightbulb' },
];

const kanbanColumns: Array<{ id: KanbanColumnId; title: string; hint: string }> = [
  { id: 'backlog', title: 'A fazer', hint: 'Próximas ações' },
  { id: 'doing', title: 'Em andamento', hint: 'Foco de hoje' },
  { id: 'done', title: 'Concluído', hint: 'Feito recentemente' },
];

const ideaColumns: Array<{ id: IdeaColumnId; title: string; hint: string }> = [
  { id: 'raw', title: 'Ideias soltas', hint: 'Tudo começa aqui' },
  { id: 'shape', title: 'Dar forma', hint: 'Agrupar e explorar' },
  { id: 'next', title: 'Próximo passo', hint: 'Tirar do quadro' },
];

const initialBoard: BoardCard[] = [
  { id: 'card-1', title: 'Revisar documentação de João', description: 'Conferir CNH e comprovante de residência.', assignee: 'GM', priority: 'high', column: 'doing' },
  { id: 'card-2', title: 'Agendar entrevista para motorista', description: 'Alinhar horário com a unidade de Contagem.', assignee: 'AR', priority: 'medium', column: 'backlog' },
  { id: 'card-3', title: 'Atualizar modelo de retorno', description: 'Mensagem padrão para candidatos aprovados.', assignee: 'GM', priority: 'low', column: 'backlog' },
  { id: 'card-4', title: 'Publicar vaga de auxiliar', description: 'Vaga revisada e pronta para divulgação.', assignee: 'AR', priority: 'medium', column: 'done' },
];

const initialTasks: TodoTask[] = [
  { id: 'task-1', title: 'Dar retorno para 3 candidatos da entrevista', due: 'Hoje', priority: 'high', done: false },
  { id: 'task-2', title: 'Conferir documentos recebidos pela manhã', due: 'Hoje', priority: 'medium', done: false },
  { id: 'task-3', title: 'Revisar descrição da vaga de motorista', due: 'Amanhã', priority: 'low', done: false },
  { id: 'task-4', title: 'Fechar agenda da próxima semana', due: 'Sex, 18 set', priority: 'medium', done: true },
];

const initialEvents: CalendarEvent[] = [
  { id: 'event-1', title: 'Entrevista · João Silva', date: '2026-09-14', time: '09:30', tone: 'green', source: 'local' },
  { id: 'event-2', title: 'Alinhamento com operação', date: '2026-09-15', time: '14:00', tone: 'blue', source: 'local' },
  { id: 'event-3', title: 'Retorno para candidatos', date: '2026-09-17', time: '16:00', tone: 'amber', source: 'local' },
];

const initialIdeas: Idea[] = [
  { id: 'idea-1', title: 'Trilha de onboarding', body: 'Criar uma sequência simples para o primeiro dia de cada contratado.', author: 'GM', color: 'yellow', column: 'raw' },
  { id: 'idea-2', title: 'Banco de talentos', body: 'Separar candidatos por disponibilidade e região.', author: 'AR', color: 'lilac', column: 'shape' },
  { id: 'idea-3', title: 'Mensagem de cuidado', body: 'Deixar o retorno mais humano mesmo quando a resposta for negativa.', author: 'GM', color: 'blue', column: 'next' },
];

const storageKey = 'vieira-couto-productivity-v1';

export function ProductivityClient() {
  const [activeView, setActiveView] = useState<View>('overview');
  const [board, setBoard] = useState<BoardCard[]>(initialBoard);
  const [tasks, setTasks] = useState<TodoTask[]>(initialTasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [hydrated, setHydrated] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [draggedIdea, setDraggedIdea] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const [newCardTitle, setNewCardTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaBody, setNewIdeaBody] = useState('');
  const [selectedDay, setSelectedDay] = useState(formatLocalDate(new Date()));
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [newEvent, setNewEvent] = useState({ title: '', time: '10:00', date: formatLocalDate(new Date()) });
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'priority'>('all');
  const [timerSeconds, setTimerSeconds] = useState(24 * 60 + 18);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTask, setTimerTask] = useState('Dar retorno para 3 candidatos da entrevista');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<{ board: BoardCard[]; tasks: TodoTask[]; events: CalendarEvent[]; ideas: Idea[] }>;
        if (Array.isArray(parsed.board)) setBoard(parsed.board);
        if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
        if (Array.isArray(parsed.events)) setEvents(parsed.events);
        if (Array.isArray(parsed.ideas)) setIdeas(parsed.ideas);
      }
    } catch {
      // Dados locais inválidos não devem impedir o uso da tela.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ board, tasks, events, ideas }));
  }, [board, tasks, events, ideas, hydrated]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setTimerSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const completedTasks = tasks.filter((task) => task.done).length;
  const todayEvents = events.filter((event) => event.date === formatLocalDate(new Date())).length;
  const focusMinutes = Math.floor(timerSeconds / 60);
  const calendarCells = useMemo(() => buildCalendarCells(viewMonth), [viewMonth]);
  const selectedEvents = events.filter((event) => event.date === selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'today') return task.due === 'Hoje';
    if (taskFilter === 'priority') return task.priority === 'high';
    return true;
  });

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newCardTitle.trim();
    if (!title) return;
    setBoard((current) => [{ id: makeId('card'), title, description: 'Nova ação do time de RH.', assignee: 'GM', priority: 'medium', column: 'backlog' }, ...current]);
    setNewCardTitle('');
    setNotice('Card adicionado em A fazer.');
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    setTasks((current) => [{ id: makeId('task'), title, due: 'Hoje', priority: 'medium', done: false }, ...current]);
    setNewTaskTitle('');
    setNotice('Tarefa adicionada para hoje.');
  }

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newEvent.title.trim();
    if (!title) return;
    setEvents((current) => [...current, { id: makeId('event'), title, date: newEvent.date, time: newEvent.time, tone: 'green' as EventTone, source: 'local' as const }].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
    setSelectedDay(newEvent.date);
    setNewEvent((current) => ({ ...current, title: '' }));
    setNotice('Evento salvo no calendário local.');
  }

  function addIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newIdeaTitle.trim();
    if (!title) return;
    setIdeas((current) => [{ id: makeId('idea'), title, body: newIdeaBody.trim() || 'Uma ideia para explorar com o time.', author: 'GM', color: 'peach', column: 'raw' }, ...current]);
    setNewIdeaTitle('');
    setNewIdeaBody('');
    setNotice('Ideia adicionada ao quadro.');
  }

  function moveCard(id: string, column: KanbanColumnId) {
    setBoard((current) => current.map((card) => card.id === id ? { ...card, column } : card));
    setDraggedCard(null);
  }

  function moveIdea(id: string, column: IdeaColumnId) {
    setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, column } : idea));
    setDraggedIdea(null);
  }

  function connectCalendar(provider: 'Google Calendar' | 'Outlook') {
    setNotice(`${provider}: conexão OAuth será ativada quando as credenciais da organização forem configuradas.`);
  }

  return (
    <div className="productivity-page">
      <section className="productivity-hero">
        <div className="productivity-hero-copy">
          <p className="eyebrow">Ritmo do time</p>
          <h1>Produtividade sem perder o contexto.</h1>
          <p>Organize as próximas ações, proteja o foco e transforme ideias em movimento — tudo ao lado da operação de RH.</p>
        </div>
        <div className="productivity-day-pulse" aria-label="Resumo do dia">
          <span className="pulse-orbit"><span /></span>
          <div><span className="pulse-label">Pulso de hoje</span><strong>{completedTasks}/{tasks.length} tarefas concluídas</strong><small>{todayEvents} {todayEvents === 1 ? 'evento' : 'eventos'} na agenda</small></div>
        </div>
      </section>

      <nav className="productivity-tabs" aria-label="Ferramentas de produtividade">
        {tabs.map((tab) => <button key={tab.id} className={`productivity-tab ${activeView === tab.id ? 'is-active' : ''}`} onClick={() => setActiveView(tab.id)} aria-current={activeView === tab.id ? 'page' : undefined}><Icon name={tab.icon} size={16} /><span>{tab.label}</span></button>)}
      </nav>

      {notice && <div className="productivity-notice" role="status"><Icon name="check-circle" size={16} /><span>{notice}</span><button className="icon-button" onClick={() => setNotice('')} aria-label="Fechar aviso"><Icon name="x" size={15} /></button></div>}

      {activeView === 'overview' && <Overview onNavigate={setActiveView} focusMinutes={focusMinutes} board={board} tasks={tasks} events={events} ideas={ideas} />}
      {activeView === 'kanban' && <KanbanView board={board} draggedCard={draggedCard} newCardTitle={newCardTitle} onNewCardTitleChange={setNewCardTitle} onAddCard={addCard} onDragStart={setDraggedCard} onDrop={moveCard} />}
      {activeView === 'tasks' && <TasksView tasks={visibleTasks} allTasks={tasks} filter={taskFilter} newTaskTitle={newTaskTitle} onNewTaskTitleChange={setNewTaskTitle} onAddTask={addTask} onFilterChange={setTaskFilter} onToggle={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))} />}
      {activeView === 'tracker' && <TrackerView seconds={timerSeconds} running={timerRunning} task={timerTask} focusMinutes={focusMinutes} tasks={tasks} onTaskChange={setTimerTask} onToggle={() => setTimerRunning((current) => !current)} onReset={() => { setTimerRunning(false); setTimerSeconds(0); }} />}
      {activeView === 'calendar' && <CalendarView month={viewMonth} cells={calendarCells} selectedDay={selectedDay} selectedEvents={selectedEvents} events={events} newEvent={newEvent} onMonthChange={(offset) => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))} onSelectDay={setSelectedDay} onNewEventChange={setNewEvent} onAddEvent={addEvent} onConnect={connectCalendar} />}
      {activeView === 'brainstorm' && <BrainstormView ideas={ideas} draggedIdea={draggedIdea} newIdeaTitle={newIdeaTitle} newIdeaBody={newIdeaBody} onNewIdeaTitleChange={setNewIdeaTitle} onNewIdeaBodyChange={setNewIdeaBody} onAddIdea={addIdea} onDragStart={setDraggedIdea} onDrop={moveIdea} />}
    </div>
  );
}

function Overview({ onNavigate, focusMinutes, board, tasks, events, ideas }: { onNavigate: (view: View) => void; focusMinutes: number; board: BoardCard[]; tasks: TodoTask[]; events: CalendarEvent[]; ideas: Idea[] }) {
  const nextTask = tasks.find((task) => !task.done);
  const nextEvent = [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  return <div className="productivity-overview">
    <div className="productivity-overview-grid">
      <section className="focus-card">
        <div className="focus-card-top"><span className="focus-icon"><Icon name="clock" size={19} /></span><span className="focus-status"><i /> Sessão em dia</span></div>
        <p className="focus-kicker">Foco protegido</p><h2>{formatDuration(focusMinutes * 60)}</h2><p className="focus-copy">O tempo que você reservou para fazer o trabalho importante, sem abrir mão do cuidado com cada processo.</p>
        <button className="button button-light" onClick={() => onNavigate('tracker')}>Abrir time tracker <Icon name="arrow-up-right" size={15} /></button>
      </section>
      <section className="productivity-summary-card"><div className="section-title-row"><div><p className="eyebrow">Agora</p><h2>O que pede atenção</h2></div><Icon name="activity" size={20} /></div><div className="attention-list"><button onClick={() => onNavigate('tasks')}><span className="attention-dot dot-amber" /><span><strong>{nextTask?.title ?? 'Nenhuma tarefa pendente'}</strong><small>{nextTask ? 'Próxima tarefa · ' + nextTask.due : 'Você está em dia'}</small></span><Icon name="chevron-right" size={16} /></button><button onClick={() => onNavigate('calendar')}><span className="attention-dot dot-blue" /><span><strong>{nextEvent?.title ?? 'Agenda livre'}</strong><small>{nextEvent ? `${formatCalendarDate(nextEvent.date)} · ${nextEvent.time}` : 'Adicione um compromisso'}</small></span><Icon name="chevron-right" size={16} /></button><button onClick={() => onNavigate('brainstorm')}><span className="attention-dot dot-lilac" /><span><strong>{ideas.length} ideias no quadro</strong><small>Continue dando forma ao que vem depois</small></span><Icon name="chevron-right" size={16} /></button></div></section>
    </div>
    <div className="productivity-shortcuts"><ShortcutCard icon="kanban" label="Kanban" value={`${board.filter((card) => card.column !== 'done').length} cards ativos`} detail="Veja o fluxo de trabalho" onClick={() => onNavigate('kanban')} /><ShortcutCard icon="list-checks" label="TO-DO" value={`${tasks.filter((task) => !task.done).length} pendências`} detail="Limpe sua lista" onClick={() => onNavigate('tasks')} /><ShortcutCard icon="calendar" label="Calendário" value={`${events.length} compromissos`} detail="Planeje a semana" onClick={() => onNavigate('calendar')} /><ShortcutCard icon="lightbulb" label="Brainstorm" value={`${ideas.length} ideias`} detail="Abra o quadro" onClick={() => onNavigate('brainstorm')} /></div>
    <section className="productivity-principle"><span className="principle-mark">VC</span><div><p className="eyebrow">Um jeito melhor de trabalhar</p><h2>Clareza para a próxima ação. Espaço para pensar.</h2><p>Use o Kanban para o fluxo, o TO-DO para o dia, o timer para o foco e o quadro para o que ainda está nascendo.</p></div><button className="button button-secondary" onClick={() => onNavigate('kanban')}>Começar pelo fluxo <Icon name="arrow-up-right" size={15} /></button></section>
  </div>;
}

function ShortcutCard({ icon, label, value, detail, onClick }: { icon: 'kanban' | 'list-checks' | 'calendar' | 'lightbulb'; label: string; value: string; detail: string; onClick: () => void }) {
  return <button className="shortcut-card" onClick={onClick}><span className={`shortcut-icon shortcut-${icon}`}><Icon name={icon} size={18} /></span><span className="shortcut-copy"><strong>{label}</strong><b>{value}</b><small>{detail}</small></span><Icon name="arrow-up-right" size={16} /></button>;
}

function KanbanView({ board, draggedCard, newCardTitle, onNewCardTitleChange, onAddCard, onDragStart, onDrop }: { board: BoardCard[]; draggedCard: string | null; newCardTitle: string; onNewCardTitleChange: (value: string) => void; onAddCard: (event: FormEvent<HTMLFormElement>) => void; onDragStart: (id: string) => void; onDrop: (id: string, column: KanbanColumnId) => void }) {
  return <div className="productivity-view"><ViewHeading eyebrow="Fluxo do time" title="Kanban de operações" text="Mova cada ação até ela encontrar o próximo passo. Arraste os cards entre as colunas." action={<form className="quick-add-form" onSubmit={onAddCard}><input value={newCardTitle} onChange={(event) => onNewCardTitleChange(event.target.value)} placeholder="Adicionar uma ação..." aria-label="Nome do novo card" /><button className="button button-primary" type="submit"><Icon name="plus" size={15} />Adicionar</button></form>} /><div className="kanban-board">{kanbanColumns.map((column) => { const cards = board.filter((card) => card.column === column.id); return <section className={`kanban-column column-${column.id}`} key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => draggedCard && onDrop(draggedCard, column.id)}><div className="kanban-column-header"><div><h2>{column.title}</h2><span>{column.hint}</span></div><b>{cards.length}</b></div><div className="kanban-cards">{cards.map((card) => <article key={card.id} className={`kanban-card ${draggedCard === card.id ? 'is-dragging' : ''}`} draggable onDragStart={() => onDragStart(card.id)}><div className="card-topline"><span className={`priority-dot priority-${card.priority}`} /><span className="card-priority">{priorityLabel(card.priority)}</span><button className="icon-button" aria-label={`Mais ações para ${card.title}`}><Icon name="more-horizontal" size={16} /></button></div><h3>{card.title}</h3><p>{card.description}</p><div className="card-footer"><span className="avatar avatar-tiny">{card.assignee}</span><span className="card-tag">RH</span><span className="drag-hint">arraste</span></div></article>)}</div><button className="kanban-add" onClick={() => { const input = document.querySelector<HTMLInputElement>('.quick-add-form input'); input?.focus(); }}><Icon name="plus" size={15} /> Adicionar card</button></section>; })}</div><p className="view-footnote"><Icon name="activity" size={15} /> Dica: o quadro é salvo neste navegador para você retomar de onde parou.</p></div>;
}

function TasksView({ tasks, allTasks, filter, newTaskTitle, onNewTaskTitleChange, onAddTask, onFilterChange, onToggle }: { tasks: TodoTask[]; allTasks: TodoTask[]; filter: 'all' | 'today' | 'priority'; newTaskTitle: string; onNewTaskTitleChange: (value: string) => void; onAddTask: (event: FormEvent<HTMLFormElement>) => void; onFilterChange: (filter: 'all' | 'today' | 'priority') => void; onToggle: (id: string) => void }) {
  const completed = allTasks.filter((task) => task.done).length;
  return <div className="productivity-view"><ViewHeading eyebrow="Dia em movimento" title="TO-DO sem ruído" text="Uma lista curta, com prioridade clara e espaço para concluir." action={<form className="quick-add-form" onSubmit={onAddTask}><input value={newTaskTitle} onChange={(event) => onNewTaskTitleChange(event.target.value)} placeholder="Qual é a próxima ação?" aria-label="Nome da nova tarefa" /><button className="button button-primary" type="submit"><Icon name="plus" size={15} />Adicionar</button></form>} /><div className="tasks-layout"><section className="panel task-panel"><div className="task-panel-header"><div><span className="task-progress-label">Progresso de hoje</span><strong>{completed} de {allTasks.length} concluídas</strong></div><div className="progress-track"><span style={{ width: `${allTasks.length ? (completed / allTasks.length) * 100 : 0}%` }} /></div></div><div className="task-filters" role="tablist" aria-label="Filtrar tarefas">{([['all', 'Todas'], ['today', 'Hoje'], ['priority', 'Prioridade alta']] as const).map(([id, label]) => <button key={id} className={filter === id ? 'is-active' : ''} onClick={() => onFilterChange(id)} role="tab" aria-selected={filter === id}>{label}</button>)}</div><div className="todo-list">{tasks.length ? tasks.map((task) => <label className={`todo-row ${task.done ? 'is-done' : ''}`} key={task.id}><input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} /><span className="todo-check"><Icon name="check" size={14} /></span><span className="todo-copy"><strong>{task.title}</strong><small>{task.due}</small></span><span className={`priority-pill priority-pill-${task.priority}`}>{priorityLabel(task.priority)}</span></label>) : <div className="empty-state"><strong>Nenhuma tarefa neste filtro</strong><p>Adicione uma ação ou mude o filtro.</p></div>}</div></section><aside className="panel task-side-panel"><div className="side-illustration"><span>3</span><span>min</span></div><p className="eyebrow">Regra de ouro</p><h2>Faça a próxima coisa certa.</h2><p>Escolha uma tarefa que caiba no seu foco atual. O restante pode esperar no Kanban.</p><button className="button button-secondary" onClick={() => onFilterChange('today')}>Ver só hoje <Icon name="arrow-up-right" size={15} /></button></aside></div></div>;
}

function TrackerView({ seconds, running, task, focusMinutes, tasks, onTaskChange, onToggle, onReset }: { seconds: number; running: boolean; task: string; focusMinutes: number; tasks: TodoTask[]; onTaskChange: (value: string) => void; onToggle: () => void; onReset: () => void }) {
  return <div className="productivity-view"><ViewHeading eyebrow="Tempo com intenção" title="Time tracker" text="Meça o esforço real sem transformar o dia em uma planilha." action={<span className={`tracker-live-label ${running ? 'is-live' : ''}`}><i />{running ? 'Contando agora' : 'Pronto para focar'}</span>} /><div className="tracker-layout"><section className={`tracker-card ${running ? 'is-running' : ''}`}><div className="tracker-card-head"><span className="tracker-label">Sessão atual</span><button className="icon-button" onClick={onReset} aria-label="Zerar sessão"><Icon name="rotate-ccw" size={16} /></button></div><div className="tracker-clock" aria-live="polite">{formatDuration(seconds)}</div><p className="tracker-current-task">{task || 'Escolha uma tarefa para começar'}</p><div className="tracker-actions"><button className="button button-primary tracker-main-button" onClick={onToggle}><Icon name={running ? 'pause' : 'play'} size={16} />{running ? 'Pausar sessão' : 'Começar a focar'}</button><button className="button button-secondary" onClick={onReset}>Zerar</button></div></section><section className="panel tracker-side"><div className="panel-header"><div><h2>Em que você está trabalhando?</h2><p>Vincule o tempo a uma tarefa para manter o contexto.</p></div><Icon name="list-checks" size={19} /></div><select className="form-select" value={task} onChange={(event) => onTaskChange(event.target.value)} aria-label="Tarefa da sessão"><option value="">Sessão sem tarefa</option>{tasks.filter((item) => !item.done).map((item) => <option key={item.id} value={item.title}>{item.title}</option>)}</select><div className="tracker-stats"><div><span>Hoje</span><strong>{focusMinutes} min</strong></div><div><span>Sessões</span><strong>4</strong></div><div><span>Ritmo</span><strong>Bom</strong></div></div><div className="tracker-tip"><Icon name="lightbulb" size={16} /><span>Comece com 25 minutos. Uma sessão pequena já muda o andamento do dia.</span></div></section></div></div>;
}

function CalendarView({ month, cells, selectedDay, selectedEvents, events, newEvent, onMonthChange, onSelectDay, onNewEventChange, onAddEvent, onConnect }: { month: Date; cells: CalendarCell[]; selectedDay: string; selectedEvents: CalendarEvent[]; events: CalendarEvent[]; newEvent: { title: string; time: string; date: string }; onMonthChange: (offset: number) => void; onSelectDay: (day: string) => void; onNewEventChange: (value: { title: string; time: string; date: string }) => void; onAddEvent: (event: FormEvent<HTMLFormElement>) => void; onConnect: (provider: 'Google Calendar' | 'Outlook') => void }) {
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month);
  return <div className="productivity-view"><ViewHeading eyebrow="Tempo compartilhado" title="Calendário de RH" text="Uma agenda leve para entrevistas, alinhamentos e o que não pode escapar." action={<div className="calendar-navigation"><button className="icon-button" onClick={() => onMonthChange(-1)} aria-label="Mês anterior"><Icon name="arrow-left" size={16} /></button><strong>{capitalize(monthLabel)}</strong><button className="icon-button" onClick={() => onMonthChange(1)} aria-label="Próximo mês"><Icon name="chevron-right" size={16} /></button></div>} /><div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-weekdays">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((cell) => { const cellEvents = events.filter((event) => event.date === cell.date); return <button key={cell.date} className={`calendar-cell ${cell.isCurrentMonth ? '' : 'is-outside'} ${cell.date === selectedDay ? 'is-selected' : ''} ${cell.date === formatLocalDate(new Date()) ? 'is-today' : ''}`} onClick={() => onSelectDay(cell.date)}><span className="calendar-date">{cell.day}</span>{cellEvents.slice(0, 2).map((event) => <span className={`calendar-event event-${event.tone}`} key={event.id}>{event.time} · {event.title}</span>)}{cellEvents.length > 2 && <span className="calendar-more">+{cellEvents.length - 2} mais</span>}</button>; })}</div></section><aside className="calendar-sidebar"><section className="panel selected-day-panel"><div className="selected-day-heading"><div><p className="eyebrow">Selecionado</p><h2>{formatCalendarDate(selectedDay)}</h2></div><span>{selectedEvents.length}</span></div>{selectedEvents.length ? <div className="selected-events">{selectedEvents.map((event) => <div className="selected-event" key={event.id}><span className={`event-line event-line-${event.tone}`} /><div><strong>{event.title}</strong><small>{event.time} · {sourceLabel(event.source)}</small></div></div>)}</div> : <p className="calendar-empty">Nenhum compromisso neste dia.</p>}<form className="calendar-add-form" onSubmit={onAddEvent}><div className="field"><label htmlFor="event-title">Novo compromisso</label><input id="event-title" className="form-input" value={newEvent.title} onChange={(event) => onNewEventChange({ ...newEvent, title: event.target.value, date: selectedDay })} placeholder="Ex.: entrevista" /></div><div className="calendar-form-row"><input className="form-input" type="date" value={newEvent.date} onChange={(event) => onNewEventChange({ ...newEvent, date: event.target.value })} aria-label="Data do compromisso" /><input className="form-input" type="time" value={newEvent.time} onChange={(event) => onNewEventChange({ ...newEvent, time: event.target.value })} aria-label="Hora do compromisso" /></div><button className="button button-primary" type="submit"><Icon name="plus" size={15} />Salvar evento</button></form></section><section className="panel integrations-panel"><div className="panel-header"><div><h2>Trazer de fora</h2><p>Conecte suas agendas quando o OAuth estiver configurado.</p></div><Icon name="activity" size={18} /></div><button className="integration-button" onClick={() => onConnect('Google Calendar')}><span className="provider-mark provider-google">G</span><span><strong>Google Calendar</strong><small>Sincronização bidirecional</small></span><Icon name="arrow-up-right" size={15} /></button><button className="integration-button" onClick={() => onConnect('Outlook')}><span className="provider-mark provider-outlook">O</span><span><strong>Outlook</strong><small>Sincronização bidirecional</small></span><Icon name="arrow-up-right" size={15} /></button><p className="integration-note">Calendário local pronto · Google e Outlook em preparação</p></section></aside></div></div>;
}

function BrainstormView({ ideas, draggedIdea, newIdeaTitle, newIdeaBody, onNewIdeaTitleChange, onNewIdeaBodyChange, onAddIdea, onDragStart, onDrop }: { ideas: Idea[]; draggedIdea: string | null; newIdeaTitle: string; newIdeaBody: string; onNewIdeaTitleChange: (value: string) => void; onNewIdeaBodyChange: (value: string) => void; onAddIdea: (event: FormEvent<HTMLFormElement>) => void; onDragStart: (id: string) => void; onDrop: (id: string, column: IdeaColumnId) => void }) {
  return <div className="productivity-view"><ViewHeading eyebrow="Espaço de criação" title="Brainstorm quadro" text="Capture sem julgar. Depois, dê forma ao que pode melhorar o trabalho do RH." action={<form className="quick-add-form idea-add-form" onSubmit={onAddIdea}><input value={newIdeaTitle} onChange={(event) => onNewIdeaTitleChange(event.target.value)} placeholder="Título da ideia..." aria-label="Título da nova ideia" /><button className="button button-primary" type="submit"><Icon name="plus" size={15} />Nova ideia</button></form>} /><div className="idea-board">{ideaColumns.map((column) => { const columnIdeas = ideas.filter((idea) => idea.column === column.id); return <section className={`idea-column idea-column-${column.id}`} key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => draggedIdea && onDrop(draggedIdea, column.id)}><div className="idea-column-header"><div><h2>{column.title}</h2><span>{column.hint}</span></div><b>{columnIdeas.length}</b></div><div className="idea-notes">{columnIdeas.map((idea) => <article className={`idea-note note-${idea.color} ${draggedIdea === idea.id ? 'is-dragging' : ''}`} draggable onDragStart={() => onDragStart(idea.id)} key={idea.id}><div className="idea-note-head"><span className="idea-author">{idea.author}</span><Icon name="more-horizontal" size={16} /></div><h3>{idea.title}</h3><p>{idea.body}</p><small>arraste para mover</small></article>)}{column.id === 'raw' && <form className="idea-inline-form" onSubmit={(event) => { event.preventDefault(); document.querySelector<HTMLInputElement>('.idea-add-form input')?.focus(); }}><Icon name="lightbulb" size={16} /><span>Tem uma faísca?</span><button type="submit">Adicionar ideia</button></form>}</div></section>; })}</div><p className="view-footnote"><Icon name="lightbulb" size={15} /> O quadro é privado deste navegador por enquanto. A colaboração em equipe entra na próxima camada.</p></div>;
}

function ViewHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) {
  return <div className="view-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div>{action && <div className="view-heading-action">{action}</div>}</div>;
}

type CalendarCell = { date: string; day: number; isCurrentMonth: boolean };

function buildCalendarCells(month: Date): CalendarCell[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousDays = new Date(year, monthIndex, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;
    const date = new Date(year, monthIndex, dayOffset);
    return { date: formatLocalDate(date), day: dayOffset <= 0 ? previousDays + dayOffset : dayOffset > daysInMonth ? dayOffset - daysInMonth : dayOffset, isCurrentMonth: dayOffset > 0 && dayOffset <= daysInMonth };
  });
}

function makeId(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }
function formatLocalDate(date: Date) { const year = date.getFullYear(); const month = `${date.getMonth() + 1}`.padStart(2, '0'); const day = `${date.getDate()}`.padStart(2, '0'); return `${year}-${month}-${day}`; }
function formatCalendarDate(value: string) { return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace('.', ''); }
function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const remaining = seconds % 60; return `${hours ? `${hours.toString().padStart(2, '0')}:` : ''}${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`; }
function priorityLabel(priority: Priority) { return ({ high: 'Alta', medium: 'Média', low: 'Baixa' })[priority]; }
function sourceLabel(source: CalendarEvent['source']) { return ({ local: 'agenda local', google: 'Google Calendar', outlook: 'Outlook' })[source]; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
