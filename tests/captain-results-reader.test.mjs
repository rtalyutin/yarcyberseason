import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createCaptainResultsReader, CAPTAIN_RESULTS_BUCKET, CAPTAIN_RESULTS_KEY, CAPTAIN_RESULTS_MAX_BYTES } from '../backend/captain-results-reader.mjs';
import { createCaptainService, createCaptainTournamentSource } from '../backend/captain-service.mjs';
import { emptyCaptainState } from '../backend/captain-store.mjs';
import { DOTA_RESULTS_URL } from '../src/lib/dota-results.js';

const env = { AWS_ACCESS_KEY_ID: 'synthetic-access-key', AWS_SECRET_ACCESS_KEY: 'synthetic-secret-key',
  YCS_CAPTAIN_BUCKET: 'unrelated-private-bucket', AWS_PROFILE: 'must-not-be-used' };
const clock = Date.parse('2026-10-09T12:00:00Z');
const baseline = { id: 'dota2-autumn-2026', leagueId: 7,
  participants: ['a', 'b', 'c', 'd'].map((teamId) => ({ teamId, displayName: teamId })),
  stages: [{ matches: ['ab', 'cd'].map((id) => ({ id, team1Id: id[0], team2Id: id[1], status: 'scheduled', bestOf: 'BO1' })) }] };
const sdkError = (name, status) => Object.assign(new Error('synthetic failure'), { name, $metadata: { httpStatusCode: status } });
const response = (value) => {
  const body = JSON.stringify(value);
  return { Body: Readable.from([body]), ContentLength: Buffer.byteLength(body) };
};
function snapshot(revision = 1) {
  const matches = Object.fromEntries((revision > 1 ? ['ab', 'cd'] : ['ab']).map((id, index) => [id, {
    team1Id: id[0], team2Id: id[1], status: 'completed', resultConfirmed: true, scoreKind: 'series',
    score1: 1, score2: 0, winnerTeamId: id[0], maps: [{ matchId: String(101 + index),
      url: `https://www.opendota.com/matches/${101 + index}`, number: 1, kills1: 20, kills2: 10,
      durationSeconds: 1800, winnerTeamId: id[0] }],
  }]));
  return { schemaVersion: 1, tournamentId: baseline.id, leagueId: 7, revision, updatedAt: '2026-10-09T12:00:00Z', matches };
}
function setup(outcomes) {
  let time = clock, calls = 0, loads = 0;
  const s3 = { async send(command, options) {
    calls++;
    assert.equal(command.constructor.name, 'GetObjectCommand');
    assert.deepEqual(command.input, { Bucket: CAPTAIN_RESULTS_BUCKET, Key: CAPTAIN_RESULTS_KEY });
    assert.ok(options.abortSignal instanceof AbortSignal);
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    return typeof outcome === 'function' ? outcome() : response(outcome);
  } };
  const reader = createCaptainResultsReader({ env, s3 });
  const source = createCaptainTournamentSource({ readSnapshot: reader, now: () => time,
    load: async () => { loads++; return structuredClone(baseline); } });
  return { reader, source, s3, advance: (ms = 60_000) => { time += ms; }, calls: () => calls, loads: () => loads };
}

test('only authenticated NoSuchKey establishes initial absence; denied, bucket, generic 404 and corrupt reads fail closed', async () => {
  const cases = [
    [sdkError('NoSuchKey', 404), true], [sdkError('AccessDenied', 403), false],
    [sdkError('NoSuchBucket', 404), false], [sdkError('NotFound', 404), false],
    [sdkError('UnknownProviderError', 404), false], [sdkError('TimeoutError'), false],
    [null, false], [{}, false], [() => ({ Body: Readable.from(['{broken']) }), false],
  ];
  for (const [outcome, available] of cases) {
    const s = setup([outcome]);
    const result = await s.source();
    assert.equal(result.captainResultsAvailable, available);
    assert.equal(result.stages[0].matches[0].status, 'scheduled');
    assert.equal(s.calls(), 1);
  }
});

