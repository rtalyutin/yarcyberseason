import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMatchdayModel, getDisplayedResult, getMatchConsequence } from '../src/lib/matchday.js';
const tournament = JSON.parse(readFileSync(new URL('../src/data/tournaments/current-cs2-2026.json', import.meta.url), 'utf8'));

test('current matchday shares dated results and upcoming finals', () => {
  const model = getMatchdayModel(tournament);
  assert.deepEqual(model.days.map(d => [d.date, d.completed.length, d.scheduled.length]), [
    ['2026-09-04', 2, 0], ['2026-09-05', 0, 1], ['2026-09-06', 0, 1],
  ]);
  assert.equal(model.defaultDate, '2026-09-05');
  const results = model.days[0].completed.map(getDisplayedResult);
  assert.deepEqual(results.map(r => [r.first, r.score1, r.second, r.score2, r.maps.map(m => [m.name, m.score1, m.score2])]), [
    ['bobr1ki', 2, 'SAITEN x BAD.RABBIT', 0, [['Ancient', 13, 11], ['Mirage', 13, 8]]],
    ['PIVNAYA KEGA', 2, 'GoonGang', 0, [['Mirage', 13, 11], ['Ancient', 13, 9]]],
  ]);
  assert.match(getMatchConsequence(model.days[1].scheduled[0], model.matches), /bobr1ki.*6 сентября/);
  assert.equal(model.days[2].scheduled[0].team2, 'Победитель Н6');
});

test('winner-first display reverses map scores without modifying the source', () => {
  const match = { team1: 'A', team2: 'B', score1: 1, score2: 2, maps: [{name:'Ancient',score1:16,score2:14},{name:'Mirage',score1:4,score2:13}] };
  const original = structuredClone(match);
  assert.deepEqual(getDisplayedResult(match).maps.map(m => [m.score1, m.score2]), [[14,16],[13,4]]);
  assert.deepEqual(match, original);
});

test('technical wins and unavailable map scores are not fabricated', () => {
  const technical = getDisplayedResult({team1:'A',team2:'B',status:'walkover',score1:1,score2:0});
  assert.equal(technical.score1, 1);
  assert.deepEqual(technical.maps, []);
  const missing = getDisplayedResult({team1:'A',team2:'B',status:'completed',winner:'B'});
  assert.equal(missing.first, 'B');
  assert.equal(missing.score1, null);
  assert.deepEqual(missing.maps, []);
});

test('completed tournament retains its final result', () => {
  const finished = structuredClone(tournament);
  for (const round of finished.stages.find(s => s.id === 'playoffs').rounds) {
    for (const m of round.matches) if (m.status === 'scheduled') Object.assign(m, {status:'completed',score1:3,score2:1});
  }
  const model = getMatchdayModel(finished);
  assert.equal(model.defaultDate, '2026-09-06');
  assert.equal(model.days[0].completed.length, 1);
  assert.equal(model.days[0].scheduled.length, 0);
});

test('direct stage matches work and absent dates remain absent', () => {
  const group = { matchday:{nextStageId:'group',previousStageId:'group'}, stages:[{id:'group',title:'Группа',matches:[
    {id:'a',date:'2026-08-24',status:'completed',team1:'A',team2:'B',score1:1,score2:0},
    {id:'b',date:'2026-08-25',status:'scheduled',team1:'C',team2:'D'},
    {id:'c',status:'scheduled',team1:'E',team2:'F'},
  ]}] };
  const model = getMatchdayModel(group);
  assert.equal(model.matches.length,2);
  assert.equal(model.defaultDate,'2026-08-25');
  assert.deepEqual(getMatchdayModel({stages:[]}).days,[]);
});
