// Independent adapter acceptance. All credentials/state are synthetic and local.
// Usage: YCS_QA_RUNTIME_ROOT=/absolute/candidate node --test this-file.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const target = process.env.YCS_QA_RUNTIME_ROOT;
if (!target || !path.isAbsolute(target)) throw new Error('YCS_QA_RUNTIME_ROOT must identify the exact local candidate');
const moduleAt = (relative) => import(pathToFileURL(path.join(target, relative)).href);
const [{ startYcsCaptainRuntime }, { createOrganizerHandler }, { createMatchMediaService, createMatchMediaPublicHandler },
  { validateMatchMediaDocument, emptyMatchMedia }] = await Promise.all([
  moduleAt('src/ycs-captain/runtime.ts'), moduleAt('ycs-dota/backend/organizer-api.mjs'),
  moduleAt('ycs-dota/backend/match-media-service.mjs'), moduleAt('ycs-dota/backend/match-media-store.mjs'),
]);
const { validatePublicMatchMedia, createMatchMediaClient } = await import('../../../..' + '/src/lib/match-media-client.js');
const official = 'https://xn--90aiaibl0ahlel5n.xn--p1ai';
const scope = { tournamentId: 'qa-cup', matchId: 'qa-match' };
const env = { YCS_CAPTAIN_ENABLED: 'true', YCS_CAPTAIN_BOT_ID: '123456', YCS_CAPTAIN_ENCRYPTION_KEY: 'a'.repeat(64),
  AWS_ACCESS_KEY_ID: 'synthetic-access', AWS_SECRET_ACCESS_KEY: 'synthetic-secret',
  YCS_ORGS_LOGIN: 'qa-organizer', YCS_ORGS_PASSWORD: 'qa-password', YCS_ORGS_ALLOWED_ORIGIN: official,
  DATABASE_URL: 'PRIVATE_UNRELATED_DATABASE_SENTINEL', TELEGRAM_BOT_TOKEN: 'PRIVATE_UNRELATED_TELEGRAM_SENTINEL' };
const catalog = [{ tournamentId: scope.tournamentId, id: scope.matchId, tournamentTitle: 'Synthetic QA cup',
  team1: 'Synthetic A', team2: 'Synthetic B', bestOf: 'BO3', maps: [
    { mapKey: 'id:7001', mapNumber: 1, mapId: '7001', name: 'Synthetic map 1' },
    { mapKey: 'id:7002', mapNumber: 2, mapId: '7002', name: 'Synthetic map 2' },
  ] }];
const upsert = (extra = {}) => ({ action: 'upsert', requestId: '1'.repeat(32), expectedRevision: 0, ...scope,
  mapKey: 'id:7001', kind: 'recording', url: 'https://www.youtube.com/watch?v=SyntheticVideo',
  title: 'Synthetic map clip', startSeconds: 42, endSeconds: 60, ...extra });

