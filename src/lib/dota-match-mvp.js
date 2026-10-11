import { topMvpPlayers } from './dota-mvp.js';

const positiveId = (value) => /^(?:[1-9]\d*)$/.test(String(value ?? ''));
const unique = (values) => [...new Set(values)];

function mapId(record) {
  for (const value of [record?.matchId, record?.id]) if (positiveId(value)) return String(value);
  try {
    const url = new URL(record?.url);
    const id = url.pathname.match(/^\/matches\/([1-9]\d*)\/?$/)?.[1];
    return url.protocol === 'https:' && ['opendota.com', 'www.opendota.com'].includes(url.hostname) ? id : null;
  } catch { return null; }
}

function fixtureMapIds(match, snapshot) {
  const explicit = unique([
    ...(match.maps || []).map(mapId), ...(match.mapLinks || []).map(mapId),
    positiveId(match.mapId) ? String(match.mapId) : null,
  ].filter(Boolean));
  if (explicit.length) return explicit;
  // A validated record may establish the fixture link before the results overlay arrives.
  return unique([
    ...Object.entries(snapshot?.maps || {}).filter(([, map]) => map.fixtureId === match.id).map(([id]) => id),
    ...(snapshot?.players || []).flatMap((player) => player.records || [])
      .filter((record) => record.fixtureId === match.id).map((record) => record.matchId),
  ].filter(positiveId).map(String));
}

/** Project a VALIDATED useDotaMvp snapshot onto one confirmed BO1 fixture.
 * Published per-map exact scores and shared tie ranking remain the only scoring rules.
 */
export function getDotaMatchMvp({ tournament, match, snapshot = null, availability = 'pending' }) {
  const mapIds = fixtureMapIds(match, snapshot);
  const stale = Boolean(snapshot && ['stale', 'unavailable'].includes(availability));
  const base = { status: 'pending', leaders: [], players: [], mapIds, countedMapIds: [],
    pendingMapIds: mapIds, estimatedMapIds: [], excludedMapIds: [], correctionPendingMatchIds: [],
    coverageComplete: false, preliminary: true, stale, availability, updatedAt: snapshot?.updatedAt || null };
  const empty = (status, reason) => ({ ...base, status, reason });
  if (['walkover', 'bye'].includes(match.status) || match.scoreKind === 'technical') return empty('not-played', 'technical-result');
  if (match.status !== 'completed' || match.resultConfirmed !== true) return empty('pending', 'match-not-confirmed');
  if (match.bestOf !== 'BO1') return empty('unsupported', 'series-rule-unconfirmed');
  if (!snapshot) return empty(availability === 'unavailable' ? 'unavailable' : 'pending', 'snapshot-missing');
  if (snapshot.tournamentId !== tournament.id || snapshot.leagueId !== tournament.leagueId ||
      !snapshot.maps || !Array.isArray(snapshot.players)) return empty('unavailable', 'snapshot-mismatch');
  if (!mapIds.length) return empty('pending', 'map-link-missing');
  if (mapIds.length !== 1) return empty('pending', 'ambiguous-bo1-map');

  const id = mapIds[0], map = snapshot.maps[id];
  const correctionPendingMatchIds = (snapshot.correctionPendingMatchIds || []).filter((item) => item === id);
  const pendingMapIds = !map || !['ready', 'estimated'].includes(map.status) ||
    snapshot.ingestionPendingMatchIds?.includes(id) ? [id] : [];
  const estimatedMapIds = map?.status === 'estimated' ? [id] : [];
  const excludedMapIds = map?.status === 'excluded' ? [id] : [];
  const metadata = { ...base, pendingMapIds, estimatedMapIds, excludedMapIds, correctionPendingMatchIds };
  if (!map || !['ready', 'estimated'].includes(map.status)) return {
    ...metadata, status: excludedMapIds.length ? 'unavailable' : 'pending',
    reason: excludedMapIds.length ? 'map-excluded' : 'map-statistics-pending',
  };

  const selected = [];
  let foreignFixture = Boolean(map.fixtureId && map.fixtureId !== match.id);
  for (const player of snapshot.players) {
    const records = (player.records || []).filter((record) => record.matchId === id);
    if (!records.length) continue;
    if (records.length !== 1 || records.some((record) =>
      (record.fixtureId !== match.id && !(record.fixtureId === null && snapshot.retrospective === true)) ||
      ![match.team1Id, match.team2Id].includes(record.teamId))) { foreignFixture = true; continue; }
    const record = records[0], teamIndex = player.teamIds.indexOf(record.teamId);
    selected.push({ accountId: player.accountId, steamId: player.steamId, nickname: player.nickname,
      teamIds: [record.teamId], teamNames: [player.teamNames[teamIndex]], countedMaps: 1, playedMaps: 1,
      ratingExact: { ...record.scoreExact }, records: [structuredClone(record)], estimated: map.status === 'estimated' });
  }
  if (foreignFixture) return { ...metadata, reason: 'map-fixture-conflict' };
  if (selected.length !== 10 || [match.team1Id, match.team2Id].some((teamId) =>
    selected.filter((player) => player.teamIds[0] === teamId).length !== 5)) {
    return { ...metadata, reason: 'player-coverage-pending' };
  }
  const players = topMvpPlayers(selected, selected.length);
  const coverageComplete = pendingMapIds.length === 0;
  return { ...metadata, status: estimatedMapIds.length ? 'estimated' : 'ready', reason: null,
    players, leaders: topMvpPlayers(players, 1), countedMapIds: [id], coverageComplete,
    preliminary: !coverageComplete || estimatedMapIds.length > 0 || correctionPendingMatchIds.length > 0 || stale };
}
