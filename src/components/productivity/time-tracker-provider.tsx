'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';

type TrackerContextValue = {
  seconds: number;
  running: boolean;
  task: string;
  sessions: number;
  setTask: (task: string) => void;
  toggle: () => void;
  reset: () => void;
};

const trackerStateKey = 'majurh:time-tracker-state';
const trackerActiveKey = 'majurh:time-tracker-active';
const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TimeTrackerProvider({ children }: { children: React.ReactNode }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState('');
  const [sessions, setSessions] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(trackerStateKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { seconds?: number; running?: boolean; task?: string; sessions?: number };
        if (typeof parsed.seconds === 'number') setSeconds(Math.max(0, parsed.seconds));
        if (typeof parsed.running === 'boolean') setRunning(parsed.running);
        if (typeof parsed.task === 'string') setTask(parsed.task);
        if (typeof parsed.sessions === 'number') setSessions(Math.max(0, Math.floor(parsed.sessions)));
      }
    } catch {
      // Estado local inválido não impede o restante do app de abrir.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(trackerStateKey, JSON.stringify({ seconds, running, task, sessions }));
    if (running) window.localStorage.setItem(trackerActiveKey, 'true');
    else window.localStorage.removeItem(trackerActiveKey);
    window.dispatchEvent(new Event('presence:context-changed'));
  }, [seconds, running, task, sessions, hydrated]);

  function toggleTracker() {
    setRunning((current) => {
      if (!current) setSessions((count) => count + 1);
      return !current;
    });
  }

  const value = useMemo<TrackerContextValue>(() => ({
    seconds,
    running,
    task,
    sessions,
    setTask,
    toggle: toggleTracker,
    reset: () => { setRunning(false); setSeconds(0); },
  }), [seconds, running, task, sessions]);

  return (
    <TrackerContext.Provider value={value}>
      {children}
      {running && <GlobalTrackerOverlay seconds={seconds} task={task} onToggle={value.toggle} onReset={value.reset} />}
    </TrackerContext.Provider>
  );
}

export function useTimeTracker() {
  const context = useContext(TrackerContext);
  if (!context) throw new Error('useTimeTracker deve ser usado dentro de TimeTrackerProvider.');
  return context;
}

function GlobalTrackerOverlay({ seconds, task, onToggle, onReset }: { seconds: number; task: string; onToggle: () => void; onReset: () => void }) {
  return <aside className="tracker-overlay" aria-label="Time tracker ativo">
    <span className="tracker-overlay-mark" aria-hidden="true"><i /></span>
    <div className="tracker-overlay-copy"><span>Foco em andamento</span><strong>{formatDuration(seconds)}</strong><small>{task || 'Sessão sem tarefa'}</small></div>
    <div className="tracker-overlay-actions"><button className="tracker-overlay-button tracker-overlay-button-primary" onClick={onToggle} aria-label="Pausar sessão"><Icon name="pause" size={15} /></button><button className="tracker-overlay-button" onClick={onReset} aria-label="Encerrar e zerar sessão"><Icon name="rotate-ccw" size={15} /></button></div>
  </aside>;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