async function harness({ enabled = true, beforeRead } = {}) {
  let time = Date.parse('2026-10-12T14:00:00Z'), persisted = emptyMatchMedia(), reads = 0, writes = 0, captainCalls = 0, workersStopped = 0;
  const selectedEnvironments = [];
  const store = { async read() { reads++; await beforeRead?.(); return { value: structuredClone(persisted), etag: String(persisted.revision) }; },
    async compareAndSet(previous, value) { assert.equal(previous.etag, String(persisted.revision));
      validateMatchMediaDocument(value); writes++; persisted = structuredClone(value);
      return { value: structuredClone(persisted), etag: String(persisted.revision) }; } };
  const service = { captain: async () => ({}), organizer: async () => { captainCalls++; return { syntheticCaptain: true }; },
    cleanup: async () => ({}), rosterStatus: () => ({ id: 'existing-import', status: 'applied', count: 16, revision: 3 }),
    readinessStatus: () => ({ resultsAvailable: true, matchCount: 8, windowCount: 0 }) };
  const runtime = await startYcsCaptainRuntime({ env: { ...env, YCS_CAPTAIN_ENABLED: String(enabled) }, now: () => time,
    loadDependencies: async () => ({
      createCaptainService: () => service,
      createCaptainHandler: () => async (req, res, url) => { if (url.pathname !== '/api/captain') return false;
        res.writeHead(401, { 'Content-Type': 'application/json' }); res.end('{"error":"synthetic_no_telegram_auth"}'); return true; },
      createOrganizerHandler: (options) => { selectedEnvironments.push(options.env); return createOrganizerHandler({ ...options,
        getData: async () => ({ syntheticMatches: true }) }); },
      createMatchMediaService: (options) => { selectedEnvironments.push(options.env); return createMatchMediaService({ ...options,
        store, getCatalog: async () => structuredClone(catalog), randomId: () => 'c'.repeat(32) }); },
      createMatchMediaPublicHandler,
      startCaptainCleanupWorker: () => ({ state: { status: 'idle', attempts: 0, lastAttemptAt: null, lastSuccessAt: null, error: null },
        stop: async () => { workersStopped++; } }),
    }) });
  const server = createServer(async (req, res) => { if (!await runtime.apiRoute(req, res)) { res.writeHead(404); res.end('route-not-owned'); } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, { method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(base + route, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await response.text();
    return { status: response.status, headers: response.headers, raw, body: raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : null };
  };
  const login = async () => { const result = await call('/api/orgs/login', { method: 'POST', body: { login: env.YCS_ORGS_LOGIN, password: env.YCS_ORGS_PASSWORD } });
    assert.equal(result.status, 200); return { Authorization: `Bearer ${result.body.token}` }; };
  return { runtime, base, call, login, advance: (milliseconds) => { time += milliseconds; },
    counts: () => ({ reads, writes, captainCalls, workersStopped }), state: () => structuredClone(persisted),
    selectedEnvironments, async stop() { await runtime.stop(); await new Promise((resolve) => server.close(resolve)); } };
}
const publicRoute = `/api/match-media?tournamentId=${scope.tournamentId}&matchId=${scope.matchId}`;

test('release adapter: one organizer session owns existing matches/captains and new media, while public clips use no session', async () => {
  const h = await harness();
  try {
    assert.equal(h.runtime.enabled, true); assert.equal(h.runtime.code, 'CAPTAIN_STARTED');
    assert.deepEqual((await h.call('/api/orgs/media')).body, { error: 'unauthorized' });
    assert.equal(h.counts().reads, 0);
    const headers = await h.login();
    assert.deepEqual((await h.call('/api/orgs/matches', { headers })).body, { syntheticMatches: true });
    assert.deepEqual((await h.call('/api/orgs/captains', { headers })).body, { syntheticCaptain: true });
    const saved = await h.call('/api/orgs/media', { method: 'POST', headers, body: upsert() });
    assert.equal(saved.status, 200); assert.equal(saved.body.revision, 1); assert.equal(saved.body.clips.length, 1);
    const visible = await h.call(publicRoute, { headers: { Origin: official } });
    assert.equal(visible.status, 200); assert.equal(visible.headers.get('access-control-allow-origin'), official);
    validatePublicMatchMedia(visible.body, scope);
    assert.equal(visible.body.clips[0].href, 'https://www.youtube.com/watch?v=SyntheticVideo&t=42s');
    assert.deepEqual(Object.keys(visible.body).sort(), ['catalogVersion', 'clips', 'matchId', 'revision', 'schemaVersion', 'tournamentId', 'updatedAt']);
    for (const key of ['requests', 'fingerprint', 'bindings', 'messages', 'captains', 'password', 'DATABASE', 'TELEGRAM']) assert.ok(!visible.raw.includes(key));
    const client = createMatchMediaClient(scope);
    const cold = await client.refresh((url, options) => { const parsed = new URL(url); return fetch(h.base + parsed.pathname + parsed.search, options); });
    assert.equal(cold.availability, 'current'); assert.equal(cold.clips[0].id, saved.body.clips[0].id);
    assert.deepEqual(h.counts(), { reads: 3, writes: 1, captainCalls: 1, workersStopped: 0 });
    for (const environment of h.selectedEnvironments) {
      assert.equal(environment.AWS_ACCESS_KEY_ID, env.AWS_ACCESS_KEY_ID);
      assert.equal(environment.DATABASE_URL, undefined); assert.equal(environment.TELEGRAM_BOT_TOKEN, undefined);
    }
    assert.equal((await h.call('/api/orgs/logout', { method: 'POST', headers })).status, 204);
    assert.equal((await h.call('/api/orgs/media', { headers })).status, 401);
    assert.equal((await h.call('/api/orgs/matches', { headers })).status, 401);
  } finally { await h.stop(); }
});

test('release adapter: origin, wrong map, HTTPS and strict public query boundaries do not mutate state', async () => {
  const h = await harness();
  try {
    const headers = await h.login();
    assert.equal((await h.call('/api/orgs/media', { headers: { ...headers, Origin: 'https://unrelated.example' } })).status, 403);
    assert.equal((await h.call(publicRoute, { headers: { Origin: 'https://unrelated.example' } })).status, 403);
    assert.equal((await h.call(publicRoute + '&matchId=another')).status, 400);
    assert.equal((await h.call(publicRoute + '&private=true')).status, 400);
    assert.equal((await h.call(publicRoute, { method: 'POST', body: {} })).status, 405);
    assert.equal((await h.call('/api/orgs/media', { method: 'POST', headers, body: upsert({ mapKey: 'id:9999' }) })).status, 404);
    assert.equal((await h.call('/api/orgs/media', { method: 'POST', headers, body: upsert({ url: 'javascript:alert(1)' }) })).status, 400);
    assert.deepEqual(h.state(), emptyMatchMedia()); assert.equal(h.counts().writes, 0); assert.equal(h.counts().captainCalls, 0);
  } finally { await h.stop(); }
});

test('release adapter: existing eight-hour session expires for both old and new organizer routes', async () => {
  const h = await harness();
  try {
    const headers = await h.login(); h.advance(8 * 60 * 60 * 1000 + 1);
    for (const route of ['/api/orgs/matches', '/api/orgs/captains', '/api/orgs/media']) assert.equal((await h.call(route, { headers })).status, 401);
    assert.deepEqual(h.counts(), { reads: 0, writes: 0, captainCalls: 0, workersStopped: 0 });
  } finally { await h.stop(); }
});

test('release adapter: disabled/stopped media is unavailable while unrelated routes remain unowned', async () => {
  for (const enabled of [false, true]) {
    const h = await harness({ enabled });
    try {
      if (enabled) await h.runtime.stop();
      assert.equal((await h.call(publicRoute)).status, 503);
      assert.equal((await h.call('/api/orgs/media')).status, 503);
      assert.equal((await h.call('/api/captain', { method: 'POST', body: {} })).status, 503);
      assert.equal((await h.call('/mcp')).raw, 'route-not-owned');
      assert.equal((await h.call('/api/match-media-extra')).raw, 'route-not-owned');
      assert.equal(h.counts().reads, 0); assert.equal(h.counts().writes, 0);
    } finally { await h.stop(); }
  }
});

test('release adapter: stop waits for a public media read already in flight and denies later reads', async () => {
  let enter, release;
  const entered = new Promise((resolve) => { enter = resolve; });
  const barrier = new Promise((resolve) => { release = resolve; });
  const h = await harness({ beforeRead: async () => { enter(); await barrier; } });
  try {
    const first = h.call(publicRoute); await entered;
    let finished = false; const stopping = h.runtime.stop().then(() => { finished = true; });
    await Promise.resolve(); assert.equal(finished, false);
    assert.equal((await h.call(publicRoute)).status, 503);
    release(); assert.equal((await first).status, 200); await stopping;
    assert.equal(finished, true); assert.equal(h.counts().reads, 1); assert.equal(h.counts().workersStopped, 1);
  } finally { release(); await h.stop(); }
});
