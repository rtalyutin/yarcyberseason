import test from 'node:test';
import assert from 'node:assert/strict';
import tournament from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };
import { getPlayoffRoute } from '../src/lib/playoff-route.js';

const base = tournament.stages.find((stage) => stage.id === 'playoffs').rounds.flatMap((round) => round.matches);
const example = () => structuredClone(base);
const match = (matches, id) => matches.find((item) => item.id === id);
const actualQuarterfinal = (matches, result = {}) => Object.assign(match(matches, 'upper-1'), {
  team1Id: 'alpha', team2Id: 'beta',
  status: 'completed', resultConfirmed: true, score1: 2, score2: 0,
  ...result,
});
const assertRoute = (route, nodes, edges) => {
  assert.deepEqual([...route.nodes].sort(), [...nodes].sort(), 'Exact match IDs on this team route');
  assert.deepEqual([...route.edges].sort(), [...edges].sort(), 'Exact winner/loser transitions on this team route');
};

// Expected paths come from the published crossover: QF winner goes to В5,
// QF loser goes to Н1, and the loser of В5 crosses to Н4. Opponent-only
// quarters and the other first lower match are never this team's route.
const winningNodes = ['upper-1', 'upper-5', 'upper-7', 'lower-4', 'lower-5', 'lower-6', 'final-1'];
const winningEdges = ['upper-1-winnerTo', 'upper-5-winnerTo', 'upper-5-loserTo', 'upper-7-winnerTo',
  'upper-7-loserTo', 'lower-4-winnerTo', 'lower-5-winnerTo', 'lower-6-winnerTo'];
const losingNodes = ['upper-1', 'lower-1', 'lower-3', 'lower-5', 'lower-6', 'final-1'];
const losingEdges = ['upper-1-loserTo', 'lower-1-winnerTo', 'lower-3-winnerTo', 'lower-5-winnerTo', 'lower-6-winnerTo'];
const forecastNodes = ['upper-1', 'upper-5', 'upper-7', 'lower-1', 'lower-3', 'lower-4', 'lower-5', 'lower-6', 'final-1'];
const forecastEdges = [...new Set([...winningEdges, ...losingEdges])];

test('confirmed first-slot win removes the already impossible quarterfinal-loss branch', () => {
  const matches = example(); actualQuarterfinal(matches);
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), winningNodes, winningEdges);
});

test('confirmed second-slot win selects the winner path independently of slot position', () => {
  const matches = example(); actualQuarterfinal(matches, { score1: 0, score2: 2 });
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'beta'), winningNodes, winningEdges);
});

test('the first confirmed loss enters the lower bracket and still permits reaching the grand final', () => {
  const matches = example(); actualQuarterfinal(matches);
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'beta'), losingNodes, losingEdges);
});

test('an unconfirmed lead retains both possible paths without treating the score as an outcome', () => {
  const matches = example(); actualQuarterfinal(matches, { resultConfirmed: false });
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), forecastNodes, forecastEdges);
});

test('live or scheduled scores do not settle a team route even with a retained confirmation flag', () => {
  for (const status of ['live', 'scheduled']) {
    const matches = example(); actualQuarterfinal(matches, { status });
    assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), forecastNodes, forecastEdges);
  }
});

test('ties and invalid score values cannot choose a winner or loser branch', () => {
  for (const scores of [[1, 1], [0, 0], [2.5, 0], [-1, 0], [2, undefined]]) {
    const matches = example(); actualQuarterfinal(matches, { score1: scores[0], score2: scores[1] });
    assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), forecastNodes, forecastEdges);
  }
});

test('a confirmed lower-bracket loss terminates the path instead of forecasting a comeback', () => {
  const matches = example(); actualQuarterfinal(matches);
  Object.assign(match(matches, 'lower-1'), {
    team1Id: 'beta', team2Id: 'gamma', status: 'completed', resultConfirmed: true, score1: 0, score2: 2,
  });
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'beta'), ['upper-1', 'lower-1'], ['upper-1-loserTo']);
});

test('confirmed lower wins extend the path only until the actual elimination match', () => {
  const matches = example(); actualQuarterfinal(matches);
  Object.assign(match(matches, 'lower-1'), {
    team1Id: 'gamma', team2Id: 'beta', status: 'completed', resultConfirmed: true, score1: 1, score2: 2,
  });
  Object.assign(match(matches, 'lower-3'), {
    team1Id: 'beta', team2Id: 'delta', status: 'completed', resultConfirmed: true, score1: 2, score2: 0,
  });
  Object.assign(match(matches, 'lower-5'), {
    team1Id: 'beta', team2Id: 'epsilon', status: 'completed', resultConfirmed: true, score1: 0, score2: 2,
  });
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'beta'),
    ['upper-1', 'lower-1', 'lower-3', 'lower-5'],
    ['upper-1-loserTo', 'lower-1-winnerTo', 'lower-3-winnerTo']);
});

test('a confirmed technical result selects the same team-specific branches as a played result', () => {
  const matches = example(); actualQuarterfinal(matches, { status: 'walkover', scoreKind: 'technical' });
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), winningNodes, winningEdges);
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'beta'), losingNodes, losingEdges);
});

test('an unpublished projection shows both branches, merges later matches once, and never mutates fixtures', () => {
  const matches = example(), before = structuredClone(matches);
  for (const item of matches) {
    if (item.winnerTo) Object.freeze(item.winnerTo);
    if (item.loserTo) Object.freeze(item.loserTo);
    Object.freeze(item);
  }
  Object.freeze(matches);
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), forecastNodes, forecastEdges);
  assert.deepEqual(matches, before);
});

test('selecting the match without a team retains both participants possible transitions', () => {
  const matches = example(); actualQuarterfinal(matches);
  assertRoute(getPlayoffRoute(matches, 'upper-1'), forecastNodes, forecastEdges);
});

test('an absent starting match produces no invented path', () => {
  assertRoute(getPlayoffRoute(example(), 'missing-match', 'alpha'), [], []);
});

test('a team absent from a published starting pair does not highlight another team match', () => {
  const matches = example(); actualQuarterfinal(matches);
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'not-in-this-match'), [], []);
});

test('a downstream published pair without this team cannot create a highlighted edge to another team match', () => {
  const matches = example(); actualQuarterfinal(matches);
  Object.assign(match(matches, 'upper-5'), { team1Id: 'gamma', team2Id: 'delta' });
  assertRoute(getPlayoffRoute(matches, 'upper-1', 'alpha'), ['upper-1'], []);
});
