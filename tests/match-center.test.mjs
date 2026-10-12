import test from 'node:test';
import assert from 'node:assert/strict';
import { getMatchMapSlots, getPublishedMapStats } from '../src/lib/match-center.js';

const fixture = (extra = {}) => ({ id: 'synthetic-match', tournamentId: 'synthetic-tournament', discipline: 'Dota 2',
  team1Id: 'alpha', team2Id: 'beta', bestOf: 'BO3', status: 'completed', resultConfirmed: true,
  scoreKind: 'series', score1: 2, score2: 0, ...extra });

test('a confirmed BO3 2:0 has two played slots awaiting absent data and an unplayed decider', () => {
  const slots = getMatchMapSlots(fixture());
  assert.deepEqual(slots.map((slot) => slot.state), ['awaiting-data', 'awaiting-data', 'not-played']);
  assert.deepEqual(slots.map((slot) => slot.number), [1, 2, 3]);
  assert.ok(slots.every((slot) => slot.result === null && slot.winnerTeamId === null));
  const veto = getMatchMapSlots(fixture({ discipline: 'Counter-Strike 2', maps: [{ name: 'Ancient' }, { name: 'Inferno' }, { name: 'Nuke' }] }));
  assert.equal(veto[2].name, 'Nuke');
  assert.equal(veto[2].state, 'not-played');
  assert.equal(veto[2].map, null);
});

test('actual source order and supplemental links share stable IDs without duplicated maps', () => {
  const source = fixture({ bestOf: 'BO5', score1: 3, maps: [
    { matchId: '802', winnerTeamId: 'alpha' }, { matchId: '801', winnerTeamId: 'alpha' },
  ], mapLinks: [{ matchId: '802', url: 'https://www.opendota.com/matches/802' }, { matchId: '803' }] });
  const before = structuredClone(source), slots = getMatchMapSlots(source);
  assert.deepEqual(slots.map((slot) => slot.mapId), ['802', '801', '803', null, null]);
  assert.deepEqual(slots.map((slot) => slot.key), ['id:802', 'id:801', 'id:803', 'slot:4', 'slot:5']);
  assert.equal(slots[0].result.url, 'https://www.opendota.com/matches/802');
  assert.deepEqual(source, before);
});

test('Dota map kills never establish a winner; explicit winner can have fewer kills', () => {
  const source = fixture({ bestOf: 'BO1', score1: 1, maps: [{ matchId: '701', kills1: 5, kills2: 35 }] });
  assert.equal(getMatchMapSlots(source)[0].winnerTeamId, null);
  source.maps[0].winnerTeamId = 'alpha';
  const slot = getMatchMapSlots(source)[0];
  assert.equal(slot.winnerTeamId, 'alpha');
  assert.deepEqual(slot.result.kills, [5, 35]);
  assert.equal(slot.result.score, null);
});

test('scheduled dates never advance state, technical results have no played map data', () => {
  const scheduled = getMatchMapSlots(fixture({ bestOf: 'BO5', status: 'scheduled', resultConfirmed: false,
    scheduledAt: '2000-01-01T10:00:00+03:00', maps: [] }));
  assert.equal(scheduled.length, 5);
  assert.ok(scheduled.every((slot) => slot.state === 'scheduled'));
  const technical = getMatchMapSlots(fixture({ status: 'walkover', scoreKind: 'technical', maps: [{ matchId: '701', kills1: 1, kills2: 0 }] }));
  assert.ok(technical.every((slot) => slot.state === 'not-played' && slot.map === null && slot.result === null));
  assert.doesNotThrow(() => getMatchMapSlots({ bestOf: 'BO1', status: 'scheduled' }));
});

test('confirmed BO1 CS2 round score survives mapId fallback and produces the correct winner', () => {
  const source = fixture({ discipline: 'Counter-Strike 2', bestOf: 'BO1', scoreKind: 'rounds',
    score1: 13, score2: 4, mapId: 'faceit-map-one', map: 'Ancient', winnerTeamId: 'alpha' });
  const slot = getMatchMapSlots(source)[0];
  assert.equal(slot.key, 'id:faceit-map-one');
  assert.equal(slot.name, 'Ancient');
  assert.deepEqual(slot.result.score, [13, 4]);
  assert.equal(slot.result.unit, 'Раунды');
  assert.equal(slot.winnerTeamId, 'alpha');
  assert.equal(slot.state, 'available');
  delete source.mapId;
  assert.equal(getMatchMapSlots(source)[0].key, 'number:1');
});

