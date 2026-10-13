import test from 'node:test';
import assert from 'node:assert/strict';
import { getDotaMapMvp, getDotaSeriesMvp } from '../src/lib/dota-match-mvp.js';
import { formatMvpScore, sumMvpScores } from '../src/lib/dota-mvp.js';
import { createDotaMatchMvpFixture } from './dota-match-mvp.test.mjs';

function series(kind = 'ready') {
  const input = createDotaMatchMvpFixture(kind);
  Object.assign(input.match, { bestOf: 'BO3', score1: 2, score2: 0,
    maps: [{ matchId: '701' }, { matchId: '702' }] });
  for (const player of input.snapshot.players) for (const record of player.records) {
    if (record.matchId === '702') record.fixtureId = input.match.id;
  }
  input.snapshot.maps['702'].fixtureId = input.match.id;
  return input;
}

test('series sums exact map records, and its leader differs from map one', () => {
  const input = series(), before = structuredClone(input);
  assert.equal(getDotaMapMvp({ ...input, mapId: '701' }).leaders[0].accountId, '2');
  const result = getDotaSeriesMvp(input);
  assert.deepEqual(result.leaders.map((p) => p.accountId), ['1']);
  assert.deepEqual(result.leaders[0].ratingExact, { numerator: '101', denominator: '1' });
  assert.deepEqual(result.leaders[0].records.map((r) => r.mapNumber), [1, 2]);
  assert.equal(result.final, true);
  result.leaders[0].records[0].heroId = 999;
  assert.deepEqual(input, before);
});

test('BO1 series projection is equivalent to the actual map, not tournament totals', () => {
  const input = createDotaMatchMvpFixture();
  assert.deepEqual(getDotaSeriesMvp(input).leaders.map((p) => p.accountId), ['2']);
  assert.deepEqual(getDotaSeriesMvp(input).leaders[0].ratingExact, { numerator: '2', denominator: '1' });
});

test('technical decider excludes even retained raw map and snapshot; unfinished coverage is provisional', () => {
  const input = series();
  Object.assign(input.match, { score2: 1, resultSource: 'organizer', technicalMapNumbers: [3] });
  input.match.maps.push({ matchId: '703' });
  input.snapshot.maps['703'] = { ...input.snapshot.maps['702'] };
  for (const player of input.snapshot.players) player.records.push({ ...player.records[1], matchId: '703' });
  const technical = getDotaSeriesMvp(input);
  assert.deepEqual(technical.countedMapIds, ['701', '702']);
  assert.equal(technical.final, true);
  delete input.match.technicalMapNumbers;
  input.match.maps.pop();
  const missing = getDotaSeriesMvp(input);
  assert.deepEqual(missing.pendingMapNumbers, [3]);
  assert.equal(missing.final, false);
  assert.equal(missing.preliminary, true);
});

test('no statistics, technical or cancelled fixtures never receive a fabricated award', () => {
  for (const kind of ['pending', 'technical', 'scheduled']) {
    const result = getDotaSeriesMvp(createDotaMatchMvpFixture(kind));
    assert.deepEqual(result.leaders, []);
    assert.equal(result.final, false);
  }
  const input = series(); input.match.status = 'cancelled';
  assert.equal(getDotaSeriesMvp(input).status, 'not-played');
  assert.deepEqual(getDotaSeriesMvp({ ...series(), snapshot: null }).leaders, []);
});

test('partial and live series expose a provisional leader; unrelated pending maps do not affect a final', () => {
  const input = series();
  input.snapshot.ingestionPendingMatchIds = ['999'];
  assert.equal(getDotaSeriesMvp(input).final, true);
  input.snapshot.ingestionPendingMatchIds = ['702'];
  assert.equal(getDotaSeriesMvp(input).final, false);
  assert.deepEqual(getDotaSeriesMvp(input).pendingMapNumbers, [2]);
  input.snapshot.ingestionPendingMatchIds = [];
  Object.assign(input.match, { status: 'live', resultConfirmed: false });
  assert.equal(getDotaSeriesMvp(input).preliminary, true);
  assert.equal(getDotaSeriesMvp(input).leaders[0].accountId, '1');
});

test('estimates, stale and correction notices prevent a final award and remain fixture-scoped', () => {
  const estimate = getDotaSeriesMvp(createDotaMatchMvpFixture('estimated'));
  assert.equal(estimate.status, 'estimated'); assert.equal(estimate.final, false);
  assert.equal(estimate.leaders.length, 5);
  const input = series();
  input.snapshot.correctionPendingMatchIds = ['702', '999'];
  const result = getDotaSeriesMvp({ ...input, availability: 'stale' });
  assert.deepEqual(result.correctionPendingMatchIds, ['702']);
  assert.equal(result.stale, true); assert.equal(result.final, false);
});

test('sum preserves negatives, exact ties and tiny differences hidden by display rounding', () => {
  assert.deepEqual(sumMvpScores([{ numerator: '-1', denominator: '3' }, { numerator: '1', denominator: '6' }]),
    { numerator: '-1', denominator: '6' });
  assert.equal(getDotaSeriesMvp(createDotaMatchMvpFixture('ties')).leaders.length, 2);
  assert.equal(getDotaSeriesMvp(createDotaMatchMvpFixture('zero')).leaders.length, 10);
  const result = getDotaSeriesMvp(createDotaMatchMvpFixture('rounding'));
  assert.equal(result.leaders.length, 1);
  assert.equal(formatMvpScore(result.players[0].ratingExact), formatMvpScore(result.players[1].ratingExact));
});

test('stable identities keep substitutions separate and deduplicate supplemental links', () => {
  const input = series();
  input.match.mapLinks = [{ matchId: '701' }, { matchId: '702' }];
  const player = input.snapshot.players.find((p) => p.accountId === '1');
  const replacementRecord = player.records.pop();
  input.snapshot.players.push({ ...structuredClone(player), accountId: '11', nickname: player.nickname,
    records: [{ ...replacementRecord, heroId: 114 }] });
  const result = getDotaSeriesMvp(input);
  assert.equal(result.players.length, 11);
  assert.deepEqual(result.leaders.map((p) => p.accountId), ['11']);
  assert.equal(result.leaders[0].countedMaps, 1);
  assert.equal(result.leaders[0].records[0].heroId, 114);
  assert.deepEqual(result.countedMapIds, ['701', '702']);
});
