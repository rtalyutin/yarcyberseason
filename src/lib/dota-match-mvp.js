import { topMvpPlayers } from './dota-mvp.js';
import { getMatchMapSlots, getOpenDotaMapId } from './match-center.js';

const positiveId = (value) => /^(?:[1-9]\d*)$/.test(String(value ?? ''));
const unique = (values) => [...new Set(values)];

function fixtureMapIds(match, snapshot) {
  const explicit = unique([
    ...(match.maps || []).map(getOpenDotaMapId), ...(match.mapLinks || []).map(getOpenDotaMapId),
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

function projectionBase(mapIds, snapshot, availability) {
  const stale = Boolean(snapshot && ['stale', 'unavailable'].includes(availability));
  return { status: 'pending', leaders: [], players: [], mapIds, countedMapIds: [],
    pendingMapIds: mapIds, estimatedMapIds: [], excludedMapIds: [], correctionPendingMatchIds: [],
    coverageComplete: false, preliminary: true, stale, availability, updatedAt: snapshot?.updatedAt || null };
}

/** Match-level compatibility: still only BO1, never a newly invented series aggregation. */
export function getDotaMatchMvp({ tournament, match, snapshot = null, availability = 'pending' }) {
  const mapIds = fixtureMapIds(match, snapshot);
  const base = projectionBase(mapIds, snapshot, availability);
  const empty = (status, reason) => ({ ...base, status, reason });
  if (['walkover', 'bye'].includes(match.status) || match.scoreKind === 'technical') return empty('not-played', 'technical-result');
  if (match.status !== 'completed' || match.resultConfirmed !== true) return empty('pending', 'match-not-confirmed');
  if (match.bestOf !== 'BO1') return empty('unsupported', 'series-rule-unconfirmed');
  if (!snapshot) return empty(availability === 'unavailable' ? 'unavailable' : 'pending', 'snapshot-missing');
  if (snapshot.tournamentId !== tournament.id || snapshot.leagueId !== tournament.leagueId ||
      !snapshot.maps || !Array.isArray(snapshot.players)) return empty('unavailable', 'snapshot-mismatch');
  if (!mapIds.length) return empty('pending', 'map-link-missing');
  if (mapIds.length !== 1) return empty('pending', 'ambiguous-bo1-map');
  return getDotaMapMvp({ tournament, match, mapId: mapIds[0], snapshot, availability });
}

/** Project one actual map from a VALIDATED snapshot, including BO3/BO5.
 * A ready/estimated map confirms its own calculation even while its series is unfinished.
 * An explicitly unconfirmed map stays pending. No tournament totals or fabricated metrics.
 */
export function getDotaMapMvp({ tournament, match, mapId, snapshot = null, availability = 'pending' }) {
  const id = positiveId(mapId) ? String(mapId) : null;
  const base = projectionBase(id ? [id] : [], snapshot, availability);
  const empty = (status, reason) => ({ ...base, status, reason });
  if (['walkover', 'bye'].includes(match.status) || match.scoreKind === 'technical') return empty('not-played', 'technical-result');
  if (match.status === 'cancelled') return empty('not-played', 'match-cancelled');
  if (!id) return empty('pending', 'map-link-missing');
  const slot = getMatchMapSlots({ ...match, discipline: 'Dota 2', tournamentId: match.tournamentId || tournament.id }, snapshot)
    .find((item) => item.mapId === id);
  if (slot?.state === 'not-played') return empty('not-played', 'map-not-played');
  if (!snapshot) return empty(availability === 'unavailable' ? 'unavailable' : 'pending', 'snapshot-missing');
  if (snapshot.tournamentId !== tournament.id || snapshot.leagueId !== tournament.leagueId ||
      !snapshot.maps || !Array.isArray(snapshot.players)) return empty('unavailable', 'snapshot-mismatch');
  if (!fixtureMapIds(match, snapshot).includes(id)) return empty('pending', 'map-not-linked');
  const raw = [...(match.maps || []), ...(match.mapLinks || [])].find((map) => getOpenDotaMapId(map) === id);
  if (raw?.resultConfirmed === false || ['scheduled', 'live', 'postponed', 'unknown'].includes(raw?.status)) return empty('pending', 'map-not-confirmed');

  const map = snapshot.maps[id];
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
      heroId: record.heroId, teamId: record.teamId, metrics: record.metrics ? structuredClone(record.metrics) : null,
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
    preliminary: !coverageComplete || estimatedMapIds.length > 0 || correctionPendingMatchIds.length > 0 || base.stale };
}
