import { useEffect, useState } from 'react';
import { updateLceTournament } from '../data/tournaments/index.js';
import { rebuildCommunity } from '../data/community.js';
import { LCE_ID, lceFixtures } from './lce-tournament.js';
const base = (import.meta.env?.VITE_YCS_ORGS_API_URL || 'https://rtalyutin-tg-mcp-4776.twc1.net').replace(/\/+$/, '');
let latest = null, state = { revision: 0, availability: 'pending' }, pending;
const listeners = new Set();
const emit = next => { state = next; listeners.forEach(fn => fn(next)); };
export function validateLcePublic(value) {
  if (!value || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
      value.tournament?.id !== LCE_ID || value.tournament.slug !== LCE_ID || !Array.isArray(value.tournament.stages) ||
      !Array.isArray(value.tournament.participants) || value.tournament.participants.length !== 5 ||
      !(value.revision === 0 && value.updatedAt === null || Number.isFinite(Date.parse(value.updatedAt))) ||
      lceFixtures(value.tournament).length < 13) throw new Error('Некорректный снимок результатов');
  return value;
}
export async function refreshLceResults(fetcher = fetch) {
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetcher(`${base}/api/tournaments/${LCE_ID}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Results unavailable');
      const value = validateLcePublic(await response.json());
      if (latest && value.revision < latest.revision) throw new Error('Outdated revision');
      if (latest && value.revision === latest.revision && JSON.stringify(value) !== JSON.stringify(latest)) throw new Error('Conflicting revision');
      updateLceTournament(value.tournament); rebuildCommunity(); latest = value;
      emit({ revision: value.revision, availability: 'current' });
    } catch { emit({ ...state, availability: 'unavailable' }); }
    return state;
  })().finally(() => { pending = null; });
  return pending;
}
export function useLceResults() {
  const [value, setValue] = useState(state);
  useEffect(() => {
    listeners.add(setValue); refreshLceResults();
    const timer = window.setInterval(refreshLceResults, 60000);
    const focus = () => refreshLceResults(); window.addEventListener('focus', focus);
    return () => { listeners.delete(setValue); window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, []);
  return value;
}
