import { normalizeResult } from './community.js';

// The ordered IDs are editorially selected broadcasts, not every scheduled game.
// Dates alone never turn a match live or publish a result.
export function getHomeBroadcastBoard(tournament) {
  const matches = (tournament.stages || []).flatMap((stage) =>
    (stage.rounds || [{ matches: stage.matches || [] }]).flatMap((round) => round.matches || []));
  const byId = new Map(matches.filter((match) => match.published !== false).map((match) => [match.id, match]));
  const featured = (tournament.homeBroadcastMatchIds || []).map((id) => byId.get(id)).filter(Boolean);
  const result = (match) => normalizeResult(match, tournament.discipline);
  const confirmed = (match) => result(match).score !== null;
  const live = featured.find((match) => match.status === 'live');
  const upcoming = featured.find((match) => match.status === 'scheduled');
  const lastResult = [...featured].reverse().find(confirmed);
  const pending = featured.find((match) => match.status === 'completed' && !confirmed(match));
  const postponed = featured.find((match) => match.status === 'postponed');
  const match = live || upcoming || pending || postponed || lastResult || null;
  const state = !match ? 'unannounced' : match === live ? 'live' : match === upcoming ? 'scheduled' : match === pending ? 'pending' : match === postponed ? 'postponed' : result(match).technical ? 'technical' : 'result';
  return {
    match,
    state,
    score: ['result', 'technical'].includes(state) ? result(match).score : null,
    previous: lastResult && lastResult !== match ? { match: lastResult, score: result(lastResult).score, technical: result(lastResult).technical } : null,
  };
}
