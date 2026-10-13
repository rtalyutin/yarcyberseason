import test from 'node:test';
import assert from 'node:assert/strict';
import tournament from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };
import { getSwissStandings, getPlayoffView, getPlayoffSeeding, formatBuchholz } from '../src/lib/swiss-seeding.js';
import { sortSwissRows } from '../src/lib/swiss-presentation.js';
import { getTournamentModel } from '../src/lib/tournament.js';
import { applyDotaSnapshot } from '../src/lib/dota-results.js';
import { buildCommunityModel } from '../src/lib/community.js';
import registry from '../src/data/teams.json' with { type: 'json' };

const playoffs = (value) => value.stages.find((stage) => stage.id === 'playoffs');
const example = () => ({ participants: ['A', 'B', 'C', 'D'].map((id) => ({ teamId: id, displayName: id })), stages: [{ id: 'swiss', type: 'swiss', rounds: [
  { matches: [
    { id: 'a', team1Id: 'A', team2Id: 'B', seed1: 3, seed2: 1, resultConfirmed: true, status: 'completed', score1: 1, score2: 0 },
    { id: 'b', team1Id: 'C', team2Id: 'D', seed1: 4, seed2: 2, resultConfirmed: true, status: 'completed', score1: 1, score2: 0 },
  ] }, { matches: [
    { id: 'c', team1Id: 'B', team2Id: 'C', resultConfirmed: true, status: 'completed', score1: 2, score2: 1 },
    { id: 'd', team1Id: 'A', team2Id: 'D', resultConfirmed: true, status: 'walkover', score1: 2, score2: 0 },
    { id: 'pending', team1Id: 'A', team2Id: 'C', status: 'scheduled' },
  ] },
] }] });

test('series count once, including technical BO3; Buchholz uses current opponent records', () => {
  const source = example(), before = structuredClone(source);
  assert.deepEqual(getSwissStandings(source).map(({ team, won, lost, buchholz }) => [team, won, lost, buchholz]), [
    ['A', 2, 0, -2], ['B', 1, 1, 2], ['C', 1, 1, -2], ['D', 0, 2, 2],
  ]);
  assert.deepEqual(source, before);
});

test('unconfirmed, scheduled, equal scores and repeated fixture IDs add no second result', () => {
  const source = example();
  const rows = getSwissStandings(source);
  const second = source.stages[0].rounds[1].matches;
  second.push({ ...second[0] }, { id: 'unconfirmed', team1Id: 'B', team2Id: 'C', score1: 2, score2: 0, status: 'completed', resultConfirmed: false },
    { id: 'double-technical', team1Id: 'A', team2Id: 'D', score1: 0, score2: 0, status: 'walkover', resultConfirmed: true });
  assert.deepEqual(getSwissStandings(source), rows);
});

test('a correction recalculates both records and opponent Buchholz from scratch', () => {
  const source = example();
  Object.assign(source.stages[0].rounds[1].matches[0], { score1: 1, score2: 2 });
  const rows = getSwissStandings(source);
  assert.deepEqual(rows.map(({ team, won, lost, buchholz }) => [team, won, lost, buchholz]), [
    ['A', 2, 0, -4], ['C', 2, 0, -4], ['B', 0, 2, 4], ['D', 0, 2, 4],
  ]);
});

test('ties use descending Buchholz then ascending draw; missing coefficients are not zero', () => {
  const rows = [
    { team: 'Draw 9', won: 3, lost: 0, buchholz: -2, initialSeed: 9 },
    { team: 'Draw 2', won: 3, lost: 0, buchholz: -2, initialSeed: 2 },
    { team: 'Higher BH', won: 3, lost: 0, buchholz: -1, initialSeed: 16 },
    { team: '3:1', won: 3, lost: 1, buchholz: 10, initialSeed: 1 },
    { team: '3:2', won: 3, lost: 2, buchholz: 20, initialSeed: 3 },
  ];
  assert.deepEqual(sortSwissRows(rows).map((row) => row.team), ['Higher BH', 'Draw 2', 'Draw 9', '3:1', '3:2']);
  assert.deepEqual([-4, 0, 4, undefined, null].map(formatBuchholz), ['−4', '0', '+4', '—', '—']);
});

