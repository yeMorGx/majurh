'use client';

import { AnimatedBellIcon } from '@/components/ui/animated-bell';
import { Icon } from '@/components/ui/icon';
import { useEffect, useMemo, useRef, useState } from 'react';

type NotificationKind = 'team' | 'calendar' | 'task' | 'update';
type AppNotification = { id: string; kind: NotificationKind; title: string; body: string; createdAt: number; updateId?: string; read?: boolean };
type UpdateEntry = { id: string; title: string; date: string; summary: string; changes: string[] };

const readStorageKey = 'majurh:notifications-read-v1';
const update: UpdateEntry = {
  id: 'site-update-abe5497',
  title: 'Majurh ganhou uma nova rodada de organização',
  date: '16 de setembro de 2026',
  summary: 'A experiência de organização, produtividade e acessos ficou mais completa.',
  changes: [
    'Time Tracker global, visível mesmo ao trocar de página.',
    'Presença automática com contexto de foco e reuniões.',
    'Administração com gerente, troca de senha e remoção de acessos.',
    'Calendário com visualização semanal e mensal.',
    'Personalização separada entre identidade e site de acesso.',
  ],
};

export function NotificationCenter({ organizationId }: { organizationId?: string | null }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateEntry | null>(null);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const readIdsRef = useRef<Set<string>>(new Set());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const centerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => {
    let active = true;
    const readIds = readIdsFromStorage();
    readIdsRef.current = readIds;
    const base = makeNotification({ id: update.id, kind: 'update', title: 'Atualização do Majurh', body: update.summary, updateId: update.id, createdAt: Date.parse('2026-09-16T12:00:00-03:00') });
    knownIdsRef.current.add(base.id);
    setNotifications([withReadState(base, readIds)]);
    setHydrated(true);
    if (!readIds.has(base.id) && !wasToastShown(base.id)) {
      window.setTimeout(() => { if (active) showToast(base); }, 850);
    }

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    async function refresh() {
      const next = await collectNotifications(organizationId);
      if (!active) return;
      const fresh = next.filter((item) => !knownIdsRef.current.has(item.id) && !readIdsRef.current.has(item.id));
      next.forEach((item) => knownIdsRef.current.add(item.id));
      setNotifications((current) => mergeNotifications(current, next, readIdsRef.current));
      if (fresh[0] && !wasToastShown(fresh[0].id)) showToast(fresh[0]);
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    const handleSignal = () => void refresh();
    window.addEventListener('presence:updated', handleSignal);
    window.addEventListener('presence:context-changed', handleSignal);
    window.addEventListener('storage', handleSignal);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('presence:updated', handleSignal);
      window.removeEventListener('presence:context-changed', handleSignal);
      window.removeEventListener('storage', handleSignal);
    };
  }, [hydrated, organizationId]);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!centerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    document.addEventListener('pointerdown', close);
    window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape); };
  }, [open]);

  function showToast(item: AppNotification) {
    window.localStorage.setItem(`majurh:notifications-toast:${item.id}`, 'true');
    setToast(item);
    window.setTimeout(() => setToast((current) => current?.id === item.id ? null : current), 5600);
  }

  function markRead(id: string) {
    readIdsRef.current.add(id);
    window.localStorage.setItem(readStorageKey, JSON.stringify([...readIdsRef.current].slice(-100)));
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  function openNotification(item: AppNotification) {
    markRead(item.id);
    setOpen(false);
    if (item.kind === 'update' || item.updateId) setSelectedUpdate(update);
  }

  function markAllRead() {
    notifications.forEach((item) => readIdsRef.current.add(item.id));
    window.localStorage.setItem(readStorageKey, JSON.stringify([...readIdsRef.current].slice(-100)));
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  return <>
    <div className="notification-center" ref={centerRef}>
      <button className={`icon-button header-icon-button ${unreadCount ? 'has-unread' : ''}`} aria-label={unreadCount ? `${unreadCount} notificações não lidas` : 'Notificações'} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <AnimatedBellIcon active={unreadCount > 0} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && <section className="notification-popover" role="dialog" aria-label="Notificações">
        <header><div><p className="eyebrow">Central do Majurh</p><h2>Notificações</h2></div>{unreadCount > 0 && <button className="notification-mark-all" onClick={markAllRead}>Marcar tudo como lido</button>}</header>
        <div className="notification-list">{notifications.length ? notifications.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map((item) => <button className={`notification-item ${item.read ? 'is-read' : 'is-unread'}`} key={item.id} onClick={() => openNotification(item)}><span className={`notification-item-icon notification-item-${item.kind}`}><Icon name={notificationIcon(item.kind)} size={16} /></span><span className="notification-item-copy"><strong>{item.title}</strong><small>{item.body}</small><em>{relativeDate(item.createdAt)}</em></span>{!item.read && <i className="notification-unread-mark" />}</button>) : <div className="notification-empty"><Icon name="bell" size={20} /><strong>Nada novo por aqui</strong><p>As novidades da equipe e do Majurh aparecem neste espaço.</p></div>}</div>
        <footer><span>{unreadCount ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'Tudo em dia'}</span><span>Atualiza automaticamente</span></footer>
      </section>}
    </div>
    {toast && <div className="notification-toast" role="status"><span className="notification-toast-icon"><AnimatedBellIcon active size={20} /></span><button className="notification-toast-main" onClick={() => openNotification(toast)}><small>Nova notificação</small><strong>{toast.title}</strong><span>{toast.body}</span></button><button className="notification-toast-close" onClick={() => setToast(null)} aria-label="Fechar notificação"><Icon name="x" size={14} /></button></div>}
    {selectedUpdate && <div className="changelog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUpdate(null); }}><section className="changelog-dialog" role="dialog" aria-modal="true" aria-labelledby="changelog-title" onMouseDown={(event) => event.stopPropagation()}><header><span className="changelog-icon"><Icon name="activity" size={18} /></span><div><p className="eyebrow">Atualização do site · {selectedUpdate.date}</p><h2 id="changelog-title">{selectedUpdate.title}</h2><p>{selectedUpdate.summary}</p></div><button className="icon-button" onClick={() => setSelectedUpdate(null)} aria-label="Fechar changelog"><Icon name="x" size={17} /></button></header><div className="changelog-body"><p>O que mudou</p><ul>{selectedUpdate.changes.map((change) => <li key={change}><Icon name="check" size={15} />{change}</li>)}</ul></div><footer><button className="button button-primary" onClick={() => setSelectedUpdate(null)}>Entendi <Icon name="check" size={15} /></button></footer></section></div>}
  </>;
}

function makeNotification(item: Omit<AppNotification, 'read'>): AppNotification { return item; }
function withReadState(item: AppNotification, readIds: Set<string>) { return { ...item, read: readIds.has(item.id) }; }
function mergeNotifications(current: AppNotification[], next: AppNotification[], readIds: Set<string>) {
  const map = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => map.set(item.id, withReadState(item, readIds)));
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

async function collectNotifications(organizationId?: string | null) {
  const result: AppNotification[] = [makeNotification({ id: update.id, kind: 'update', title: 'Atualização do Majurh', body: update.summary, updateId: update.id, createdAt: Date.parse('2026-09-16T12:00:00-03:00') })];
  const today = new Date().toISOString().slice(0, 10);
  try {
    const saved = window.localStorage.getItem('vieira-couto-productivity-v2');
    if (saved) {
      const productivity = JSON.parse(saved) as { tasks?: Array<{ id?: string; title?: string; due?: string; done?: boolean }>; events?: Array<{ id?: string; title?: string; date?: string; time?: string }> };
      (productivity.tasks ?? []).filter((task) => task.id && task.title && !task.done && task.due === 'Hoje').slice(0, 3).forEach((task) => result.push(makeNotification({ id: `task-${task.id}`, kind: 'task', title: 'Tarefa para hoje', body: task.title!, createdAt: Date.now() - 1000 })));
      (productivity.events ?? []).filter((event) => event.id && event.title && event.date! >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 3).forEach((event) => result.push(makeNotification({ id: `meeting-${event.id}`, kind: 'calendar', title: 'Reunião próxima', body: `${event.title} · ${formatNotificationDate(event.date!, event.time)}`, createdAt: Date.parse(`${event.date}T${event.time || '12:00'}:00`) || Date.now() })));
    }
  } catch {
    // Dados locais inválidos não impedem a central de notificações.
  }

  if (organizationId) {
    try {
      const response = await fetch(`/api/organizations/members?organizationId=${encodeURIComponent(organizationId)}`, { cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json() as { data?: { members?: Array<{ presence_status?: string; full_name?: string }> } };
        const members = payload.data?.members ?? [];
        const online = members.filter((member) => member.presence_status === 'online').length;
        const busy = members.filter((member) => member.presence_status === 'busy').map((member) => member.full_name).filter(Boolean);
        result.push(makeNotification({ id: `team-${organizationId}-${today}`, kind: 'team', title: 'Pulso da equipe', body: `${online} online agora${busy.length ? ` · ${busy.length} em atividade` : ''}`, createdAt: Date.now() - 2000 }));
        if (busy.length) result.push(makeNotification({ id: `team-focus-${organizationId}-${today}-${busy.length}`, kind: 'team', title: 'Pessoas em atividade', body: busy.slice(0, 2).join(' e '), createdAt: Date.now() - 3000 }));
      }
    } catch {
      // A central parcial é melhor que interromper o shell quando a equipe não responde.
    }
  }

  return result;
}

function readIdsFromStorage() {
  try { return new Set(JSON.parse(window.localStorage.getItem(readStorageKey) || '[]') as string[]); } catch { return new Set<string>(); }
}
function wasToastShown(id: string) { return window.localStorage.getItem(`majurh:notifications-toast:${id}`) === 'true'; }
function notificationIcon(kind: NotificationKind) { return kind === 'calendar' ? 'calendar' as const : kind === 'task' ? 'list-checks' as const : kind === 'update' ? 'activity' as const : 'users' as const; }
function relativeDate(timestamp: number) { const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000)); return minutes < 1 ? 'agora' : minutes < 60 ? `há ${minutes} min` : minutes < 1440 ? `há ${Math.floor(minutes / 60)} h` : 'há mais de um dia'; }
function formatNotificationDate(date: string, time?: string) { return `${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '')}${time ? ` · ${time}` : ''}`; }
