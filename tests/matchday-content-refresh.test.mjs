import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatMatchday, getDisplayedResult, getMatchdayModel, getPreviousMatchday, isFinishedMatch } from '../src/lib/matchday.js';

const currentDota = JSON.parse(readFileSync(new URL('../src/data/tournaments/dota2-autumn-2026.json', import.meta.url), 'utf8'));
const fixture = (matches) => ({ id: 'dota-fixture', discipline: 'Dota 2', stages: [{ id: 'swiss', title: 'Швейцарская система', matches }] });

test('current Dota Matchday retains all actual results, partial R2 dates and no empty playoff slots', () => {
  const model = getMatchdayModel(currentDota);
  assert.equal(model.matches.length, 30);
  assert.deepEqual(model.days.map((day) => day.date), ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', 'undated']);
  assert.equal(model.defaultDate, '2026-10-13');
  assert.equal(model.days[2].scheduled.length, 0);
  assert.equal(model.days[2].completed.length, 5);
  const psb = model.days[2].completed.find((match) => match.id === 'dota-autumn-swiss-r2-05');
  assert.deepEqual([psb.team1, psb.team2], ['psb_bank', 'ARB Esports']);
  assert.equal(psb.scheduledAt, '2026-10-11T15:00:00+03:00');
  assert.equal(psb.time, '15:00');
  assert.deepEqual([getDisplayedResult(psb).score1, getDisplayedResult(psb).score2], [1, 0]);
  assert.equal(getDisplayedResult(psb).winner, 'ARB Esports');
  const mnp = model.days[2].completed.find((match) => match.id === 'dota-autumn-swiss-r2-04');
  assert.equal(mnp.scheduledAt, '2026-10-11T19:00:00+03:00');
  const pending = model.days.at(-1);
  assert.equal(pending.dateLabel, '11–12 октября');
  assert.equal(pending.scheduled.length, 0);
  assert.equal(pending.completed.length, 3);
  const third = model.days[3];
  assert.equal(third.completed.length, 8);
  assert.equal(third.scheduled.length, 0);
  const partial = third.completed.find((match) => match.id === 'dota-autumn-swiss-r3-02');
  assert.deepEqual([getDisplayedResult(partial).score1, getDisplayedResult(partial).score2], [2, 1]);
  assert.deepEqual(partial.technicalMapNumbers, [3]);
  assert.equal(partial.maps.length, 2);
  assert.equal(partial.maps[0].winnerTeamId, partial.team2Id);
  assert.equal(partial.maps[1].winnerTeamId, partial.team1Id);
  const technical = pending.completed.find((match) => match.id === 'dota-autumn-swiss-r2-08');
  assert.equal(technical.scoreKind, 'technical');
  assert.deepEqual([getDisplayedResult(technical).score1, getDisplayedResult(technical).score2], [1, 0]);
  assert.equal(technical.winner, 'Tech Titans');
  assert.deepEqual(technical.maps, []);
  assert.ok(pending.completed.every((match) => match.date === '11–12 октября' && !match.scheduledAt && !match.time));
  const fourth = model.days.find((day) => day.date === '2026-10-13');
  assert.equal(fourth.dateLabel, '13 октября');
  assert.equal(fourth.completed.length, 0);
  assert.equal(fourth.scheduled.length, 6);
  assert.ok(fourth.scheduled.every((match) => match.roundId === 'round-4' && match.date === '2026-10-13' && !match.scheduledAt && !match.time));
  const opening = model.days[0].completed.find((match) => match.id === 'dota-autumn-swiss-r1-04');
  assert.ok(opening);
  assert.deepEqual([getDisplayedResult(opening).score1, getDisplayedResult(opening).score2], [1, 0]);
  assert.equal(getPreviousMatchday(model, 'undated'), null);
});

test('Dota completion requires explicit organizer confirmation and conceals unconfirmed score data', () => {
  for (const status of ['completed', 'walkover', 'bye']) {
    for (const resultConfirmed of [undefined, false]) {
      const match = { id: status, team1: 'A', team2: 'B', date: '2026-10-11', status, resultConfirmed, score1: 1, score2: 0, winner: 'A', maps: [{ name: 'Карта 1', score1: 1, score2: 0 }] };
      const model = getMatchdayModel(fixture([match]));
      assert.equal(model.days[0].completed.length, 0);
      assert.equal(model.days[0].scheduled.length, 1);
      assert.deepEqual(getDisplayedResult(model.matches[0]), { first: 'A', second: 'B', score1: null, score2: null, winner: null, maps: [] });
      assert.equal(isFinishedMatch({ ...match, resultConfirmed: true, discipline: 'Dota 2' }), true);
    }
  }
  assert.equal(isFinishedMatch({ status: 'completed', discipline: 'Counter-Strike 2' }), true);
});

test('published live assigned stream selects its Matchday despite an earlier scheduled fixture', () => {
  const model = getMatchdayModel(fixture([
    { id: 'first', date: '2026-10-10', status: 'scheduled', broadcastLinks: { twitch: 'https://twitch.tv/first' } },
    { id: 'live', date: '2026-10-11', status: 'live', broadcastLinks: { vk: 'https://vk.com/live' } },
    { id: 'hidden', date: '2026-10-12', status: 'live', published: false, broadcastLinks: { vk: 'https://vk.com/hidden' } },
  ]));
  assert.equal(model.defaultDate, '2026-10-11');
  assert.deepEqual(model.matches.map((match) => match.id), ['first', 'live']);
});

test('closed assigned stream does not pin the opening day ahead of actual pending matches', () => {
  const model = getMatchdayModel(fixture([
    { id: 'opening', date: '2026-10-09', status: 'completed', resultConfirmed: true, broadcastLinks: { twitch: 'https://twitch.tv/ycs' } },
    { id: 'pending', date: '11–12 октября', status: 'scheduled' },
  ]));
  assert.equal(model.defaultDate, 'undated');
  assert.equal(model.days.at(-1).dateLabel, '11–12 октября');
});

test('unknown dates stay honest and source data is not changed by projection', () => {
  const source = fixture([{ id: 'known', status: 'scheduled', dateDisplay: '12–13 октября' }, { id: 'unknown', status: 'scheduled' }, { id: 'slot', team1: null, team2: null }]);
  const before = structuredClone(source);
  const model = getMatchdayModel(source);
  assert.equal(model.matches.length, 2);
  assert.equal(model.days[0].dateLabel, 'Дата уточняется');
  assert.equal(model.matches[0].dateDisplay, '12–13 октября');
  assert.equal(formatMatchday(undefined), 'Дата уточняется');
  assert.equal(formatMatchday('11–12 октября'), '11–12 октября');
  assert.deepEqual(source, before);
});