test('deletion, denied access, timeout or corrupt results after first snapshot retain its completed matches', async () => {
  for (const failure of [sdkError('NoSuchKey', 404), sdkError('AccessDenied', 403), sdkError('NoSuchBucket', 404),
    sdkError('TimeoutError'), null, { ...snapshot(), leagueId: 99 }, () => ({ Body: Readable.from(['{broken']) })]) {
    const s = setup([snapshot(), failure]);
    const confirmed = await s.source();
    assert.equal(confirmed.captainResultsAvailable, true);
    s.advance();
    const failed = await s.source();
    assert.equal(failed.captainResultsAvailable, false);
    assert.deepEqual(failed.stages, confirmed.stages);
    assert.equal(failed.stages[0].matches[0].status, 'completed');
  }
});

test('older revisions cannot roll results back and conflicting equal revisions remain unavailable', async () => {
  const newer = snapshot(2);
  const s = setup([newer, snapshot(1), { ...newer, updatedAt: '2026-10-09T12:01:00Z' }, newer]);
  const confirmed = await s.source();
  for (const available of [true, false, true]) {
    s.advance();
    const result = await s.source();
    assert.equal(result.captainResultsAvailable, available);
    assert.deepEqual(result.stages, confirmed.stages);
  }
});

test('concurrent refreshes share one GET and one baseline load; cache starts when the GET settles', async () => {
  let release, entered;
  const started = new Promise((resolve) => { entered = resolve; });
  const s = setup([() => { entered(); return new Promise((resolve) => { release = resolve; }); }, snapshot(2)]);
  const pending = Array.from({ length: 8 }, () => s.source());
  await started;
  s.advance(120_000);
  pending.push(s.source());
  release(response(snapshot()));
  const results = await Promise.all(pending);
  assert.ok(results.every((result) => result.captainResultsAvailable));
  assert.equal(s.calls(), 1); assert.equal(s.loads(), 1);
  s.advance(59_999); await s.source(); assert.equal(s.calls(), 1);
  s.advance(1);
  await Promise.all(Array.from({ length: 8 }, () => s.source()));
  assert.equal(s.calls(), 2); assert.equal(s.loads(), 1);
});

test('an unavailable read is cached for 60 seconds before normal recovery', async () => {
  const s = setup([sdkError('AccessDenied', 403), sdkError('NoSuchKey', 404)]);
  assert.equal((await s.source()).captainResultsAvailable, false);
  s.advance(59_999); assert.equal((await s.source()).captainResultsAvailable, false); assert.equal(s.calls(), 1);
  s.advance(1); assert.equal((await s.source()).captainResultsAvailable, true); assert.equal(s.calls(), 2);
});

