import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMvpSnapshot, formatMvpScore, scoreDotaMap, validateMvpSnapshot } from '../src/lib/dota-mvp.js';
import { getDotaMatchMvp } from '../src/lib/dota-match-mvp.js';

const heroes = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, `npc_dota_hero_synthetic_${index + 1}`]));
const teams = { radiant: { id: 'alpha', name: 'Synthetic Alpha' }, dire: { id: 'beta', name: 'Synthetic Beta' } };
const options = { tournamentId: 'synthetic-match-mvp', leagueId: 19021, revision: 1, updatedAt: '2026-10-11T10:00:00Z' };

function scoredMap(id, fixtureId, { kills = {}, deaths = {}, stuns = {}, pending = false } = {}) {
  const raw = { match_id: Number(id), leagueid: options.leagueId, version: 22, duration: 600, pre_game_duration: 90,
    players: Array.from({ length: 10 }, (_, index) => ({ account_id: index + 1, hero_id: index + 1,
      player_slot: index < 5 ? index : index + 123, personaname: `Synthetic ${index + 1}`,
      kills: kills[index + 1] || 0, assists: 0, deaths: deaths[index + 1] || 0, damage_targets: {}, damage: {}, healing: {},
      stuns: stuns[index + 1] || 0, obs_left_log: [], camps_stacked: 0 })) };
  if (pending) delete raw.players[0].damage_targets;
  return scoreDotaMap(raw, { heroNames: heroes, sideTeamIds: teams, fixtureId });
}

// Explicit synthetic QA fixture: never imported by application source or published as tournament data.
export function createDotaMatchMvpFixture(kind = 'ready') {
  const match = { id: 'synthetic-fixture-one', team1: 'Synthetic Alpha', team2: 'Synthetic Beta',
    team1Id: 'alpha', team2Id: 'beta', bestOf: 'BO1', status: 'completed', resultConfirmed: true,
    scoreKind: 'series', score1: 1, score2: 0, winnerTeamId: 'alpha', maps: [{ matchId: '701' }] };
  const other = { ...match, id: 'synthetic-fixture-two', maps: [{ matchId: '702' }] };
  const tournament = { id: options.tournamentId, leagueId: options.leagueId, discipline: 'Dota 2',
    stages: [{ id: 'swiss', rounds: [{ id: 'r1', matches: [match, other] }] }], mvpEstimates: [] };
  const config = kind === 'ties' ? { kills: { 1: 9, 2: 9 } }
    : kind === 'rounding' ? { stuns: { 1: '1.0000000000000000001', 2: '1' } }
      : kind === 'negative' ? { deaths: Object.fromEntries(Array.from({ length: 10 }, (_, index) => [index + 1, index ? 12 : 3])) }
        : kind === 'zero' ? {} : { kills: { 1: 3, 2: 6 }, pending: kind === 'pending' };
  const first = scoredMap('701', match.id, config);
  const second = scoredMap('702', other.id, { kills: { 1: 300 } });
  let snapshot;
  if (kind === 'estimated') {
    const estimate = { matchId: '701', fixtureId: match.id, confirmed: true, played: true,
      winnerTeamId: 'alpha', reason: 'Synthetic organizer-confirmed played map',
      players: first.players.map(({ metrics, scoreExact, ...identity }) => identity) };
    tournament.mvpEstimates = [estimate];
    snapshot = buildMvpSnapshot([second], { ...options, estimates: [estimate] });
  } else snapshot = buildMvpSnapshot([first, second], options);
  if (kind === 'technical') Object.assign(match, { status: 'walkover', scoreKind: 'technical', maps: [] });
  if (kind === 'scheduled') Object.assign(match, { status: 'scheduled', resultConfirmed: false });
  validateMvpSnapshot(snapshot, tournament);
  return { synthetic: true, tournament, match, snapshot, availability: 'current' };
}

test('only this fixture contributes: a tournament leader from another map cannot win the match', () => {
  const input = createDotaMatchMvpFixture();
  assert.equal(input.snapshot.players[0].accountId, '1');
  const before = structuredClone(input);
  const result = getDotaMatchMvp(input);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.mapIds, ['701']);
  assert.deepEqual(result.leaders.map((player) => player.accountId), ['2']);
  assert.deepEqual(result.leaders[0].ratingExact, { numerator: '2', denominator: '1' });
  assert.deepEqual(result.leaders[0].teamNames, ['Synthetic Alpha']);
  assert.deepEqual(result.players.flatMap((player) => player.records.map((record) => record.matchId)), Array(10).fill('701'));
  assert.equal(result.coverageComplete, true);
  assert.equal(result.preliminary, false);
  result.leaders[0].records[0].metrics.K = 999;
  assert.deepEqual(input, before);
});

test('negative match contributions remain negative and do not receive a fabricated zero floor', () => {
  const result = getDotaMatchMvp(createDotaMatchMvpFixture('negative'));
  assert.deepEqual(result.leaders.map((player) => player.accountId), ['1']);
  assert.deepEqual(result.leaders[0].ratingExact, { numerator: '-1', denominator: '1' });
  assert.ok(result.players.every((player) => BigInt(player.ratingExact.numerator) < 0n));
});

test('all exact first-place ties survive; display rounding never creates a tie', () => {
  const tied = getDotaMatchMvp(createDotaMatchMvpFixture('ties'));
  assert.deepEqual(tied.leaders.map((player) => player.accountId), ['1', '2']);
  assert.ok(tied.leaders.every((player) => player.rank === 1));
  const exact = getDotaMatchMvp(createDotaMatchMvpFixture('rounding'));
  assert.deepEqual(exact.leaders.map((player) => player.accountId), ['1']);
  assert.equal(formatMvpScore(exact.players[0].ratingExact), formatMvpScore(exact.players[1].ratingExact));
});

