import { useEffect, useState } from 'react';
import { AUDIENCE_SNAPSHOT_URL, validateAudienceSnapshot } from './audience-snapshot.js';

export const AUDIENCE_FRESHNESS_MS = 24 * 60 * 60 * 1000;
export const AUDIENCE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

export function audienceSourceIsStale(source, availability, { now = Date.now(), maxAgeMs = AUDIENCE_FRESHNESS_MS } = {}) {
  if (!source || ['unavailable', 'not_configured'].includes(source.status)) return false;
  return source.status === 'stale' || availability === 'stale'
    || (source.fetchedAt != null && now - Date.parse(source.fetchedAt) > maxAgeMs);
}

export function audienceSnapshotUrl(configured = import.meta.env?.VITE_YCS_AUDIENCE_URL) {
  if (!configured) return AUDIENCE_SNAPSHOT_URL;
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid audience source');
  return url.href;
}

// Keep the last validated read in memory. A network failure cannot turn it into zero.
export function createAudienceClient({
  url = audienceSnapshotUrl(), timeoutMs = 12_000, now = Date.now,
  clockToleranceMs = AUDIENCE_CLOCK_TOLERANCE_MS,
} = {}) {
  let state = { snapshot: null, availability: 'loading' };
  let inflight = null;
  let controller = null;
  const listeners = new Set();
  const emit = (next) => { state = next; for (const listener of listeners) listener(state); return state; };
  const refresh = (fetcher = fetch) => {
    if (inflight) return inflight;
    const request = new AbortController();
    controller = request;
    const timer = setTimeout(() => request.abort(), timeoutMs);
    const task = (async () => {
      try {
        const response = await fetcher(url, { cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error('Audience source unavailable');
        const snapshot = validateAudienceSnapshot(await response.json());
        if (request.signal.aborted) return state;
        const latestAllowed = now() + clockToleranceMs;
        const timestamps = [snapshot.generatedAt, ...snapshot.sources.flatMap((source) => [source.fetchedAt, source.lastAttemptAt])];
        if (timestamps.some((value) => value !== null && Date.parse(value) > latestAllowed)) throw new Error('Invalid audience timestamp');
        if (state.snapshot && Date.parse(snapshot.generatedAt) < Date.parse(state.snapshot.generatedAt)) {
          return emit({ ...state, availability: 'stale' });
        }
        return emit({ snapshot, availability: 'current' });
      } catch {
        if (controller !== request) return state;
        return emit({ ...state, availability: state.snapshot ? 'stale' : 'unavailable' });
      } finally { clearTimeout(timer); }
    })().finally(() => {
      if (controller === request) controller = null;
      if (inflight === task) inflight = null;
    });
    inflight = task;
    return task;
  };
  return {
    getState: () => state,
    refresh,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    cancel: () => { const active = controller; controller = null; inflight = null; active?.abort(); },
  };
}

export function useAudienceSnapshot() {
  const [client] = useState(() => createAudienceClient());
  const [state, setState] = useState(client.getState);
  useEffect(() => {
    const unsubscribe = client.subscribe(setState);
    setState(client.getState());
    client.refresh();
    const timer = window.setInterval(() => client.refresh(), 300_000);
    const onFocus = () => client.refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') client.refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe(); client.cancel(); window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client]);
  return state;
}

export function validatePartnerProject(value) {
  const text = (entry) => typeof entry === 'string' && entry.trim().length > 0 && entry.length <= 1500;
  if (!value || value.schemaVersion !== 1 || !text(value.updatedAt) || !Number.isFinite(Date.parse(value.updatedAt)) || !text(value.sourceLabel)
    || !Array.isArray(value.history) || value.history.length > 50 || !Array.isArray(value.initiatives) || value.initiatives.length > 12
    || !Number.isInteger(value.planYear) || value.planYear < 2026 || value.planYear > 2100 || !text(value.historyNote)
    || !text(value.mediaPlan) || !value.example || !text(value.example.title) || !text(value.example.copy) || !text(value.example.sourceLabel)) throw new Error('Invalid project content');
  const ids = new Set();
  for (const event of value.history) {
    if (!text(event.id) || ids.has(event.id) || !text(event.period) || !text(event.title) || !Array.isArray(event.disciplines) || !event.disciplines.length) throw new Error('Invalid project history');
    ids.add(event.id);
    for (const discipline of event.disciplines) if (!text(discipline.name) || !Number.isInteger(discipline.teams) || discipline.teams < 1 || discipline.teams > 10000) throw new Error('Invalid project history');
  }
  ids.clear();
  for (const item of value.initiatives) {
    if (!text(item.id) || ids.has(item.id) || !text(item.discipline) || !text(item.description) || !Number.isInteger(item.tournaments) || item.tournaments < 1 || item.tournaments > 20) throw new Error('Invalid project plan');
    ids.add(item.id);
  }
  return value;
}

export function teamParticipationCount(project) {
  return project.history.reduce((sum, event) => sum + event.disciplines.reduce((total, discipline) => total + discipline.teams, 0), 0);
}

export function partnershipMailto(email, initiative) {
  const subject = initiative ? `Поддержка ${initiative.discipline} / ЯрКиберСезон` : 'Партнёрство с ЯрКиберСезоном';
  const body = initiative
    ? `Здравствуйте, Роман!\n\nХочу обсудить поддержку направления «${initiative.discipline}» в следующем сезоне ЯрКиберСезона.\n\nКомпания:\nВозможный вклад:\nКонтакт для связи:`
    : 'Здравствуйте, Роман!\n\nХочу обсудить партнёрство с ЯрКиберСезоном.\n\nКомпания:\nВозможный вклад:\nКонтакт для связи:';
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function usePartnerProject(url = '/data/partner-project.json') {
  const [state, setState] = useState({ project: null, availability: 'loading' });
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    (async () => {
      try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Project content unavailable');
        const project = validatePartnerProject(await response.json());
        if (mounted) setState({ project, availability: 'current' });
      } catch { if (mounted) setState({ project: null, availability: 'unavailable' }); }
      finally { clearTimeout(timer); }
    })();
    return () => { mounted = false; clearTimeout(timer); controller.abort(); };
  }, [url]);
  return state;
}
