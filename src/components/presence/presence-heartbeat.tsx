'use client';

import { useEffect } from 'react';

type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

const inactivityLimit = 60_000;
const heartbeatInterval = 20_000;
const productivityStorageKey = 'vieira-couto-productivity-v2';
const trackerStorageKey = 'majurh:time-tracker-active';
const trackerStateKey = 'majurh:time-tracker-state';

export function PresenceHeartbeat({ organizationId }: { organizationId: string | null | undefined }) {
  useEffect(() => {
    if (!organizationId) return;

    let active = true;
    let lastActivityAt = Date.now();
    let lastSentStatus: PresenceStatus | null = null;
    let lastSentAt = 0;
    function getStatus(): PresenceStatus {
      if (isTimeTrackerActive() || isCalendarMeetingActive()) return 'busy';
      if (document.visibilityState !== 'visible') return 'offline';
      return Date.now() - lastActivityAt >= inactivityLimit ? 'away' : 'online';
    }

    async function sendStatus(status: PresenceStatus, context: string | null, force = false) {
      if (!active) return;
      const now = Date.now();
      if (!force && status === lastSentStatus && now - lastSentAt < heartbeatInterval) return;

      try {
        const response = await fetch('/api/organizations/members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId, status, context }),
          keepalive: force && status === 'offline',
        });
        if (!response.ok) return;
        const payload = await response.json() as { data?: { updatedAt?: string } };
        lastSentStatus = status;
        lastSentAt = Date.now();
        window.dispatchEvent(new CustomEvent('presence:updated', {
          detail: { organizationId, status, context, updatedAt: payload.data?.updatedAt ?? new Date().toISOString() },
        }));
      } catch {
        // A transient presence failure should never interrupt the current page.
      }
    }

    function sync(force = false) {
      void sendStatus(getStatus(), getPresenceContext(), force);
    }

    function markActivity() {
      lastActivityAt = Date.now();
      if (lastSentStatus !== 'online') sync(true);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === trackerStorageKey || event.key === trackerStateKey || event.key === productivityStorageKey) sync(true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') markActivity();
      else sync(true);
    }

    function handlePageHide() {
      void sendStatus('offline', null, true);
    }

    function handleContextChanged() {
      sync(true);
    }

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'mousemove'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener('presence:context-changed', handleContextChanged);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    sync(true);
    const timer = window.setInterval(() => sync(), heartbeatInterval);

    return () => {
      active = false;
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener('presence:context-changed', handleContextChanged);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [organizationId]);

  return null;
}

function isTimeTrackerActive() {
  return window.localStorage.getItem(trackerStorageKey) === 'true';
}

function getPresenceContext() {
  try {
    const saved = window.localStorage.getItem(trackerStateKey);
    if (saved) {
      const tracker = JSON.parse(saved) as { running?: boolean; task?: string };
      if (tracker.running) return tracker.task?.trim() ? `Foco: ${tracker.task.trim()}` : 'Foco no time tracker';
    }

    const productivity = window.localStorage.getItem(productivityStorageKey);
    if (!productivity) return null;
    const parsed = JSON.parse(productivity) as { events?: Array<{ title?: string; date?: string; time?: string }> };
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const meeting = (parsed.events ?? []).find((event) => {
      if (event.date !== today || !event.time) return false;
      const [hours, minutes] = event.time.split(':').map(Number);
      const start = hours * 60 + minutes;
      return Number.isFinite(start) && currentMinutes >= start && currentMinutes < start + 60;
    });
    return meeting?.title?.trim() ? `Reunião: ${meeting.title.trim()}` : null;
  } catch {
    return null;
  }
}

function isCalendarMeetingActive() {
  try {
    const saved = window.localStorage.getItem(productivityStorageKey);
    if (!saved) return false;
    const parsed = JSON.parse(saved) as { events?: Array<{ date?: string; time?: string }> };
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return (parsed.events ?? []).some((event) => {
      if (event.date !== today || !event.time) return false;
      const [hours, minutes] = event.time.split(':').map(Number);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
      const startMinutes = hours * 60 + minutes;
      return currentMinutes >= startMinutes && currentMinutes < startMinutes + 60;
    });
  } catch {
    return false;
  }
}