test('initial draw is R1, never later rounds or participant array order', () => {
  const source = example();
  source.participants.reverse();
  Object.assign(source.stages[0].rounds[1].matches[0], { seed1: 99, seed2: 98 });
  assert.equal(getSwissStandings(source).find((row) => row.team === 'B').initialSeed, 1);
  assert.equal(getSwissStandings(source).find((row) => row.team === 'C').initialSeed, 4);
});

test('final seeding requires all Swiss records to finish; qualified buckets remain 3:0, 3:1, 3:2', () => {
  // Synthetic complete Swiss, generated independently of the seeding projection.
  const teams = Array.from({ length: 16 }, (_, index) => ({ id: `test-${index + 1}`, seed: index + 1, w: 0, l: 0 }));
  const rounds = [];
  for (let number = 0; number < 5; number++) {
    const groups = new Map();
    for (const team of teams.filter((team) => team.w < 3 && team.l < 3)) {
      const key = `${team.w}:${team.l}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(team);
    }
    const matches = [];
    for (const group of groups.values()) for (let index = 0; index < group.length; index += 2) {
      const [a, b] = group.slice(index, index + 2);
      matches.push({ id: `test-${number}-${a.id}`, team1Id: a.id, team2Id: b.id, seed1: a.seed, seed2: b.seed, resultConfirmed: true, status: 'completed', score1: 1, score2: 0 });
      a.w++; b.l++;
    }
    rounds.push({ matches });
  }
  const source = { participants: teams.map((team) => ({ teamId: team.id, displayName: team.id })), stages: [{ id: 'swiss', type: 'swiss', rounds }] };
  const result = getPlayoffSeeding(source, playoffs(tournament));
  assert.equal(result.complete, true);
  assert.equal(result.qualifiedCount, 8);
  assert.deepEqual(result.entrants.map((row) => `${row.won}:${row.lost}`), ['3:0', '3:0', '3:1', '3:1', '3:1', '3:2', '3:2', '3:2']);
  source.stages[0].rounds.at(-1).matches[0].resultConfirmed = false;
  assert.equal(getPlayoffSeeding(source, playoffs(tournament)).complete, false);
});

test('partial Swiss stays provisional; missing or duplicate draw leaves all projected seeds unknown', () => {
  const source = structuredClone(tournament);
  let result = getPlayoffSeeding(source, playoffs(source));
  assert.equal(result.qualifiedCount, 2);
  assert.equal(result.complete, false);
  assert.equal(result.entrants.length, 8);
  assert.equal(result.entrants.filter((row) => row.qualified).length, 2);
  assert.ok(result.entrants.every((row) => row.lost < 3));
  delete source.stages[0].rounds[0].matches[0].seed1;
  result = getPlayoffSeeding(source, playoffs(source));
  assert.equal(result.drawKnown, false);
  assert.equal(result.entrants.length, 0);
  source.stages[0].rounds[0].matches[0].seed1 = source.stages[0].rounds[0].matches[0].seed2;
  assert.equal(getPlayoffSeeding(source, playoffs(source)).entrants.length, 0);
});

test('revision23 R4 overlay gives four qualifiers and the independently calculated Buchholz', () => {
  // Public organizer confirmations from revision23; no map/player data needed.
  const entries = [['01', 0, 1], ['02', 1, 0], ['05', 2, 0], ['06', 2, 0]];
  const fixtureMap = new Map(tournament.stages[0].rounds.flatMap((round) => round.matches).map((match) => [match.id, match]));
  const snapshot = { schemaVersion: 1, tournamentId: tournament.id, leagueId: tournament.leagueId, revision: 23, updatedAt: '2026-10-13T19:53:52.024Z', matches: {} };
  for (const [suffix, score1, score2] of entries) {
    const id = `dota-autumn-swiss-r4-${suffix}`, fixture = fixtureMap.get(id);
    snapshot.matches[id] = { team1Id: fixture.team1Id, team2Id: fixture.team2Id, score1, score2, status: 'completed', resultConfirmed: true, scoreKind: 'series', maps: [], winnerTeamId: fixture[`team${score1 > score2 ? 1 : 2}Id`], source: 'organizer', confirmationSource: 'public-results-revision23-regression', confirmedAt: snapshot.updatedAt };
  }
  const updated = applyDotaSnapshot(tournament, snapshot);
  const view = getPlayoffView(updated, playoffs(updated));
  assert.deepEqual(view.entrants.filter((row) => row.qualified).map(({ team, won, lost, buchholz, initialSeed }) => [team, won, lost, buchholz, initialSeed]), [
    ['Team Leto', 3, 0, 4, 10], ['Aegis Guardians', 3, 0, -1, 3], ['Easy Gaming', 3, 1, 2, 2], ['ARB Esports', 3, 1, -1, 12],
  ]);
  assert.equal(view.complete, false);
  assert.equal(getTournamentModel(updated).finishedCount, 28);
});

test('full 14-match topology has the approved halves, crossover and one BO5', () => {
  const stage = playoffs(tournament), matches = stage.rounds.flatMap((round) => round.matches);
  const byId = new Map(matches.map((match) => [match.id, match]));
  assert.equal(matches.length, 14);
  assert.deepEqual(stage.rounds[0].matches.map((match) => [match.seed1, match.seed2]), [[1, 8], [4, 5], [2, 7], [3, 6]]);
  assert.equal(matches.filter((match) => match.bestOf === 'BO3').length, 13);
  assert.equal(byId.get('final-1').bestOf, 'BO5');
  assert.deepEqual(byId.get('upper-5').loserTo, { matchId: 'lower-4', slot: 2 });
  assert.deepEqual(byId.get('upper-6').loserTo, { matchId: 'lower-3', slot: 2 });
  const destinations = [];
  for (const match of matches) for (const field of ['winnerTo', 'loserTo']) if (match[field]) {
    const target = match[field];
    assert.ok(byId.has(target.matchId));
    assert.notEqual(target.matchId, match.id);
    destinations.push(`${target.matchId}:${target.slot}`);
  }
  assert.equal(destinations.length, 20);
  assert.equal(new Set(destinations).size, 20, 'Exactly one source per later slot');
  assert.equal(byId.get('final-1').winnerTo, undefined);
  assert.equal(byId.get('final-1').loserTo, undefined);
});

test('projection cannot create real fixtures, schedule counts or team history', () => {
  const before = structuredClone(tournament);
  const schedule = getTournamentModel(tournament);
  const history = buildCommunityModel([tournament], registry);
  const view = getPlayoffView(tournament, playoffs(tournament));
  assert.equal(view.rounds[0].matches.flatMap((match) => match.slots).filter((slot) => slot.team).length, 8);
  assert.ok(view.rounds.slice(1).flatMap((round) => round.matches).flatMap((match) => match.slots).every((slot) => !slot.teamId));
  assert.deepEqual(tournament, before);
  assert.deepEqual(getTournamentModel(tournament), schedule);
  assert.deepEqual([...buildCommunityModel([tournament], registry).matches.keys()], [...history.matches.keys()]);
  assert.equal(schedule.matches.length, 30);
});

test('only confirmed actual playoff pairs supply later slots; corrections drop old participants', () => {
  const source = structuredClone(tournament), stage = playoffs(source);
  const first = stage.rounds[0].matches[0];
  Object.assign(first, { team1: 'Team Leto', team1Id: 'A', team2: 'Easy Gaming', team2Id: 'B', status: 'completed', score1: 2, score2: 0, resultConfirmed: false });
  const slot = () => getPlayoffView(source, stage).rounds[1].matches[0].slots[0];
  assert.equal(slot().teamId, undefined);
  first.resultConfirmed = true;
  assert.equal(slot().teamId, 'A');
  Object.assign(first, { score1: 0, score2: 2 });
  assert.equal(slot().teamId, 'B');
  Object.assign(first, { score1: 0, score2: 0 });
  assert.equal(slot().teamId, undefined);
});
