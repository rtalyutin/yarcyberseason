import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMatchdayModel, getDisplayedResult, getMatchConsequence, getPreviousMatchday } from '../src/lib/matchday.js';
const tournament = JSON.parse(readFileSync(new URL('../src/data/tournaments/current-cs2-2026.json', import.meta.url), 'utf8'));

test('previous day follows selected date, including completed days and month boundaries', () => {
  const model = getMatchdayModel(tournament);
  const lower = getPreviousMatchday(model, '2026-09-06');
  assert.equal(lower.date, '2026-09-05');
  assert.equal(lower.completed.length, 1);
  assert.equal(lower.completed[0].bestOf, 'BO3');
  assert.deepEqual([lower.completed[0].score1, lower.completed[0].score2], [2, 1]);
  assert.equal(getPreviousMatchday(model, '2026-09-05').completed.length, 2);
  assert.equal(getPreviousMatchday(model, '2026-09-01').date, '2026-08-31');
  assert.equal(getPreviousMatchday(model, '2026-08-30'), null);
});

test('previous results come from full history even when live date tabs hide older dates', () => {
  const live = {stages:[{id:'playoffs',matches:[
    {id:'a',date:'2026-09-01',status:'completed'},
    {id:'b',date:'2026-09-03',status:'completed'},
    {id:'c',date:'2026-09-04',status:'scheduled'},
  ]}],matchday:{nextStageId:'playoffs'}};
  const model = getMatchdayModel(live);
  assert.deepEqual(model.days.map(day => day.date), ['2026-09-03','2026-09-04']);
  assert.equal(getPreviousMatchday(model,'2026-09-03').date,'2026-09-01');
  assert.deepEqual(getPreviousMatchday(model,'2026-09-04').completed.map(m=>m.id),['b']);
  assert.equal(getPreviousMatchday(model,null),null);
});

test('source-order display keeps scores and map scores tied to the correct teams', () => {
  const match={team1:'A',team2:'B',score1:1,score2:2,maps:[{name:'Ancient',score1:8,score2:13}]};
  const result=getDisplayedResult(match,{winnerFirst:false});
  assert.deepEqual([result.first,result.score1,result.second,result.score2,result.winner],['A',1,'B',2,'B']);
  assert.deepEqual(result.maps.map(m=>[m.score1,m.score2]),[[8,13]]);
});

test('completed matchday opens the grand final and retains every playoff date', () => {
  const model = getMatchdayModel(tournament);
  assert.equal(model.days.length, 8);
  assert.equal(model.defaultDate, '2026-09-06');
  assert.ok(model.days.every(day => day.scheduled.length === 0));
  assert.equal(model.days[0].date, '2026-08-30');
  const final = model.days.at(-1).completed[0];
  assert.deepEqual([getDisplayedResult(final).first, getDisplayedResult(final).score1, getDisplayedResult(final).score2], ['PIVNAYA KEGA', 3, 2]);
  assert.deepEqual(getDisplayedResult(final).maps, []);
  assert.equal(getMatchConsequence(final, model.matches), 'PIVNAYA KEGA — победитель турнира');
  const lower = model.days.find(day => day.date === '2026-09-05').completed[0];
  assert.equal(lower.bestOf, 'BO3');
  assert.deepEqual(getDisplayedResult(lower).maps.map(m => [m.name, m.score1, m.score2]), [['Mirage', 13, 10], ['Ancient', 10, 13], ['Anubis', 13, 5]]);
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
  assert.equal(model.days.at(-1).completed.length, 1);
  assert.equal(model.days.at(-1).scheduled.length, 0);
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
