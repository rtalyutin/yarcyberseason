import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { buildCommunityModel } from '../src/lib/community.js';
import { createWebMcpTools } from '../src/lib/webmcp.js';
import { attachWebMcp } from '../src/lib/webmcp-registration.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const tournaments = readdirSync(new URL('../src/data/tournaments/', import.meta.url)).filter((name) => name.endsWith('.json')).map((name) => read('../src/data/tournaments/' + name));
const registry = read('../src/data/teams.json');
const community = buildCommunityModel(tournaments, registry);
const dataVersion = 'fixture-version';
const tools = createWebMcpTools({ tournaments, community, dataVersion });
const call = (name, args) => tools.find((tool) => tool.name === name).execute(args);
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('all six tools read the shared snapshot and reject writes/invalid input', async () => {
  assert.equal(tools.length, 6);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    for (const args of [null, [], 'text', { unknown: 1 }, JSON.parse('{"__proto__":{}}')]) {
      const result = await tool.execute(args);
      assert.equal(result.ok, false, tool.name);
      assert.equal(result.error.code, 'INVALID_ARGUMENT');
      assert.equal(result.dataVersion, dataVersion);
    }
  }
  for (const args of [{ limit: 101 }, { limit: 0 }, { offset: -1 }, { offset: 0.2 }, { query: ' ' }, { discipline: 'CS2' }]) assert.equal((await call('ycs_list_matches', args)).ok, false);
  assert.equal((await call('ycs_get_match', {})).error.code, 'INVALID_ARGUMENT');
  assert.equal((await call('ycs_list_matches', { teamId: 'missing' })).error.code, 'NOT_FOUND');
});

test('every public match is reachable once through pagination and detailed read', async () => {
  const keys = [], list = [];
  let offset = 0;
  do {
    const result = await call('ycs_list_matches', { limit: 17, offset });
    assert.equal(result.ok, true); assert.equal(result.total, community.matches.size);
    list.push(...result.items); keys.push(...result.items.map((match) => match.key));
    offset = result.nextOffset;
  } while (offset !== null);
  assert.equal(new Set(keys).size, community.matches.size);
  assert.deepEqual(keys, [...community.matches.keys()]);
  for (const match of list) assert.deepEqual((await call('ycs_get_match', { tournamentId: match.tournamentId, matchId: match.id })).match, match);
  const beyond = await call('ycs_list_matches', { offset: 100000 });
  assert.deepEqual(beyond.items, []); assert.equal(beyond.nextOffset, null);
});

test('confirmed final, unknown scores, yearless dates and empty upcoming matches keep their meaning', async () => {
  const final = (await call('ycs_get_match', { tournamentId: 'cs2-august-2026', matchId: 'cs2-aug-grand-final' })).match;
  assert.deepEqual(final.result.series, [2, 3]); assert.deepEqual(final.result.maps, []);
  const unknown = (await call('ycs_get_match', { tournamentId: 'dota2-main-2026', matchId: 'dota-main-group-16' })).match;
  assert.deepEqual(unknown.result.sourceScore, [1, 1]); assert.equal(unknown.result.score, null); assert.equal(unknown.resultConfirmed, false);
  const qual = await call('ycs_list_matches', { tournamentId: 'dota2-qual-2026' });
  assert.ok(qual.items.length);
  assert.ok(qual.items.every((match) => !match.scheduledAt && !match.date));
  const upcoming = await call('ycs_list_matches', { tournamentId: 'dota2-autumn-2026' });
  assert.equal(upcoming.total, 0);
  const autumn = (await call('ycs_get_tournament', { tournamentId: 'dota2-autumn-2026' })).tournament;
  assert.equal(autumn.registration.status, 'closed'); assert.equal(autumn.participants.length, 16);
});