test('missing statistics never award zero, while ten actual zero scores are a valid ten-player tie', () => {
  const pending = getDotaMatchMvp(createDotaMatchMvpFixture('pending'));
  assert.equal(pending.status, 'pending');
  assert.deepEqual(pending.leaders, []);
  assert.deepEqual(pending.players, []);
  assert.deepEqual(pending.pendingMapIds, ['701']);
  assert.equal(pending.coverageComplete, false);
  const zero = getDotaMatchMvp(createDotaMatchMvpFixture('zero'));
  assert.equal(zero.leaders.length, 10);
  assert.ok(zero.leaders.every((player) => player.ratingExact.numerator === '0'));
});

test('estimated match scores retain the existing whole-tournament mean and all winner ties', () => {
  const input = createDotaMatchMvpFixture('estimated');
  const result = getDotaMatchMvp(input);
  assert.equal(result.status, 'estimated');
  assert.deepEqual(result.estimatedMapIds, ['701']);
  assert.equal(result.preliminary, true);
  assert.equal(result.leaders.length, 5);
  // Other real map: 100/10 = 10 per player-map; published winner estimate is 10 × 23/20.
  assert.deepEqual(result.leaders[0].ratingExact, { numerator: '23', denominator: '2' });
  assert.deepEqual(result.leaders[0].records[0].estimation.factorExact, { numerator: '23', denominator: '20' });
  assert.equal(Object.hasOwn(result.leaders[0].records[0], 'metrics'), false);
  assert.ok(result.leaders.every((player) => player.estimated));
});

test('technical no-play, scheduled and unconfirmed results cannot award match MVP', () => {
  assert.equal(getDotaMatchMvp(createDotaMatchMvpFixture('technical')).status, 'not-played');
  assert.deepEqual(getDotaMatchMvp(createDotaMatchMvpFixture('technical')).leaders, []);
  assert.deepEqual(getDotaMatchMvp(createDotaMatchMvpFixture('scheduled')).leaders, []);
  const input = createDotaMatchMvpFixture();
  delete input.match.resultConfirmed;
  assert.deepEqual(getDotaMatchMvp(input).leaders, []);
});

test('a retained score carries only this match correction and stale flags', () => {
  const input = createDotaMatchMvpFixture();
  input.snapshot.correctionPendingMatchIds = ['701', '702'];
  validateMvpSnapshot(input.snapshot, input.tournament);
  const result = getDotaMatchMvp({ ...input, availability: 'unavailable' });
  assert.deepEqual(result.correctionPendingMatchIds, ['701']);
  assert.equal(result.stale, true);
  assert.equal(result.preliminary, true);
  assert.deepEqual(result.leaders.map((player) => player.accountId), ['2']);
  input.snapshot.correctionPendingMatchIds = ['702'];
  assert.equal(getDotaMatchMvp(input).preliminary, false);
});

test('this map ingestion flag marks its retained score preliminary without inventing missing scores', () => {
  const input = createDotaMatchMvpFixture();
  input.snapshot.ingestionComplete = false;
  input.snapshot.ingestionPendingMatchIds = ['701'];
  validateMvpSnapshot(input.snapshot, input.tournament);
  const result = getDotaMatchMvp(input);
  assert.equal(result.coverageComplete, false);
  assert.equal(result.preliminary, true);
  assert.deepEqual(result.pendingMapIds, ['701']);
  assert.deepEqual(result.leaders.map((player) => player.accountId), ['2']);
  input.snapshot.ingestionPendingMatchIds = ['702'];
  assert.equal(getDotaMatchMvp(input).coverageComplete, true);
  assert.equal(getDotaMatchMvp(input).preliminary, false);
});

test('map links are deduplicated; retrospective actual-map linkage is accepted without a fixture ID', () => {
  const input = createDotaMatchMvpFixture();
  input.match.maps = [{ id: 'dota-map-701', url: 'https://www.opendota.com/matches/701' }];
  input.match.mapLinks = [{ matchId: '701' }];
  input.snapshot.retrospective = true;
  for (const player of input.snapshot.players) for (const record of player.records) if (record.matchId === '701') record.fixtureId = null;
  validateMvpSnapshot(input.snapshot, input.tournament);
  assert.deepEqual(getDotaMatchMvp(input).mapIds, ['701']);
  assert.deepEqual(getDotaMatchMvp(input).leaders.map((player) => player.accountId), ['2']);
});

test('missing, conflicting or ambiguous fixture linkage never falls back to tournament ranks', () => {
  const input = createDotaMatchMvpFixture();
  const absent = getDotaMatchMvp({ ...input, snapshot: null, availability: 'loading' });
  assert.equal(absent.reason, 'snapshot-missing');
  assert.deepEqual(absent.leaders, []);
  input.match.maps = [{ matchId: '999' }];
  assert.deepEqual(getDotaMatchMvp(input).leaders, []);
  input.match.maps = [{ matchId: '702' }];
  assert.equal(getDotaMatchMvp(input).reason, 'map-fixture-conflict');
  input.match.maps = [{ matchId: '701' }, { matchId: '702' }];
  assert.equal(getDotaMatchMvp(input).reason, 'ambiguous-bo1-map');
  input.match.maps = [];
  assert.deepEqual(getDotaMatchMvp(input).mapIds, ['701']);
});

test('series aggregation remains explicitly unsupported until its match MVP rule is agreed', () => {
  for (const bestOf of ['BO3', 'BO5', undefined]) {
    const input = createDotaMatchMvpFixture();
    input.match.bestOf = bestOf;
    const result = getDotaMatchMvp(input);
    assert.equal(result.status, 'unsupported');
    assert.deepEqual(result.leaders, []);
  }
});