test('fixed published object uses explicit selected credentials, a single SDK attempt and no writer', async () => {
  const url = new URL(DOTA_RESULTS_URL);
  assert.equal(url.hostname, `${CAPTAIN_RESULTS_BUCKET}.s3.twcstorage.ru`);
  assert.equal(url.pathname, `/${CAPTAIN_RESULTS_KEY}`);
  let creations = 0, calls = 0;
  const reader = createCaptainResultsReader({ env, createS3: (config) => {
    creations++;
    assert.deepEqual(config, { region: 'ru-1', endpoint: 'https://s3.twcstorage.ru', maxAttempts: 1,
      credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });
    return { async send(command) {
      calls++; assert.equal(command.constructor.name, 'GetObjectCommand');
      assert.deepEqual(command.input, { Bucket: CAPTAIN_RESULTS_BUCKET, Key: CAPTAIN_RESULTS_KEY });
      throw sdkError('NoSuchKey', 404);
    } };
  } });
  assert.equal(await reader(), null); assert.equal(await reader(), null);
  assert.equal(creations, 1); assert.equal(calls, 2);
  await assert.rejects(createCaptainResultsReader({ env: {}, createS3: () => { assert.fail('must not use ambient credentials'); } })(), { code: 'storage_unavailable' });
  const accesses = [];
  const selectedEnv = Object.fromEntries(Object.keys(env).map((key) => [key, env[key]]));
  for (const key of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) Object.defineProperty(selectedEnv, key, { get() { accesses.push(key); return env[key]; } });
  createCaptainService({ env: selectedEnv, store: {}, verify: JSON.parse });
  assert.deepEqual(accesses, ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']);
});

test('missing, broken, oversized or invalid UTF-8 bodies cannot establish absence', async () => {
  const oversized = Readable.from(['{}']);
  const failures = [() => ({}), () => ({ Body: Readable.from([Buffer.from([0xff])]) }),
    () => ({ Body: oversized, ContentLength: CAPTAIN_RESULTS_MAX_BYTES + 1 }),
    () => ({ Body: Readable.from([Buffer.alloc(CAPTAIN_RESULTS_MAX_BYTES), Buffer.from('x')]) }),
    () => ({ Body: Readable.from((async function* () { yield '{'; throw new Error('interrupted'); })()) })];
  for (const failure of failures) {
    const s = setup([failure]);
    assert.equal((await s.source()).captainResultsAvailable, false);
    assert.equal(s.calls(), 1);
  }
  assert.equal(oversized.destroyed, true);
});

test('known absence enables existing two-team agreement; denied reads and missing windows still block it', async () => {
  for (const [resultError, windows, expected] of [
    [sdkError('NoSuchKey', 404), true, 'agreed'], [sdkError('AccessDenied', 403), true, 'storage_unavailable'],
    [sdkError('NoSuchKey', 404), false, 'window_unavailable'],
  ]) {
    const s = setup([resultError]);
    let state = emptyCaptainState(), writes = 0;
    for (const [teamId, userId] of [['a', '11'], ['b', '22']]) state.bindings[teamId] = { username: teamId, userId, generation: teamId.repeat(64) };
    const store = { read: async () => ({ value: structuredClone(state), etag: String(state.revision) }),
      compareAndSet: async (previous, next) => { assert.equal(previous.etag, String(state.revision)); writes++; state = structuredClone(next); return { value: structuredClone(state), etag: String(state.revision) }; } };
    const service = createCaptainService({ store, getTournament: s.source, now: () => clock, verify: JSON.parse,
      env: windows ? { YCS_CAPTAIN_WINDOWS_JSON: JSON.stringify({ ab: { start: '2026-10-10T00:00:00Z', end: '2026-10-10T23:00:00Z' } }) } : {} });
    const agree = (id, username, expectedScheduleVersion) => service.captain({ action: 'agree', initData: JSON.stringify({ id, username }),
      matchId: 'ab', requestId: `synthetic-${id}-agreement`, expectedScheduleVersion, startsAt: '2026-10-10T12:00:00Z' });
    if (expected === 'agreed') {
      await agree('11', 'a', 0);
      assert.equal((await agree('22', 'b', 1)).agreed.startsAt, '2026-10-10T12:00:00.000Z');
    } else await assert.rejects(agree('11', 'a', 0), { code: expected });
    assert.equal(writes, expected === 'agreed' ? 2 : 0);
    assert.equal(s.calls(), 1);
  }
});

test('readiness is a passive copied projection and counts only configured current match windows', async () => {
  const s = setup([sdkError('NoSuchKey', 404), sdkError('AccessDenied', 403)]);
  let privateReads = 0;
  const store = { read: async () => { privateReads++; return { value: emptyCaptainState(), etag: null }; },
    compareAndSet: async () => { assert.fail('passive readiness must not write'); } };
  const service = createCaptainService({ store, getTournament: s.source, verify: JSON.parse,
    env: { YCS_CAPTAIN_WINDOWS_JSON: JSON.stringify({ ab: { start: '2026-10-10T00:00:00Z', end: '2026-10-10T23:00:00Z' },
      unknown: { start: '2026-10-10T00:00:00Z', end: '2026-10-10T23:00:00Z' } }) } });
  assert.deepEqual(service.readinessStatus(), { resultsAvailable: null, matchCount: null, windowCount: null });
  service.readinessStatus().matchCount = 999;
  assert.deepEqual(service.readinessStatus(), { resultsAvailable: null, matchCount: null, windowCount: null });
  assert.deepEqual([s.calls(), s.loads(), privateReads], [0, 0, 0]);
  await service.cleanup();
  assert.deepEqual(service.readinessStatus(), { resultsAvailable: true, matchCount: 2, windowCount: 1 });
  assert.deepEqual([s.calls(), s.loads(), privateReads], [1, 1, 0]);
  await service.organizer();
  assert.deepEqual(service.readinessStatus(), { resultsAvailable: true, matchCount: 2, windowCount: 1 });
  const before = [s.calls(), s.loads(), privateReads];
  const visible = service.readinessStatus();
  visible.windowCount = 999; visible.resultsAvailable = false;
  assert.deepEqual(service.readinessStatus(), { resultsAvailable: true, matchCount: 2, windowCount: 1 });
  assert.deepEqual([s.calls(), s.loads(), privateReads], before);
  s.advance(); await service.cleanup();
  assert.deepEqual(service.readinessStatus(), { resultsAvailable: false, matchCount: 2, windowCount: 1 });
  assert.deepEqual([s.calls(), s.loads(), privateReads], [2, 1, before[2]]);
});

test('readiness preserves existing errors; missing windows count zero and malformed windows cannot block purge', async () => {
  const expected = new Error('synthetic source failure');
  const unavailable = createCaptainService({ env: {}, store: {}, getTournament: async () => { throw expected; }, verify: JSON.parse });
  await assert.rejects(unavailable.cleanup(), (error) => error === expected);
  await assert.rejects(unavailable.organizer(), (error) => error === expected);
  assert.deepEqual(unavailable.readinessStatus(), { resultsAvailable: null, matchCount: null, windowCount: null });
  const absent = setup([sdkError('NoSuchKey', 404)]);
  const noWindows = createCaptainService({ env: {}, store: {}, getTournament: absent.source, verify: JSON.parse });
  await noWindows.cleanup();
  assert.deepEqual(noWindows.readinessStatus(), { resultsAvailable: true, matchCount: 2, windowCount: 0 });
  const s = setup([snapshot()]);
  let state = emptyCaptainState(), writes = 0;
  state.matches.ab = { scheduleVersion: 0, proposal: null, agreed: null, resultClaims: [], chatClosed: false,
    chat: { epoch: 'e'.repeat(64), participants: ['a', 'b'], generations: [null, null],
      messages: [{ id: 'f'.repeat(64), teamId: 'a', text: 'synthetic chat', createdAt: '2026-10-09T11:00:00Z' }] } };
  const store = { read: async () => ({ value: structuredClone(state), etag: String(state.revision) }),
    compareAndSet: async (previous, next) => { assert.equal(previous.etag, String(state.revision)); writes++; state = structuredClone(next); return { value: structuredClone(state), etag: String(state.revision) }; } };
  const malformed = createCaptainService({ env: { YCS_CAPTAIN_WINDOWS_JSON: '{broken' }, store, getTournament: s.source, verify: JSON.parse });
  await assert.rejects(malformed.organizer(), { code: 'captain_not_configured' });
  assert.deepEqual(malformed.readinessStatus(), { resultsAvailable: null, matchCount: null, windowCount: null });
  await malformed.cleanup();
  assert.deepEqual(malformed.readinessStatus(), { resultsAvailable: true, matchCount: 2, windowCount: null });
  assert.equal(state.matches.ab.chatClosed, true); assert.equal(state.matches.ab.chat, null); assert.equal(writes, 1);
  assert.equal(s.calls(), 1);
});
