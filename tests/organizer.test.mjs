import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createResultsServer } from '../backend/server.mjs';
import { createOrganizerDataSource } from '../backend/organizer-api.mjs';
import { buildOrganizerTable, filterOrganizerRows, organizerDate, organizerTimeNote } from '../src/lib/organizer-table.js';

const origin = 'https://xn--90aiaibl0ahlel5n.xn--p1ai';
const credentials = { login: 'test-only-organizer', password: 'test-only-password' };
async function start(options = {}) {
  const server = createResultsServer({ env: { YCS_ORGS_LOGIN: credentials.login,
    YCS_ORGS_PASSWORD: credentials.password }, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`,
    stop: () => new Promise((resolve) => server.close(resolve)) };
}
const logIn = (base, body = credentials, headers = {}) => fetch(`${base}/api/orgs/login`, {
  method: 'POST', headers: { 'content-type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body),
});

test('organizer data is protected, read-only, CORS-scoped and logout revokes the session', async () => {
  let reads = 0;
  const app = await start({ organizerOptions: { getData: async () => { reads++; return { rows: [{ id: 'fixture' }] }; } } });
  try {
    assert.equal((await fetch(`${app.base}/api/orgs/matches`)).status, 401);
    assert.equal(reads, 0, 'unauthorized traffic must not load sporting/assignment data');
    assert.equal((await logIn(app.base, { ...credentials, password: 'incorrect' })).status, 401);
    assert.equal((await logIn(app.base, credentials, { Origin: 'https://other.example' })).status, 403);
    const preflight = await fetch(`${app.base}/api/orgs/matches`, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    const login = await logIn(app.base);
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const headers = { Authorization: `Bearer ${token}`, Origin: origin };
    const result = await fetch(`${app.base}/api/orgs/matches`, { headers });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), { rows: [{ id: 'fixture' }] });
    assert.equal(reads, 1);
    const post = await fetch(`${app.base}/api/orgs/matches`, { method: 'POST', headers });
    assert.equal(post.status, 405);
    assert.equal(reads, 1);
    assert.equal((await fetch(`${app.base}/api/orgs/logout`, { method: 'POST', headers })).status, 204);
    assert.equal((await fetch(`${app.base}/api/orgs/matches`, { headers })).status, 401);
    assert.equal((await fetch(`${app.base}/api/orgs/matches`, { headers: { Authorization: `Bearer ${'a'.repeat(64)}` } })).status, 401);
    assert.equal((await fetch(`${app.base}/healthz`)).status, 200);
  } finally { await app.stop(); }
});

test('missing deployment credentials fail closed; session expires; repeated failures are limited', async () => {
  const closed = await start({ env: {} });
  try { assert.equal((await logIn(closed.base)).status, 503); } finally { await closed.stop(); }
  let clock = 1000;
  const app = await start({ organizerOptions: { now: () => clock, getData: async () => ({ rows: [] }) } });
  try {
    const { token } = await (await logIn(app.base)).json();
    clock += 8 * 60 * 60 * 1000;
    assert.equal((await fetch(`${app.base}/api/orgs/matches`, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
    for (let i = 0; i < 5; i++) assert.equal((await logIn(app.base, { login: 'bad', password: 'bad' })).status, 401);
    assert.equal((await logIn(app.base)).status, 429);
    clock += 60_001;
    assert.equal((await logIn(app.base)).status, 200);
  } finally { await app.stop(); }
});

test('table preserves slots, unknown years, technical results, scoped assignments and exact Moscow start', () => {
  const tournaments = [{ id: 't1', slug: 't1', title: 'T1', stages: [{ id: 'p', title: 'Плей-офф', rounds: [{ id: 'r1', label: 'Тур 1', matches: [
    { id: 'same-id', team1: 'А', team2: 'Б', status: 'scheduled', score1: 1, score2: 0, scoreKind: 'series', scheduledAt: '2026-10-09T17:30:00Z' },
    { id: 'slot' },
    { id: 'hidden', published: false, team1: 'Hidden' },
    { id: 'technical', team1: 'В', team2: 'Г', status: 'walkover', resultConfirmed: true, scoreKind: 'series', score1: 1, score2: 0, dateDisplay: '22 декабря' },
  ] }] }] }, { id: 't2', slug: 't2', title: 'T2', stages: [{ id: 'group', title: 'Группа', matches: [{ id: 'same-id', team1: 'Д', team2: 'Е' }] }] }];
  const model = buildOrganizerTable(tournaments, { matches: { 't1/same-id': {
    casters: [{ name: 'Кастер' }], partners: [{ name: 'Партнёр' }], broadcast: { planned: true, url: 'javascript:alert(1)' },
  } } });
  assert.equal(model.rows.length, 4);
  const row = model.rows.find((r) => r.key === 't1/same-id');
  assert.equal(row.score, null, 'scheduled match must not turn into a confirmed result');
  assert.equal(row.broadcast.url, null);
  assert.match(organizerDate(row), /20:30/);
  assert.equal(model.rows.find((r) => r.key === 't2/same-id').casters.length, 0);
  assert.equal(filterOrganizerRows(model.rows, { tournament: 't1', broadcast: 'planned', query: 'кастер' }).length, 1);
  assert.equal(filterOrganizerRows(model.rows, { round: 't1/p/r1', query: 'ПАРТНЁР' }).length, 1);
  const technical = model.rows.find((r) => r.id === 'technical');
  assert.equal(technical.technical, true);
  assert.equal(organizerDate(technical), '22 декабря');
  assert.ok(!organizerDate(technical).includes('2026'));
  assert.equal(model.rows.find((r) => r.id === 'slot').status, 'unknown');
  assert.equal(organizerTimeNote({ dateDisplay: '2 дек · 19:00' }), 'Часовой пояс не указан');
  assert.equal(organizerTimeNote({ dateDisplay: '2 дек' }), 'Время уточняется');
  const archive = buildOrganizerTable([{ id: 'archive', stages: [{ id: 'groups', title: 'Матчи до плей-офф',
    matches: [{ id: 'r1', team1: 'А', team2: 'Б', stage: 'Тур 1' },
      { id: 'r2', team1: 'В', team2: 'Г', stage: 'Тур 2' }] }] }]);
  assert.equal(archive.rows[0].roundTitle, 'Тур 1');
  assert.equal(filterOrganizerRows(archive.rows, { round: 'archive/groups/Тур 1' }).length, 1);
});

test('production JSON supplies every tournament and the organizer-confirmed opening broadcast and caster', async () => {
  const model = await createOrganizerDataSource({ fetcher: async () => ({ status: 404 }) })();
  assert.equal(model.tournaments.length, 5);
  const sourceIds = new Set();
  for (const name of ['current-cs2-2026', 'dota2-autumn-2026', 'dota2-main-2026', 'cs2-february-2026', 'dota2-qual-2026']) {
    const t = JSON.parse(await readFile(new URL(`../src/data/tournaments/${name}.json`, import.meta.url), 'utf8'));
    for (const s of t.stages || []) for (const r of s.rounds || [{ matches: s.matches || [] }])
      for (const m of r.matches || []) if (m.id && m.published !== false) sourceIds.add(`${t.id}/${m.id}`);
  }
  assert.deepEqual(new Set(model.rows.map((r) => r.key)), sourceIds);
  const opening = model.rows.find((r) => r.id === 'dota-autumn-swiss-r1-04');
  assert.equal(opening.broadcast.planned, true);
  assert.equal(opening.broadcast.url, 'https://www.twitch.tv/yarcyberseason');
  assert.deepEqual(opening.casters, [{ name: '@queleez', role: null, url: 'https://t.me/queleez' }]);
  assert.deepEqual(opening.partners.map((p) => p.name), ['Small Choice', 'Искусство Ритма']);
});