test('unconfirmed map results stay hidden even inside a confirmed parent series', () => {
  const source = fixture({ discipline: 'Counter-Strike 2', maps: [{ id: 'one', score1: 13, score2: 4, resultConfirmed: false }] });
  assert.equal(getMatchMapSlots(source)[0].result, null);
  assert.equal(getMatchMapSlots(source)[0].winnerTeamId, null);
  source.maps[0] = { id: 'one', score1: 13, score2: 4, status: 'scheduled' };
  assert.equal(getMatchMapSlots(source)[0].result, null);
  source.status = 'live'; source.resultConfirmed = false;
  source.maps[0] = { id: 'one', score1: 13, score2: 4 };
  assert.equal(getMatchMapSlots(source)[0].result, null);
  source.maps[0].resultConfirmed = true;
  assert.deepEqual(getMatchMapSlots(source)[0].result.score, [13, 4]);
});

test('explicit map lifecycle wins over a retained ready snapshot', () => {
  const snapshot = { tournamentId: 'synthetic-tournament', maps: { 701: { status: 'ready' } } };
  for (const [status, expected] of [['live', 'awaiting-data'], ['cancelled', 'not-played'], ['scheduled', 'scheduled']]) {
    const slot = getMatchMapSlots(fixture({ bestOf: 'BO1', score1: 1, maps: [{ matchId: '701', status }] }), snapshot)[0];
    assert.equal(slot.state, expected);
    assert.equal(slot.result, null);
    assert.equal(slot.winnerTeamId, null);
    if (status === 'cancelled') assert.equal(slot.map, null);
  }
});

function csStats(extra = {}) {
  return fixture({ discipline: 'Counter-Strike 2', bestOf: 'BO1', score1: 1, maps: [{ id: 'cs-map',
    playerStats: Array.from({ length: 10 }, (_, index) => ({ accountId: String(index + 1), nickname: `Synthetic ${index + 1}`,
      teamId: index < 5 ? 'alpha' : 'beta', kills: index, deaths: 1, assists: 0 })), ...extra }] });
}
const stats = (match) => getPublishedMapStats(match, getMatchMapSlots(match)[0]);

test('published CS2 statistics keep absent optional numbers null and award only declared MVP identities', () => {
  const match = csStats({ mvpAccountIds: ['2', '7'] });
  const result = stats(match);
  assert.equal(result.players.length, 10);
  assert.equal(result.players[0].adr, null);
  assert.equal(result.players[0].headshotPercent, null);
  assert.deepEqual(result.leaders.map((player) => player.accountId), ['2', '7']);
  delete match.maps[0].playerStats[0].kills;
  assert.equal(stats(match).players[0].kills, null);
  delete match.maps[0].mvpAccountIds;
  assert.deepEqual(stats(match).leaders, []);
  assert.equal(stats(match).mvpReason, 'not-declared');
});

test('CS2 stats are atomic: invalid player counts, duplicates, team coverage or metrics are rejected', () => {
  for (const mutate of [
    (m) => m.maps[0].playerStats.pop(),
    (m) => { m.maps[0].playerStats[1].accountId = '1'; },
    (m) => { m.maps[0].playerStats[5].teamId = 'alpha'; },
    (m) => { m.maps[0].playerStats[0].kills = 1.5; },
    (m) => { m.maps[0].playerStats[0].adr = Infinity; },
    (m) => { m.maps[0].playerStats[0].headshotPercent = 101; },
  ]) { const match = csStats(); mutate(match); assert.equal(stats(match), null); }
});

test('invalid MVP references do not award a player or discard otherwise valid CS2 statistics', () => {
  for (const mvpAccountIds of [['999'], ['1', '1'], [null]]) {
    const result = stats(csStats({ mvpAccountIds }));
    assert.equal(result.players.length, 10);
    assert.deepEqual(result.leaders, []);
    assert.equal(result.mvpReason, 'invalid-reference');
  }
});

test('CS2 per-map confirmation can precede the series result, but absent or unconfirmed stats stay unavailable', () => {
  const match = csStats({ resultConfirmed: true });
  match.status = 'live'; match.resultConfirmed = false; match.bestOf = 'BO3';
  assert.equal(stats(match).players.length, 10);
  match.maps[0].resultConfirmed = false;
  assert.equal(stats(match), null);
  assert.equal(stats(csStats({ playerStats: undefined })), null);
  assert.equal(stats(csStats({ status: 'scheduled' })), null);
  match.status = 'walkover'; match.maps[0].resultConfirmed = true;
  assert.equal(stats(match), null);
});
