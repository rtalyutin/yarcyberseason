import { getMatchBroadcastLinks } from './broadcasts.js';
import { exactStart } from './community.js';

export const HOME_TIME_ZONE = 'Europe/Moscow';

export function isClosedBroadcast(match) {
  return match.status === 'cancelled' ||
    (['completed', 'walkover', 'bye'].includes(match.status) && match.resultConfirmed === true);
}

function orderTime(match) {
  const exact = exactStart(match.scheduledAt);
  if (exact) return Date.parse(exact);
  if (/^\d{4}-\d{2}-\d{2}$/.test(match.date || '')) {
    const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(match.time || '') ? match.time : '23:59';
    const timestamp = Date.parse(`${match.date}T${time}:00+03:00`);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return Number.MAX_SAFE_INTEGER;
}

export function getTournamentBroadcasts(tournament) {
  const seen = new Set();
  return (tournament.stages || []).flatMap((stage) => [
    ...(stage.rounds || []),
    ...(stage.matches ? [{ matches: stage.matches }] : []),
    ...(stage.groups || []).filter((group) => group.matches),
  ].flatMap((round) => round.matches || [])).filter((match) => {
    if (match.published === false || !getMatchBroadcastLinks(match).length || seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  }).sort((left, right) => orderTime(left) - orderTime(right));
}

// Only published status/result data advances the selected stream. A clock
// changes the day-sensitive headline, never LIVE or a match outcome.
export function getHomeBroadcastBoard(tournament) {
  const active = getTournamentBroadcasts(tournament).filter((match) => !isClosedBroadcast(match));
  const match = active.find((item) => item.status === 'live') || active[0] || null;
  const state = !match ? 'unannounced' : match.status === 'live' ? 'live'
    : ['completed', 'walkover', 'bye'].includes(match.status) ? 'pending'
      : match.status === 'postponed' ? 'postponed' : match.status === 'scheduled' ? 'scheduled' : 'unknown';
  return { match, state, score: null, previous: null };
}

export function getMoscowDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOME_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  return ['year', 'month', 'day'].map((key) => parts.find((part) => part.type === key)?.value).join('-');
}

export function getHomeBroadcastTitle(tournament, now = new Date()) {
  const { match, state } = getHomeBroadcastBoard(tournament);
  if (state === 'live') return 'В эфире';
  if (state === 'pending') return 'Итог уточняется';
  if (state === 'postponed') return 'Матч перенесён';
  const opening = getTournamentBroadcasts(tournament).find((item) => item.id === 'dota-autumn-swiss-r1-04');
  const openingDate = opening?.scheduledAt ? getMoscowDate(opening.scheduledAt) : opening?.date || null;
  return match?.id === opening?.id && openingDate && openingDate === getMoscowDate(now)
    ? 'Сегодня открываем сезон.' : 'Следующий эфир';
}
