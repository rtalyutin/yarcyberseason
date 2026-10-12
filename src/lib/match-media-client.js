import { useEffect, useState } from 'react';
import { mediaId, mediaObject, validMediaClip, matchMediaHref } from './match-media.js';

const base = (import.meta.env?.VITE_YCS_ORGS_API_URL || 'https://rtalyutin-tg-mcp-4776.twc1.net').replace(/\/+$/, '');
export function matchMediaUrl({ tournamentId, matchId }, apiBase = base) {
  if (!mediaId(tournamentId) || !mediaId(matchId)) throw new Error('Invalid match media scope');
  const url = new URL('/api/match-media', apiBase);
  url.searchParams.set('tournamentId', tournamentId); url.searchParams.set('matchId', matchId);
  return url.href;
}

export function validatePublicMatchMedia(value, { tournamentId, matchId }) {
  if (!mediaObject(value) || Object.keys(value).some((key) => !['schemaVersion', 'revision', 'catalogVersion', 'updatedAt', 'tournamentId', 'matchId', 'clips'].includes(key)) ||
      value.schemaVersion !== 1 || value.tournamentId !== tournamentId || value.matchId !== matchId ||
      typeof value.catalogVersion !== 'string' || !/^[a-f0-9]{64}$/.test(value.catalogVersion) ||
      !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.clips) || value.clips.length > 2048 ||
      !(value.updatedAt === null && value.revision === 0 || typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))) throw new Error('Invalid media response');
  const ids = new Set();
  for (const clip of value.clips) {
    if (!mediaObject(clip) || Object.keys(clip).some((key) => !['id', 'mapKey', 'mapNumber', 'mapId', 'kind', 'url', 'title', 'startSeconds', 'endSeconds', 'href'].includes(key)) ||
        !validMediaClip({ ...clip, tournamentId, matchId }) || matchMediaHref(clip) !== clip.href || ids.has(clip.id)) throw new Error('Invalid media response');
    ids.add(clip.id);
  }
  return value;
}

export function createMatchMediaClient(scope) {
  const url = matchMediaUrl(scope);
  let state = { availability: 'loading', revision: 0, clips: [] }, current = null, pending;
  const listeners = new Set();
  const emit = (next) => { state = next; for (const listener of listeners) listener(next); return state; };
  return { getState: () => state, subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    refresh(fetcher = fetch) {
      if (pending) return pending;
      pending = (async () => {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12_000);
        try {
          const response = await fetcher(url, { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error();
          const value = validatePublicMatchMedia(await response.json(), scope);
          if (current && value.revision < current.revision) throw new Error();
          // The sports catalog can hide/unhide a stored clip without a media edit.
          // Its separate fingerprint makes that legitimate projection refresh explicit.
          if (current && value.revision === current.revision && value.catalogVersion === current.catalogVersion && JSON.stringify(current) !== JSON.stringify(value)) throw new Error();
          current = value;
          return emit({ availability: 'current', revision: value.revision, clips: value.clips });
        } catch { return emit({ ...state, availability: 'unavailable' }); }
        finally { clearTimeout(timer); }
      })().finally(() => { pending = null; });
      return pending;
    } };
}

const clients = new Map();
export function useMatchMedia({ tournamentId, matchId }) {
  const key = `${tournamentId}/${matchId}`;
  if (!clients.has(key)) clients.set(key, createMatchMediaClient({ tournamentId, matchId }));
  const client = clients.get(key);
  const [current, setCurrent] = useState(() => ({ key, state: client.getState() }));
  useEffect(() => {
    setCurrent({ key, state: client.getState() });
    const unsubscribe = client.subscribe((state) => setCurrent({ key, state }));
    client.refresh();
    const timer = window.setInterval(() => client.refresh(), 60_000);
    const refresh = () => client.refresh();
    window.addEventListener('focus', refresh);
    return () => { unsubscribe(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [client, key]);
  return current.key === key ? current.state : client.getState();
}
