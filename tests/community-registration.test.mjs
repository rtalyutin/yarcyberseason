import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCommunityModel, validateCommunity, teamForDiscipline, teamSummary, upcomingMatches } from '../src/lib/community.js';
import { getTournamentModel, resolveTournamentView, participantCount } from '../src/lib/tournament.js';
const read = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const registry = read('../src/data/teams.json');
const tournaments = fs.readdirSync(new URL('../src/data/tournaments/', import.meta.url)).filter((p) => p.endsWith('.json')).map((p) => read(`../src/data/tournaments/${p}`));
const dota = tournaments.find((t) => t.id === 'dota2-autumn-2026');
const model = buildCommunityModel(tournaments, registry);

test('all sixteen organizer names are registered in order, without matches or seeds', () => {
  assert.deepEqual(dota.participants.map((p) => p.displayName), ['Vnext', 'Leto Jr', 'Mi Ne Pushim!', 'strela team', 'WAYPROD.', 'Fummo', '4fans', 'ARB Esports', 'PIVNAYA KEGA', 'Tech Titans', 'Easy Gaming', 'Team Borisogleb', 'parallax team', 'liqa sto', 'psb_bank', 'РГАТУ']);
  assert.equal(participantCount(dota), 16);
  assert.equal(dota.registration.status, 'closed');
  assert.equal(dota.status, 'upcoming');
  assert.equal(getTournamentModel(dota).matches.length, 0);
  assert.ok(dota.participants.every((p) => !('seed' in p)));
  assert.deepEqual(validateCommunity(tournaments, registry), []);
  const view = getTournamentModel(dota);
  assert.equal(resolveTournamentView(view, '?section=participants').section, 'participants');
  assert.equal(resolveTournamentView(view, '', '#participants').section, 'participants');
});

test('Dota entries reuse CS identities without inheriting CS results', () => {
  for (const [name, id] of [['PIVNAYA KEGA', 'pivnaya-kega'], ['psb_bank', 'psb-bank'], ['РГАТУ', 'bobr1ki']]) {
    const team = model.resolveTeam(dota.id, name);
    assert.equal(team.id, `cs2-august-2026-${id}`);
    const section = teamForDiscipline(team, 'Dota 2');
    assert.equal(section.entries.length, 1);
    assert.equal(section.entries[0].status, 'registered');
    assert.equal(section.matches.length, 0);
    assert.equal(teamSummary(section).wins, 0);
    assert.equal(upcomingMatches(section).length, 0);
  }
  const kega = teamForDiscipline(model.getTeam('cs2-august-2026-pivnaya-kega'), 'Counter-Strike 2');
  const { opponents, ...score } = teamSummary(kega);
  assert.deepEqual(score, { wins: 7, losses: 2, draws: 0, technical: 1 });
  assert.equal(kega.entries[0].placement, 1);
});

test('discipline filter separates both played and upcoming games against a shared opponent', () => {
  const result = { confirmed: true, known: true, score: [1, 0], winnerSide: 1 };
  const team = { id: 'a', entries: [], matches: [
    { id: 'cs', discipline: 'Counter-Strike 2', status: 'completed', team1Id: 'a', team2Id: 'b', result },
    { id: 'dota', discipline: 'Dota 2', status: 'completed', team1Id: 'b', team2Id: 'a', result },
    { id: 'next-cs', discipline: 'Counter-Strike 2', status: 'scheduled', result: {} },
    { id: 'next-dota', discipline: 'Dota 2', status: 'scheduled', result: {} },
  ] };
  const d = teamForDiscipline(team, 'Dota 2');
  assert.equal(teamSummary(d).wins, 0);
  assert.equal(teamSummary(d).losses, 1);
  assert.equal(teamSummary(d).opponents[0].matches.length, 1);
  assert.deepEqual(upcomingMatches(d).map((m) => m.id), ['next-dota']);
});

test('invalid participation and disciplines block the build; aliases do not duplicate entries', () => {
  for (const mutate of [
    (t) => t.participants.push(t.participants[0]),
    (t) => { t.participants[0].teamId = 'missing'; },
    (t) => { t.participants[0].displayName = 'unbound'; },
    (t) => { t.registration.capacity = 17; },
  ]) {
    const next = structuredClone(tournaments); mutate(next.find((t) => t.id === dota.id));
    assert.ok(validateCommunity(next, registry).length);
  }
  const bad = structuredClone(registry);
  bad.teams.find((t) => t.id === 'cs2-august-2026-pivnaya-kega').disciplines = ['Counter-Strike 2'];
  assert.ok(validateCommunity(tournaments, bad).some((e) => e.includes('Invalid binding')));
  const aliases = structuredClone(registry);
  aliases.bindings.push({ tournamentId: dota.id, sourceName: 'KEGA', teamId: 'cs2-august-2026-pivnaya-kega' });
  const team = buildCommunityModel(tournaments, aliases).getTeam('cs2-august-2026-pivnaya-kega');
  assert.equal(team.entries.length, 2);
  assert.equal(participantCount(dota), 16);
});
