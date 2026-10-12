import test from 'node:test';
import assert from 'node:assert/strict';
import { getSwissRecordState, sortSwissRows } from '../src/lib/swiss-presentation.js';

test('three wins qualify by exit round; three losses eliminate, including a 2:3 decider', () => {
  for (const [won, lost, kind, round] of [
    [3, 0, 'qualified-3', 3], [3, 1, 'qualified-4', 4], [3, 2, 'qualified-5', 5],
    [1, 3, 'eliminated', null], [0, 3, 'eliminated', null], [2, 3, 'eliminated', null],
    [2, 1, 'active', null], [1, 2, 'active', null], [2, 2, 'active', null],
    [0, 0, 'active', null], [1, 0, 'active', null], [0, 1, 'active', null],
    [2, 0, 'active', null], [1, 1, 'active', null], [0, 2, 'active', null],
  ]) {
    const state = getSwissRecordState(won, lost);
    assert.equal(state.kind, kind, `${won}:${lost}`);
    assert.equal(state.round, round);
    assert.equal(state.wins, won, 'Wins are a count, not match chronology');
    assert.equal(state.score, `${won} : ${lost}`);
  }
});

test('missing or inconsistent records never turn into a qualification or zero score', () => {
  for (const [won, lost] of [[undefined, undefined], [null, null], [3, 3], [-1, 0], [4, 0], ['3', 1], [2.5, 1]]) {
    assert.equal(getSwissRecordState(won, lost).kind, 'unknown');
    assert.equal(getSwissRecordState(won, lost).wins, null);
  }
});

test('sorting keeps published ordering within a tied record and leaves source untouched', () => {
  const rows = Object.freeze([
    Object.freeze({ team: 'E', won: 2, lost: 3 }), Object.freeze({ team: 'B', won: 2, lost: 1 }),
    Object.freeze({ team: 'A', won: 3, lost: 0 }), Object.freeze({ team: 'C', won: 2, lost: 1 }),
  ]);
  assert.deepEqual(sortSwissRows(rows).map((row) => row.team), ['A', 'B', 'C', 'E']);
  assert.deepEqual(rows.map((row) => row.team), ['E', 'B', 'A', 'C']);
});
