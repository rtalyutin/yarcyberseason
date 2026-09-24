import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildCommunityModel, teamForDiscipline } from '../src/lib/community.js';
import { validatePublicRosters } from '../src/lib/rosters.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const registry = read('src/data/teams.json');
const historicalRosters = read('src/data/team-rosters.json');
const currentRosters = read('src/data/team-rosters-autumn-2026.json');
const rosters = { schemaVersion: 1, sources: [...historicalRosters.sources, ...currentRosters.sources], records: [...historicalRosters.records, ...currentRosters.records] };
const tournaments = readdirSync(new URL('../src/data/tournaments/', import.meta.url)).filter((file) => file.endsWith('.json')).map((file) => read(`src/data/tournaments/${file}`));
const model = buildCommunityModel(tournaments, registry, rosters);
const rosterAt = (id, tournamentId) => model.getTeam(id).entries.find((entry) => entry.tournament.id === tournamentId)?.roster;

test('public archive has provenance and keeps each roster within its source tournament', () => {
  assert.deepEqual(validatePublicRosters(tournaments, registry, rosters), []);
  assert.equal(rosters.records.length, 34);
  assert.equal(rosters.records.reduce((total, record) => total + record.members.length, 0), 178);
  assert.equal(rosters.records.filter((record) => record.tournamentId === 'dota2-qual-2026').length, 14);
  assert.equal(rosters.records.filter((record) => record.tournamentId === 'cs2-february-2026').length, 11);
  for (const team of model.teams.values()) for (const entry of team.entries) {
    const sourceRecord = rosters.records.find((record) => record.teamId === team.id && record.tournamentId === entry.tournament.id);
    assert.deepEqual(entry.roster?.members ?? null, sourceRecord?.members ?? null);
    if (entry.roster) assert.ok(entry.roster.source.url.startsWith('https://'));
  }
});

test('merged team aliases retain historical rosters without inheriting them in later events', () => {
  const team = model.getTeam('dota2-main-2026-mi-ne-pushim');
  assert.equal(model.getTeam('dota2-qual-2026-mi-ne-pushim'), team);
  assert.equal(rosterAt(team.id, 'dota2-qual-2026').members[0].name, 'Кирилл «Ucomion» Олешков');
  assert.equal(rosterAt(team.id, 'dota2-main-2026'), null);
  assert.equal(rosterAt(team.id, 'dota2-autumn-2026').members.filter((member) => member.role === 'Игрок').length, 5);
  assert.equal(rosterAt(team.id, 'dota2-autumn-2026').members.filter((member) => member.role === 'Запасной игрок').length, 2);
  const cipher = model.getTeam('cs2-august-2026-cipher');
  assert.equal(rosterAt(cipher.id, 'cs2-february-2026').members[0].name, 'Евгений «frost1klq»');
  assert.equal(rosterAt(cipher.id, 'cs2-august-2026'), null);
  assert.equal(rosterAt('cs2-february-2026-fist-beer', 'cs2-february-2026'), null);
  assert.equal(rosterAt('cs2-february-2026-fist-beer-960854', 'cs2-february-2026').members[0].name, '[将] ZAN');
  assert.equal(rosterAt('cs2-february-2026-ligachad', 'cs2-february-2026').members[2].role, 'Замена');
});

test('new autumn submissions keep Mi Ne Pushim substitutes and Strela reserve scoped to the autumn tournament', () => {
  const miNe = rosterAt('dota2-main-2026-mi-ne-pushim', 'dota2-autumn-2026');
  assert.deepEqual(miNe.members.filter((member) => member.role === 'Запасной игрок').map((member) => member.name), [
    'Курганович Денис «Perec_amigo»',
    'Корнеев Станислав «Что такое победа?»',
  ]);
  assert.equal(rosterAt('dota2-autumn-2026-strela-team', 'dota2-autumn-2026').members.length, 6);
  assert.equal(rosterAt('dota2-autumn-2026-strela-team', 'dota2-autumn-2026').members.at(-1).role, 'Запасной игрок');
  assert.equal(rosterAt('dota2-main-2026-mi-ne-pushim', 'dota2-main-2026'), null);
});

test('one public CS2 lineup cannot populate a shared team’s Dota history', () => {
  const teamId = 'cs2-august-2026-pivnaya-kega';
  const fixture = structuredClone(rosters);
  fixture.records = [{ ...fixture.records.find((record) => record.tournamentId === 'cs2-february-2026'), teamId, tournamentId: 'cs2-august-2026' }];
  const team = buildCommunityModel(tournaments, registry, fixture).getTeam(teamId);
  assert.equal(teamForDiscipline(team, 'Counter-Strike 2').entries.filter((entry) => entry.roster).length, 1);
  assert.ok(teamForDiscipline(team, 'Dota 2').entries.every((entry) => entry.roster === null));
});

test('invalid identities, duplicate snapshots and unapproved fields block the archive', () => {
  const check = (edit) => { const broken = structuredClone(rosters); edit(broken); return validatePublicRosters(tournaments, registry, broken); };
  for (const edit of [
    (data) => { data.records[0].teamId = 'missing'; },
    (data) => { data.records[0].tournamentId = 'cs2-february-2026'; },
    (data) => { data.records.push(structuredClone(data.records[0])); },
    (data) => { data.records[0].sourceId = 'missing'; },
    (data) => { data.records[0].members = []; },
    (data) => { data.records[0].members.push(structuredClone(data.records[0].members[0])); },
    (data) => { data.records[0].members[0].email = 'not-publishable@example.test'; },
    (data) => { data.records[0].members[0].steamId = 'private-registration-field'; },
    (data) => { data.records[0].phone = 'private-registration-field'; },
    (data) => { data.sources[0].url = 'javascript:alert(1)'; },
    (data) => { data.sources[0].retrievedAt = '2026-02-31'; },
  ]) assert.ok(check(edit).length > 0);
});
