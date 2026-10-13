import { sumMvpScores, topMvpPlayers } from './dota-mvp.js';
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

/** Series award: sum this fixture's validated, actually played map contributions.
 * Map order/technical decisions come from the same slots as the match center.
 * Tournament totals are never reused. A partial sum is only a provisional leader.
 */
export function getDotaSeriesMvp({ tournament, match, snapshot = null, availability = 'pending' }) {
  const slots = getMatchMapSlots({ ...match, discipline: 'Dota 2', tournamentId: tournament.id }, snapshot);
  const completed = match.status === 'completed' && match.resultConfirmed === true;
  const relevant = slots.filter((slot) => slot.state !== 'not-played' &&
    (completed || slot.map && slot.state !== 'scheduled'));
  const mapIds = unique(relevant.map((slot) => slot.mapId).filter(Boolean));
  const base = { ...projectionBase(mapIds, snapshot, availability), pendingMapNumbers: [],
    countedMapNumbers: [], playedMapCount: relevant.length, final: false };
  if (['walkover', 'bye', 'cancelled'].includes(match.status) || match.scoreKind === 'technical') {
    return { ...base, status: 'not-played', reason: 'no-played-series', pendingMapIds: [] };
  }
  if (!['completed', 'live'].includes(match.status)) {
    return { ...base, reason: 'series-not-started' };
  }
  const projections = relevant.map((slot) => ({ slot, mvp: getDotaMapMvp({
    tournament, match, mapId: slot.mapId, snapshot, availability,
  }) }));
  const pendingMapNumbers = projections.filter(({ mvp }) => !mvp.coverageComplete).map(({ slot }) => slot.number);
  const counted = projections.filter(({ mvp }) => mvp.players.length > 0);
  const aggregated = new Map();
  for (const { slot, mvp } of counted) for (const player of mvp.players) {
    let entry = aggregated.get(player.accountId);
    if (!entry) {
      entry = { accountId: player.accountId, steamId: player.steamId, nickname: player.nickname,
        teamIds: [], teamNames: [], records: [], estimated: false };
      aggregated.set(player.accountId, entry);
    }
    entry.teamIds = unique([...entry.teamIds, ...player.teamIds]);
    entry.teamNames = unique([...entry.teamNames, ...player.teamNames]);
    entry.records.push({ ...structuredClone(player.records[0]), mapNumber: slot.number, estimated: player.estimated });
    entry.estimated ||= player.estimated;
  }
  const players = topMvpPlayers([...aggregated.values()].map((player) => ({ ...player,
    countedMaps: player.records.length, playedMaps: player.records.length,
    ratingExact: sumMvpScores(player.records.map((record) => record.scoreExact)),
  })), Math.max(1, aggregated.size));
  const fieldIds = (field) => unique(projections.flatMap(({ mvp }) => mvp[field]));
  const coverageComplete = relevant.length > 0 && pendingMapNumbers.length === 0;
  const estimatedMapIds = fieldIds('estimatedMapIds'), correctionPendingMatchIds = fieldIds('correctionPendingMatchIds');
  const preliminary = !completed || !coverageComplete || estimatedMapIds.length > 0 ||
    correctionPendingMatchIds.length > 0 || base.stale;
  return { ...base, status: players.length ? estimatedMapIds.length ? 'estimated' : 'ready'
    : availability === 'unavailable' ? 'unavailable' : 'pending',
    reason: players.length ? null : 'series-statistics-pending', players, leaders: topMvpPlayers(players, 1),
    countedMapIds: counted.map(({ slot }) => slot.mapId), countedMapNumbers: counted.map(({ slot }) => slot.number),
    pendingMapIds: fieldIds('pendingMapIds'), pendingMapNumbers, estimatedMapIds,
    excludedMapIds: fieldIds('excludedMapIds'), correctionPendingMatchIds,
    coverageComplete, preliminary, final: !preliminary };
}

/** Historical BO1-only adapter. New series consumers use getDotaSeriesMvp. */
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