test('aliases, historical names and disciplines resolve without duplicate teams', async () => {
  const found = await call('ycs_list_teams', { query: 'rsatU' });
  assert.equal(found.items.length, 1); assert.equal(found.items[0].name, 'bobr1ki');
  const byName = await call('ycs_list_matches', { query: 'RSATU' });
  assert.ok(byName.items.length); assert.ok(byName.items.every((match) => [match.team1Id, match.team2Id].includes(found.items[0].id)));
  for (const alias of registry.aliases) {
    const legacy = await call('ycs_get_team', { teamId: alias.id });
    const canonical = await call('ycs_get_team', { teamId: alias.teamId });
    assert.deepEqual(legacy, canonical);
  }
  const cs2 = await call('ycs_list_teams', { discipline: 'Counter-Strike 2', limit: 100 });
  assert.ok(cs2.items.every((team) => team.disciplines.includes('Counter-Strike 2')));
  assert.equal(new Set(cs2.items.map((team) => team.id)).size, cs2.total);
});

test('callers cannot mutate the source through nested response objects', async () => {
  const before = JSON.stringify({ tournaments, registry, matches: [...community.matches], teams: [...community.teams] });
  const response = await call('ycs_get_tournament', { tournamentId: 'dota2-autumn-2026' });
  response.tournament.participants[0].displayName = 'Changed';
  response.tournament.stages[0].rules.length = 0;
  const detail = await call('ycs_get_team', { teamId: registry.teams[0].id });
  detail.team.disciplines.push('Changed');
  assert.equal(JSON.stringify({ tournaments, registry, matches: [...community.matches], teams: [...community.teams] }), before);
});

test('published context and source attribution remain attached to every match', async () => {
  for (const source of community.matches.values()) {
    const { match } = await call('ycs_get_match', { tournamentId: source.tournamentId, matchId: source.id });
    for (const field of ['note', 'roundRecord', 'sourceLabel', 'seed1', 'seed2']) assert.deepEqual(match[field], source[field], `${source.key}.${field}`);
  }
});

test('unpublished matches are absent from lists, detail, and tournament stage references', async () => {
  const fixture = [{ id: 'fixture', slug: 'fixture', title: 'Fixture', stages: [{ id: 'stage', rounds: [{ label: 'Round', matches: [{ id: 'secret', team1: 'A', team2: 'B', published: false }] }] }] }];
  const readers = createWebMcpTools({ tournaments: fixture, community: buildCommunityModel(fixture, { teams: [], bindings: [] }), dataVersion });
  const readTool = (name, args) => readers.find((tool) => tool.name === name).execute(args);
  assert.equal((await readTool('ycs_list_matches', {})).total, 0);
  assert.equal((await readTool('ycs_get_match', { tournamentId: 'fixture', matchId: 'secret' })).error.code, 'NOT_FOUND');
  assert.ok(!JSON.stringify(await readTool('ycs_get_tournament', { tournamentId: 'fixture' })).includes('secret'));
});

test('unsupported browser keeps the ordinary page usable', () => {
  const states = [];
  const detach = attachWebMcp(undefined, tools, (state) => states.push(state));
  assert.deepEqual(states, [{ state: 'unsupported', count: 0 }]); detach();
});

test('StrictMode async registration is serialized and unmount removes all tools', async () => {
  const active = new Map();
  let firstResolve;
  let first = true;
  const context = {
    async registerTool(tool, { signal }) {
      if (first) { first = false; await new Promise((resolve) => { firstResolve = resolve; }); }
      signal.throwIfAborted();
      assert.ok(!active.has(tool.name), 'duplicate registration'); active.set(tool.name, tool);
      signal.addEventListener('abort', () => active.delete(tool.name), { once: true });
    },
  };
  const statesA = [], statesB = [];
  const detachA = attachWebMcp(context, tools, (state) => statesA.push(state));
  await tick(); detachA();
  const detachB = attachWebMcp(context, tools, (state) => statesB.push(state));
  firstResolve(); await tick();
  assert.equal(active.size, 6); assert.equal(statesB.at(-1).state, 'ready');
  assert.ok(!statesA.some((state) => state.state === 'ready'));
  detachB(); await tick(); assert.equal(active.size, 0);
});

test('partial registration failure rolls back tools and reports the failure', async () => {
  const active = new Set(), states = [];
  const context = {
    registerTool(tool, { signal }) {
      if (active.size) throw new Error('Unavailable');
      active.add(tool.name);
      signal.addEventListener('abort', () => active.delete(tool.name), { once: true });
    },
  };
  const detach = attachWebMcp(context, tools, (state) => states.push(state));
  await tick(); assert.equal(active.size, 0); assert.equal(states.at(-1).state, 'error');
  detach(); await tick();
});
