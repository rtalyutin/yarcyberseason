import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { CAPTAIN_STATE_KEY } from '../backend/captain-store.mjs';
import { MATCH_MEDIA_BUCKET, MATCH_MEDIA_KEY, createMatchMediaS3Store,
  emptyMatchMedia, validateMatchMediaDocument } from '../backend/match-media-store.mjs';
import { getMatchMapClips, matchMediaHref, mediaHttps } from '../src/lib/match-media.js';
import { buildMatchMediaCatalog, createMatchMediaService } from '../backend/match-media-service.mjs';
import { createResultsServer } from '../backend/server.mjs';
import { createMatchMediaClient, validatePublicMatchMedia } from '../src/lib/match-media-client.js';

const at = '2026-10-12T08:00:00.000Z';
const requestA = 'a'.repeat(32), requestB = 'b'.repeat(32), requestC = 'c'.repeat(32);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const errorIs = (code, status) => (error) => error.code === code && (!status || error.status === status);
const clip = (override = {}) => ({ id: '1'.repeat(32), tournamentId: 'dota2-autumn-2026',
  matchId: 'match-ab', mapKey: 'id:701', mapNumber: 1, mapId: '701', kind: 'clip',
  url: 'https://clips.twitch.tv/PublishedPlay', title: 'Подтверждённый момент', startSeconds: null,
  endSeconds: null, ...override });
function document(revision, clips = [], requestId = requestA, fingerprint = digest(requestId)) {
  return { schemaVersion: 1, revision, updatedAt: at, clips,
    requests: { [requestId]: { fingerprint, revision } } };
}

// Only this local double is writable. Private captain and sports objects are
// deliberately present, so a wrong object key is observable rather than ignored.
function s3Double({ initial = null, etag = '"test-initial"', bareOnly = false } = {}) {
  const objects = new Map([
    [CAPTAIN_STATE_KEY, { body: 'PRIVATE_ENCRYPTED_CAPTAIN_SENTINEL', etag: '"captain-etag"' }],
    ['results/dota2-autumn-2026.json', { body: 'CONFIRMED_RESULTS_SENTINEL', etag: '"results-etag"' }],
    ['mvp/dota2-autumn-2026.json', { body: 'VALIDATED_MVP_SENTINEL', etag: '"mvp-etag"' }],
  ]);
  if (initial !== null) objects.set(MATCH_MEDIA_KEY, { body: typeof initial === 'string' ? initial : JSON.stringify(initial), etag });
  const baselineOther = structuredClone([...objects].filter(([key]) => key !== MATCH_MEDIA_KEY));
  let seq = 0;
  const s3 = { calls: [], readError: null, putError: null, afterPut: null, beforePut: null, omitEtag: false,
    async send(command) {
      const input = command.input;
      s3.calls.push({ name: command.constructor.name, input });
      assert.equal(input.Bucket, MATCH_MEDIA_BUCKET);
      assert.equal(input.Key, MATCH_MEDIA_KEY, 'media requests must never address captain/results/MVP objects');
      const current = objects.get(input.Key);
      if (command.constructor.name === 'GetObjectCommand') {
        if (s3.readError) throw s3.readError;
        if (!current) throw Object.assign(new Error('absent'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
        return { Body: Readable.from([current.body]), ETag: s3.omitEtag ? undefined : current.etag,
          ContentLength: Buffer.byteLength(current.body) };
      }
      assert.equal(command.constructor.name, 'PutObjectCommand');
      assert.equal(input.ACL, 'private');
      assert.equal(input.CacheControl, 'no-store');
      assert.equal(input.ContentType, 'application/json; charset=utf-8');
      await s3.beforePut?.(input);
      const latest = objects.get(input.Key);
      const expected = bareOnly && latest ? latest.etag.replace(/^"|"$/g, '') : latest?.etag;
      if (latest ? input.IfMatch !== expected || Object.hasOwn(input, 'IfNoneMatch') : input.IfNoneMatch !== '*' || Object.hasOwn(input, 'IfMatch'))
        throw Object.assign(new Error('precondition'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
      objects.set(input.Key, { body: input.Body, etag: `"test-${++seq}"` });
      await s3.afterPut?.(input);
      if (s3.putError) throw s3.putError;
      return { ETag: objects.get(input.Key).etag };
    },
    seed(value, nextEtag = `"test-${++seq}"`) {
      objects.set(MATCH_MEDIA_KEY, { body: typeof value === 'string' ? value : JSON.stringify(value), etag: nextEtag });
    },
    assertOtherObjectsUnchanged() {
      assert.deepEqual([...objects].filter(([key]) => key !== MATCH_MEDIA_KEY), baselineOther);
    },
  };
  return s3;
}

test('media store: creation/readback/restart use only dedicated key and preserve private captain/results/MVP bytes', async () => {
  const s3 = s3Double(), store = createMatchMediaS3Store({ env: {}, s3 });
  const previous = await store.read();
  assert.deepEqual(previous, { value: emptyMatchMedia(), etag: null });
  const next = document(1, [clip()]);
  assert.deepEqual((await store.compareAndSet(previous, next, requestA)).value, next);
  assert.equal(s3.calls.find((call) => call.name === 'PutObjectCommand').input.IfNoneMatch, '*');
  assert.deepEqual((await createMatchMediaS3Store({ env: {}, s3 }).read()).value, next);
  s3.assertOtherObjectsUnchanged();
});

test('media store: stale ETag cannot silently overwrite another accepted edit', async () => {
  const original = document(1, [clip()]), s3 = s3Double({ initial: original });
  const store = createMatchMediaS3Store({ env: {}, s3 }), previous = await store.read();
  const winner = { ...document(2, [clip(), clip({ id: '2'.repeat(32), mapKey: 'id:702', mapNumber: 2, mapId: '702' })], requestB),
    requests: { ...original.requests, ...document(2, [], requestB).requests } };
  s3.seed(winner);
  const loser = { ...document(2, [], requestC), requests: { ...original.requests, ...document(2, [], requestC).requests } };
  await assert.rejects(store.compareAndSet(previous, loser, requestC), errorIs('media_conflict', 409));
  assert.deepEqual((await store.read()).value, winner);
  const puts = s3.calls.filter((call) => call.name === 'PutObjectCommand');
  assert.equal(puts.length, 1);
  assert.equal(puts[0].input.IfMatch, previous.etag);
  s3.assertOtherObjectsUnchanged();
});

test('media store: quoted ETag compatibility changes representation only, including an intervening writer', async () => {
  const token = 'e'.repeat(32), initial = document(1, [clip()]);
  for (const concurrent of [false, true]) {
    const s3 = s3Double({ initial, etag: `"${token}"`, bareOnly: true });
    const store = createMatchMediaS3Store({ env: {}, s3 }), previous = await store.read();
    const next = { ...document(2, [clip({ title: 'Редактура' })], requestB), requests: { ...initial.requests, ...document(2, [], requestB).requests } };
    let writes = 0;
    if (concurrent) s3.beforePut = () => { if (++writes === 1) s3.seed(document(2, [clip({ title: 'Чужой результат' })], requestC), `"${'f'.repeat(32)}"`); };
    if (concurrent) await assert.rejects(store.compareAndSet(previous, next, requestB), errorIs('media_conflict', 409));
    else assert.deepEqual((await store.compareAndSet(previous, next, requestB)).value, next);
    const puts = s3.calls.filter((call) => call.name === 'PutObjectCommand');
    assert.deepEqual(puts.map((call) => call.input.IfMatch), [`"${token}"`, token]);
    assert.equal(puts[0].input.Body, puts[1].input.Body);
    assert.ok(puts.every((call) => !Object.hasOwn(call.input, 'IfNoneMatch')));
    if (concurrent) assert.equal((await store.read()).value.clips[0].title, 'Чужой результат');
    s3.assertOtherObjectsUnchanged();
  }
});

test('media store: lost PUT response is confirmed by retained fingerprint, unknown outcome never reports success', async () => {
  const next = document(1, [clip()]);
  for (const receiptRetained of [true, false]) {
    const s3 = s3Double(), store = createMatchMediaS3Store({ env: {}, s3 }), previous = await store.read();
    s3.putError = new Error('transport timeout with private provider details');
    s3.afterPut = () => {
      const later = document(2, [clip(), clip({ id: '2'.repeat(32), mapKey: 'id:702', mapNumber: 2, mapId: '702' })], requestB);
      if (receiptRetained) later.requests[requestA] = next.requests[requestA];
      s3.seed(later);
    };
    if (receiptRetained) {
      const saved = await store.compareAndSet(previous, next, requestA);
      assert.equal(saved.value.revision, 2);
      assert.equal(saved.value.clips.length, 2);
    } else await assert.rejects(store.compareAndSet(previous, next, requestA), errorIs('media_save_unknown', 503));
    assert.equal(s3.calls.filter((call) => call.name === 'PutObjectCommand').length, 1, 'unknown outcome must not trigger an unconditional retry');
    s3.assertOtherObjectsUnchanged();
  }
});

test('media store: denied/corrupt/incompatible/missing-ETag objects fail closed without an empty reset', async () => {
  const invalid = [
    '{broken-json',
    { ...emptyMatchMedia(), schemaVersion: 2 },
    { ...document(1), actorUserId: 'private-user' },
    document(1, [clip({ url: 'javascript:alert(1)' })]),
    document(1, [clip({ mapKey: 'id:702' })]),
    document(1, [clip({ kind: 'recording', startSeconds: 40, endSeconds: 40 })]),
    document(1, [clip(), clip()]),
    { ...document(1), requests: { [requestA]: { fingerprint: digest(requestA), revision: 2 } } },
  ];
  for (const value of invalid) {
    const s3 = s3Double({ initial: value }), store = createMatchMediaS3Store({ env: {}, s3 });
    await assert.rejects(store.read(), errorIs('media_storage_unavailable', 503));
    assert.ok(s3.calls.every((call) => call.name === 'GetObjectCommand'));
    s3.assertOtherObjectsUnchanged();
  }
  for (const setup of ['denied', 'missing-etag']) {
    const s3 = s3Double({ initial: document(1, [clip()]) });
    if (setup === 'denied') s3.readError = Object.assign(new Error('private denial detail'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });
    else s3.omitEtag = true;
    await assert.rejects(createMatchMediaS3Store({ env: {}, s3 }).read(), errorIs('media_storage_unavailable', 503));
    s3.assertOtherObjectsUnchanged();
  }
  const unconfigured = createMatchMediaS3Store({ env: {} });
  await assert.rejects(unconfigured.read(), errorIs('media_not_configured', 503));
});

test('public clip projection: exact map identity, safe URL and external timestamp never change source media/sports', () => {
  const recording = clip({ kind: 'recording', url: 'https://www.twitch.tv/videos/12345?foo=bar', startSeconds: 3665, endSeconds: 3670 });
  const source = [clip(), recording, clip({ id: '3'.repeat(32), mapKey: 'id:702', mapNumber: 2, mapId: '702' })];
  const before = structuredClone(source);
  const slot = { key: 'id:701', number: 1, mapId: '701', state: 'available', map: { matchId: '701', kills1: 33, kills2: 24 } };
  assert.equal(getMatchMapClips(source, slot).length, 2);
  assert.equal(getMatchMapClips(source, { ...slot, number: 2 }).length, 0);
  assert.equal(getMatchMapClips(source, { ...slot, key: 'id:702' }).length, 0);
  assert.equal(getMatchMapClips(source, { ...slot, state: 'not-played', map: null }).length, 0);
  assert.equal(matchMediaHref(recording), 'https://www.twitch.tv/videos/12345?foo=bar&t=1h1m5s');
  assert.equal(matchMediaHref(clip({ kind: 'recording', url: 'https://video.example/recording', startSeconds: 50 })), 'https://video.example/recording');
  for (const url of ['javascript:alert(1)', 'http://video.example/clip', 'https://user:secret@video.example/clip', 'https://video.example/clip\n']) assert.equal(mediaHttps(url), null);
  assert.deepEqual(source, before);
  assert.deepEqual(slot.map, { matchId: '701', kills1: 33, kills2: 24 });
});

const mediaCatalog = [
  { tournamentId: 'dota2-autumn-2026', id: 'match-ab', tournamentTitle: 'Осень', team1: 'Альфа', team2: 'Бета', bestOf: 'BO3',
    maps: [{ mapKey: 'id:701', mapNumber: 1, mapId: '701', name: 'Карта 1' },
      { mapKey: 'id:702', mapNumber: 2, mapId: '702', name: 'Карта 2' }] },
  { tournamentId: 'dota2-autumn-2026', id: 'match-cd', tournamentTitle: 'Осень', team1: 'Гамма', team2: 'Дельта', bestOf: 'BO1',
    maps: [{ mapKey: 'id:703', mapNumber: 1, mapId: '703', name: 'Карта 1' }] },
  { tournamentId: 'archive-2025', id: 'match-ab', tournamentTitle: 'Архив', team1: 'Архив А', team2: 'Архив Б', bestOf: 'BO1',
    maps: [{ mapKey: 'number:1', mapNumber: 1, mapId: null, name: 'Карта 1' }] },
  { tournamentId: 'dota2-autumn-2026', id: 'future-match', tournamentTitle: 'Осень', team1: 'Альфа', team2: 'Гамма', bestOf: 'BO3', maps: [] },
];
const upsert = (override = {}) => ({ action: 'upsert', expectedRevision: 0, requestId: requestA,
  tournamentId: 'dota2-autumn-2026', matchId: 'match-ab', mapKey: 'id:701', kind: 'clip',
  url: 'https://clips.twitch.tv/PublishedPlay', title: 'Подтверждённый момент', ...override });
function mediaHarness({ initial = null } = {}) {
  const s3 = s3Double({ initial }), store = createMatchMediaS3Store({ env: {}, s3 });
  const rows = structuredClone(mediaCatalog), originalRows = structuredClone(rows);
  let seq = 10;
  const service = createMatchMediaService({ env: {}, store, getCatalog: async () => rows,
    now: () => Date.parse(at), randomId: () => (++seq).toString(16).padStart(32, '0') });
  return { s3, store, service, rows, assertUnchanged() { assert.deepEqual(rows, originalRows); s3.assertOtherObjectsUnchanged(); } };
}

test('media service: create/edit/delete persist exactly one map, public DTO omits receipts and private operational state', async () => {
  const h = mediaHarness();
  assert.deepEqual((await h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'match-ab' })).clips, []);
  const created = await h.service.organizer(upsert());
  assert.equal(created.revision, 1);
  assert.equal(created.clips.length, 1);
  const id = created.clips[0].id;
  const updated = await h.service.organizer(upsert({ expectedRevision: 1, requestId: requestB, clipId: id,
    kind: 'recording', url: 'https://www.youtube.com/watch?v=ActualPublishedVideo', startSeconds: 300, endSeconds: 320 }));
  assert.equal(updated.revision, 2);
  assert.equal(updated.clips.length, 1);
  assert.equal(updated.clips[0].id, id);
  const publicData = await h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'match-ab' });
  assert.deepEqual(Object.keys(publicData).sort(), ['catalogVersion', 'clips', 'matchId', 'revision', 'schemaVersion', 'tournamentId', 'updatedAt']);
  assert.match(publicData.catalogVersion, /^[a-f0-9]{64}$/);
  assert.equal(publicData.clips[0].href, 'https://www.youtube.com/watch?v=ActualPublishedVideo&t=300s');
  assert.deepEqual(Object.keys(publicData.clips[0]).sort(), ['endSeconds', 'href', 'id', 'kind', 'mapId', 'mapKey', 'mapNumber', 'startSeconds', 'title', 'url']);
  for (const visible of [created, updated, publicData]) {
    for (const secret of ['requests', 'fingerprint', 'username', 'userId', 'messages', 'resultClaims', 'bindings', 'CAPTAIN_SENTINEL'])
      assert.ok(!JSON.stringify(visible).includes(`"${secret}"`));
  }
  assert.deepEqual((await h.service.publicRead({ tournamentId: 'archive-2025', matchId: 'match-ab' })).clips, [], 'same fixture id in another tournament must not inherit media');
  assert.deepEqual((await h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'match-cd' })).clips, []);
  const deleted = await h.service.organizer({ action: 'delete', expectedRevision: 2, requestId: requestC,
    tournamentId: 'dota2-autumn-2026', matchId: 'match-ab', mapKey: 'id:701', clipId: id });
  assert.equal(deleted.revision, 3);
  assert.deepEqual(deleted.clips, []);
  assert.deepEqual((await h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'match-ab' })).clips, []);
  const state = (await h.store.read()).value;
  assert.equal(Object.keys(state.requests).length, 3, 'deletion must retain retry receipts');
  validateMatchMediaDocument(state);
  h.assertUnchanged();
});

test('media service: exact retry is idempotent, changed payload conflicts, global stale/absent ABA never resets media', async () => {
  const h = mediaHarness(), body = upsert();
  const first = await h.service.organizer(body);
  const puts = () => h.s3.calls.filter((call) => call.name === 'PutObjectCommand').length;
  assert.deepEqual(await h.service.organizer(body), first);
  assert.equal(puts(), 1);
  await assert.rejects(h.service.organizer({ ...body, title: 'Другая редактура' }), errorIs('media_idempotency_conflict', 409));
  await assert.rejects(h.service.organizer(upsert({ requestId: requestB })), errorIs('media_conflict', 409));
  const id = first.clips[0].id;
  await h.service.organizer({ action: 'delete', expectedRevision: 1, requestId: requestB,
    tournamentId: body.tournamentId, matchId: body.matchId, mapKey: body.mapKey, clipId: id });
  await assert.rejects(h.service.organizer(upsert({ requestId: requestC })), errorIs('media_conflict', 409), 'absent→created→deleted is still newer than revision zero');
  const retryAfterDelete = await h.service.organizer(body);
  assert.equal(retryAfterDelete.revision, 2);
  assert.deepEqual(retryAfterDelete.clips, [], 'retry of a previously accepted creation cannot resurrect a later deletion');
  assert.equal(puts(), 2);
  h.assertUnchanged();
});

test('media service: simultaneous edits accept one CAS winner; fresh retry keeps both unrelated maps', async () => {
  const h = mediaHarness();
  const bodies = [upsert(), upsert({ requestId: requestB, mapKey: 'id:702', title: 'Момент второй карты' })];
  const results = await Promise.allSettled(bodies.map((body) => h.service.organizer(body)));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejectedIndex = results.findIndex((result) => result.status === 'rejected');
  assert.ok(errorIs('media_conflict', 409)(results[rejectedIndex].reason));
  const confirmed = await h.service.organizer();
  assert.equal(confirmed.revision, 1);
  assert.equal(confirmed.clips.length, 1);
  const afterRetry = await h.service.organizer({ ...bodies[rejectedIndex], expectedRevision: confirmed.revision });
  assert.equal(afterRetry.revision, 2);
  assert.deepEqual(new Set(afterRetry.clips.map((item) => item.mapKey)), new Set(['id:701', 'id:702']));
  h.assertUnchanged();
});

test('media service: invalid URLs, time ranges, extra fields and unsupported actions never commit', async () => {
  const h = mediaHarness();
  const invalid = [
    [upsert({ url: 'javascript:alert(1)' }), 'media_invalid_url'],
    [upsert({ url: 'http://video.example/play' }), 'media_invalid_url'],
    [upsert({ url: 'https://user:secret@video.example/play' }), 'media_invalid_url'],
    [upsert({ kind: 'recording' }), 'media_invalid_request'],
    [upsert({ kind: 'recording', startSeconds: -1 }), 'media_invalid_request'],
    [upsert({ kind: 'recording', startSeconds: 5, endSeconds: 5 }), 'media_invalid_request'],
    [upsert({ kind: 'clip', startSeconds: 5 }), 'media_invalid_request'],
    [upsert({ title: 'Invisible\u0000text' }), 'media_invalid_request'],
    [upsert({ title: 'x'.repeat(161) }), 'media_invalid_request'],
    [upsert({ expectedRevision: -1 }), 'media_invalid_request'],
    [upsert({ requestId: 'invalid-request-id' }), 'media_invalid_request'],
    [upsert({ action: 'publish-results' }), 'media_invalid_request'],
    [upsert({ score1: 99 }), 'media_invalid_request'],
    [upsert({ captainState: {} }), 'media_invalid_request'],
    [[], 'media_invalid_request'],
    [{}, 'media_invalid_request'],
  ];
  for (const [body, code] of invalid) await assert.rejects(h.service.organizer(body), errorIs(code, 400));
  assert.ok(h.s3.calls.every((call) => call.name === 'GetObjectCommand'));
  assert.deepEqual((await h.store.read()).value, emptyMatchMedia());
  h.assertUnchanged();
});

test('media service: fixture/map/clip scopes are mandatory, unknown and future maps cannot receive a highlight', async () => {
  const h = mediaHarness();
  const first = await h.service.organizer(upsert()), id = first.clips[0].id;
  const invalid = [
    upsert({ requestId: requestB, expectedRevision: 1, tournamentId: 'missing-tournament' }),
    upsert({ requestId: requestB, expectedRevision: 1, matchId: 'missing-match' }),
    upsert({ requestId: requestB, expectedRevision: 1, mapKey: 'id:999' }),
    upsert({ requestId: requestB, expectedRevision: 1, matchId: 'future-match' }),
    upsert({ requestId: requestB, expectedRevision: 1, mapKey: 'id:702', clipId: id }),
    upsert({ requestId: requestB, expectedRevision: 1, tournamentId: 'archive-2025', mapKey: 'number:1', clipId: id }),
    upsert({ requestId: requestB, expectedRevision: 1, matchId: 'match-cd', mapKey: 'id:703', clipId: id }),
    { action: 'delete', expectedRevision: 1, requestId: requestB, tournamentId: 'dota2-autumn-2026', matchId: 'match-ab', mapKey: 'id:701', clipId: 'f'.repeat(32) },
  ];
  for (const body of invalid) await assert.rejects(h.service.organizer(body), errorIs('media_not_found', 404));
  await assert.rejects(h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'missing-match' }), errorIs('media_not_found', 404));
  assert.equal((await h.store.read()).value.revision, 1);
  h.assertUnchanged();
});

test('media service: changed map identity/order hides obsolete link without moving it to another map or editing sports', async () => {
  const h = mediaHarness();
  const first = await h.service.organizer(upsert());
  h.rows[0].maps[0] = { mapKey: 'id:799', mapNumber: 1, mapId: '799', name: 'Исправленная карта' };
  assert.deepEqual((await h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'match-ab' })).clips, []);
  await assert.rejects(h.service.organizer(upsert({ expectedRevision: 1, requestId: requestB, mapKey: 'id:799', clipId: first.clips[0].id })), errorIs('media_not_found', 404));
  h.rows[0].maps[0] = { mapKey: 'id:701', mapNumber: 2, mapId: '701', name: 'Переставленная карта' };
  assert.deepEqual((await h.service.publicRead({ tournamentId: 'dota2-autumn-2026', matchId: 'match-ab' })).clips, []);
  const stored = (await h.store.read()).value;
  assert.equal(stored.revision, 1);
  assert.equal(stored.clips[0].mapKey, 'id:701');
  assert.equal(stored.clips[0].mapNumber, 1);
  h.s3.assertOtherObjectsUnchanged();
});

test('media catalog: links never invent a map and technical/no-play keeps zero selectable maps', () => {
  const sports = [{ id: 'test-tournament', title: 'Тест', discipline: 'Dota 2', stages: [{ id: 'swiss', matches: [
    { id: 'played', team1: 'А', team2: 'Б', team1Id: 'a', team2Id: 'b', bestOf: 'BO1', status: 'completed', resultConfirmed: true,
      scoreKind: 'series', score1: 1, score2: 0, maps: [{ matchId: '701', kills1: 30, kills2: 20, durationSeconds: 1800 }] },
    { id: 'scheduled', team1: 'В', team2: 'Г', bestOf: 'BO3', status: 'scheduled', maps: [], highlights: [{ title: 'Legacy', url: 'https://video.example/clip' }] },
    { id: 'walkover', team1: 'Д', team2: 'Е', bestOf: 'BO1', status: 'walkover', resultConfirmed: true,
      scoreKind: 'technical', score1: 1, score2: 0, maps: [] },
  ] }] }];
  const before = structuredClone(sports), catalog = buildMatchMediaCatalog(sports);
  assert.deepEqual(catalog.find((row) => row.id === 'played').maps.map((map) => [map.mapKey, map.mapNumber, map.mapId]), [['id:701', 1, '701']]);
  assert.deepEqual(catalog.find((row) => row.id === 'scheduled').maps, []);
  assert.deepEqual(catalog.find((row) => row.id === 'walkover').maps, []);
  assert.deepEqual(sports, before);
});

const origin = 'https://xn--90aiaibl0ahlel5n.xn--p1ai';
const credentials = { login: 'media-test-only-organizer', password: 'media-test-only-password' };
async function httpHarness({ env = {}, mediaService, organizerOptions = {} } = {}) {
  const h = mediaHarness();
  let captainCalls = 0;
  const server = createResultsServer({ env: { YCS_ORGS_LOGIN: credentials.login, YCS_ORGS_PASSWORD: credentials.password, ...env },
    mediaService: mediaService || h.service, organizerOptions: { getData: async () => ({ rows: [] }), ...organizerOptions },
    captainService: { async captain() { captainCalls++; throw new Error('media must not call captain'); },
      async organizer() { captainCalls++; throw new Error('media must not call private organizer registry'); } } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(`${base}${path}`, { method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body) });
  return { ...h, base, post, captainCalls: () => captainCalls,
    async login() { const response = await post('/api/orgs/login', credentials); assert.equal(response.status, 200);
      const { token } = await response.json(); return { Authorization: `Bearer ${token}`, Origin: origin }; },
    stop: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())), };
}

test('media HTTP: organizer auth precedes data reads; Origin, methods, logout and expiry apply to new route', async () => {
  let clock = 0;
  const app = await httpHarness({ organizerOptions: { now: () => clock } });
  try {
    assert.equal((await fetch(`${app.base}/api/orgs/media`)).status, 401);
    assert.equal((await app.post('/api/orgs/media', upsert())).status, 401);
    assert.equal(app.s3.calls.length, 0);
    const preflight = await fetch(`${app.base}/api/orgs/media`, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    const headers = await app.login();
    assert.equal((await fetch(`${app.base}/api/orgs/media`, { headers: { ...headers, Origin: 'https://attacker.example' } })).status, 403);
    assert.equal(app.s3.calls.length, 0);
    assert.equal((await fetch(`${app.base}/api/orgs/media`, { method: 'PUT', headers })).status, 405);
    const fetched = await fetch(`${app.base}/api/orgs/media`, { headers });
    assert.equal(fetched.status, 200);
    assert.equal(fetched.headers.get('cache-control'), 'no-store');
    assert.equal(fetched.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await fetched.json()).matches.length, mediaCatalog.length);
    assert.equal((await app.post('/api/orgs/media', upsert(), headers)).status, 200);
    assert.equal((await app.post('/api/orgs/logout', {}, headers)).status, 204);
    assert.equal((await fetch(`${app.base}/api/orgs/media`, { headers })).status, 401);
    const second = await app.login();
    clock += 8 * 60 * 60 * 1000;
    assert.equal((await fetch(`${app.base}/api/orgs/media`, { headers: second })).status, 401);
    assert.equal(app.captainCalls(), 0);
    app.assertUnchanged();
  } finally { await app.stop(); }
});

test('media HTTP: public reads expose only selected fixture and reject mutation, duplicate query, bad Origin and unknown scope', async () => {
  const app = await httpHarness();
  try {
    const headers = await app.login();
    assert.equal((await app.post('/api/orgs/media', upsert(), headers)).status, 200);
    const path = '/api/match-media?tournamentId=dota2-autumn-2026&matchId=match-ab';
    const response = await fetch(app.base + path, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    const data = await response.json();
    assert.equal(data.clips.length, 1);
    assert.equal(Object.hasOwn(data, 'requests'), false);
    assert.equal(Object.hasOwn(data, 'matches'), false);
    assert.equal(Object.hasOwn(data.clips[0], 'tournamentId'), false);
    assert.equal(Object.hasOwn(data.clips[0], 'matchId'), false);
    const head = await fetch(app.base + path, { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal((await app.post(path, upsert())).status, 405);
    assert.equal((await fetch(app.base + path, { headers: { Origin: 'https://attacker.example' } })).status, 403);
    for (const suffix of ['&matchId=match-cd', '&extra=forbidden']) assert.equal((await fetch(app.base + path + suffix)).status, 400);
    assert.equal((await fetch(`${app.base}/api/match-media?matchId=match-ab`)).status, 400);
    assert.equal((await fetch(`${app.base}/api/match-media?tournamentId=dota2-autumn-2026&matchId=missing-match`)).status, 404);
    assert.equal(app.captainCalls(), 0);
    assert.equal((await app.store.read()).value.revision, 1);
    app.assertUnchanged();
  } finally { await app.stop(); }
});

test('media HTTP: malformed organizer writes and storage failures have explicit errors, never public provider details', async () => {
  const app = await httpHarness();
  try {
    const headers = await app.login();
    for (const body of [null, [], {}, upsert({ actorUserId: 'spoofed-private-actor' })])
      assert.equal((await app.post('/api/orgs/media', body, headers)).status, 400);
    const type = await fetch(`${app.base}/api/orgs/media`, { method: 'POST', headers: { ...headers, 'content-type': 'text/plain' }, body: '{}' });
    assert.equal(type.status, 415);
    const large = await app.post('/api/orgs/media', { ...upsert(), title: 'x'.repeat(5000) }, headers);
    assert.equal(large.status, 413);
    assert.ok(app.s3.calls.every((call) => call.name === 'GetObjectCommand'));
    app.s3.readError = Object.assign(new Error('AWS credential and private provider exception'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });
    for (const path of ['/api/orgs/media', '/api/match-media?tournamentId=dota2-autumn-2026&matchId=match-ab']) {
      const response = await fetch(app.base + path, { headers });
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'media_storage_unavailable' });
    }
    assert.equal(app.captainCalls(), 0);
    app.assertUnchanged();
  } finally { await app.stop(); }
});

const publicScope = { tournamentId: 'dota2-autumn-2026', matchId: 'match-ab' };
function publicDocument(revision, records = [clip()]) {
  return { schemaVersion: 1, revision, catalogVersion: digest('test-public-catalog'), updatedAt: revision ? at : null, ...publicScope,
    clips: records.map(({ tournamentId, matchId, ...record }) => ({ ...record, href: matchMediaHref(record) })) };
}
const responseWith = (value) => async () => ({ ok: true, json: async () => structuredClone(value) });
function publicFetcher(app, calls = []) {
  return (url, options) => {
    const requested = new URL(url);
    assert.equal(requested.pathname, '/api/match-media');
    assert.deepEqual([...requested.searchParams], [['tournamentId', publicScope.tournamentId], ['matchId', publicScope.matchId]]);
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    calls.push(requested.href);
    return fetch(`${app.base}${requested.pathname}${requested.search}`, options);
  };
}

test('public media client: a cold client loads the persisted public GET without organizer session or memory inheritance', async () => {
  const app = await httpHarness();
  try {
    const saved = await app.service.organizer(upsert());
    const calls = [], fetcher = publicFetcher(app, calls);
    for (let entry = 0; entry < 2; entry++) {
      const client = createMatchMediaClient(publicScope), notifications = [];
      assert.deepEqual(client.getState(), { availability: 'loading', revision: 0, clips: [] });
      const unsubscribe = client.subscribe((value) => notifications.push(value));
      const state = await client.refresh(fetcher);
      assert.equal(state.availability, 'current');
      assert.equal(state.revision, 1);
      assert.equal(state.clips[0].id, saved.clips[0].id);
      assert.equal(state.clips[0].href, 'https://clips.twitch.tv/PublishedPlay');
      assert.deepEqual(notifications, [state]);
      unsubscribe();
    }
    assert.equal(calls.length, 2, 'each fresh client must independently read storage');
    assert.equal(app.captainCalls(), 0);
    app.assertUnchanged();
  } finally { await app.stop(); }
});

test('public media client: older/conflicting revisions retain confirmed clips; a real newer deletion clears them', async () => {
  const app = await httpHarness();
  try {
    const saved = await app.service.organizer(upsert());
    const client = createMatchMediaClient(publicScope), fetcher = publicFetcher(app);
    const confirmed = await client.refresh(fetcher);
    const lower = await client.refresh(responseWith(publicDocument(0, [])));
    assert.equal(lower.availability, 'unavailable');
    assert.equal(lower.revision, confirmed.revision);
    assert.deepEqual(lower.clips, confirmed.clips);
    const conflict = await app.service.publicRead(publicScope);
    conflict.clips[0].title = 'Неподтверждённая замена той же ревизии';
    const conflicting = await client.refresh(responseWith(conflict));
    assert.equal(conflicting.availability, 'unavailable');
    assert.equal(conflicting.revision, 1);
    assert.deepEqual(conflicting.clips, confirmed.clips);
    const headers = await app.login();
    const deleted = await app.post('/api/orgs/media', { action: 'delete', expectedRevision: 1, requestId: requestB,
      ...publicScope, mapKey: 'id:701', clipId: saved.clips[0].id }, headers);
    assert.equal(deleted.status, 200);
    const afterDelete = await client.refresh(fetcher);
    assert.deepEqual(afterDelete, { availability: 'current', revision: 2, clips: [] });
    app.assertUnchanged();
  } finally { await app.stop(); }
});

test('public media validator/client: wrong fixture and private/unknown payload fields fail and preserve last accepted state', async () => {
  const valid = publicDocument(1), client = createMatchMediaClient(publicScope);
  const confirmed = await client.refresh(responseWith(valid));
  const wrongScope = { ...publicDocument(2), matchId: 'match-cd' };
  const privateTopLevel = { ...publicDocument(2), requests: { [requestA]: { fingerprint: digest(requestA), revision: 1 } } };
  const privateClip = publicDocument(2);
  privateClip.clips[0].actorUserId = 'private-captain-id';
  const unknownClip = publicDocument(2);
  unknownClip.clips[0].tournamentId = publicScope.tournamentId;
  const invalidCatalogVersion = { ...publicDocument(2), catalogVersion: 'not-a-catalog-fingerprint' };
  for (const invalid of [wrongScope, privateTopLevel, privateClip, unknownClip, invalidCatalogVersion]) {
    assert.throws(() => validatePublicMatchMedia(invalid, publicScope), /Invalid media response/);
    const result = await client.refresh(responseWith(invalid));
    assert.equal(result.availability, 'unavailable');
    assert.equal(result.revision, 1);
    assert.deepEqual(result.clips, confirmed.clips);
  }
});

test('public media recording: zero start is valid, invalid end rejects; deep links keep exact editorial timing metadata', async () => {
  const records = [
    clip({ id: '1'.repeat(32), kind: 'recording', url: 'https://youtu.be/ActualVideo', startSeconds: 0, endSeconds: 1 }),
    clip({ id: '2'.repeat(32), kind: 'recording', url: 'https://www.twitch.tv/videos/12345', startSeconds: 3665, endSeconds: 3670 }),
    clip({ id: '3'.repeat(32), kind: 'recording', url: 'https://vk.com/video-123_456?published=1', startSeconds: 30, endSeconds: 45 }),
  ];
  const value = publicDocument(1, records), before = structuredClone(value);
  assert.equal(validatePublicMatchMedia(value, publicScope), value);
  const state = await createMatchMediaClient(publicScope).refresh(responseWith(value));
  assert.equal(state.availability, 'current');
  assert.deepEqual(state.clips.map((item) => [item.href, item.startSeconds, item.endSeconds]), [
    ['https://youtu.be/ActualVideo?t=0s', 0, 1],
    ['https://www.twitch.tv/videos/12345?t=1h1m5s', 3665, 3670],
    ['https://vk.com/video-123_456?published=1', 30, 45],
  ]);
  for (const endSeconds of [0, -1, 0.5]) {
    const invalid = publicDocument(2, [clip({ kind: 'recording', startSeconds: 0, endSeconds })]);
    assert.throws(() => validatePublicMatchMedia(invalid, publicScope), /Invalid media response/);
  }
  const forgedLink = publicDocument(2, [records[0]]);
  forgedLink.clips[0].href = 'https://video.example/unrelated';
  assert.throws(() => validatePublicMatchMedia(forgedLink, publicScope), /Invalid media response/);
  assert.deepEqual(value, before, 'URL adapters cannot replace the saved source or editorial end time');
});

test('public media client: mutable catalog empty→701→702→removed→restored refreshes at one media revision; same-hash tampering rejects', async () => {
  const app = await httpHarness();
  try {
    const saved = await app.service.organizer(upsert());
    const persisted = (await app.store.read()).value;
    const client = createMatchMediaClient(publicScope), fetcher = publicFetcher(app);
    const map701 = { mapKey: 'id:701', mapNumber: 1, mapId: '701', name: 'Карта 1' };
    const map702 = { mapKey: 'id:702', mapNumber: 1, mapId: '702', name: 'Исправленная карта' };
    const hashes = [];
    for (const [maps, expectedIds] of [
      [[], []],
      [[map701], [saved.clips[0].id]],
      [[map702], []],
      [[], []],
      [[map701], [saved.clips[0].id]],
    ]) {
      app.rows[0].maps = structuredClone(maps);
      const projection = await app.service.publicRead(publicScope);
      assert.equal(projection.revision, 1, 'sports-only projection changes must not create a media mutation');
      assert.match(projection.catalogVersion, /^[a-f0-9]{64}$/);
      assert.deepEqual(projection.clips.map((item) => item.id), expectedIds);
      hashes.push(projection.catalogVersion);
      const state = await client.refresh(fetcher);
      assert.equal(state.availability, 'current');
      assert.equal(state.revision, 1);
      assert.deepEqual(state.clips.map((item) => item.id), expectedIds);
      const cold = createMatchMediaClient(publicScope);
      assert.deepEqual(cold.getState(), { availability: 'loading', revision: 0, clips: [] });
      const coldState = await cold.refresh(fetcher);
      assert.equal(coldState.availability, 'current');
      assert.deepEqual(coldState.clips.map((item) => item.id), expectedIds, 'cold clients must read the current catalog rather than another instance cache');
    }
    assert.notEqual(hashes[0], hashes[1]);
    assert.notEqual(hashes[1], hashes[2]);
    assert.equal(hashes[0], hashes[3], 'restoring the empty catalog restores its stable fingerprint');
    assert.equal(hashes[1], hashes[4], 'restoring the exact actual map restores its stable fingerprint');
    const confirmed = client.getState();
    const tampered = await app.service.publicRead(publicScope);
    tampered.clips[0].title = 'Подмена без изменения ревизии и каталога';
    const rejected = await client.refresh(responseWith(tampered));
    assert.equal(rejected.availability, 'unavailable');
    assert.equal(rejected.revision, 1);
    assert.deepEqual(rejected.clips, confirmed.clips);
    const recovered = await client.refresh(fetcher);
    assert.equal(recovered.availability, 'current');
    assert.deepEqual(recovered.clips, confirmed.clips);
    assert.deepEqual((await app.store.read()).value, persisted, 'catalog visibility changes cannot rewrite stored media or its retry receipts');
    assert.equal(app.s3.calls.filter((call) => call.name === 'PutObjectCommand').length, 1);
    assert.equal(app.captainCalls(), 0);
    app.s3.assertOtherObjectsUnchanged();
  } finally { await app.stop(); }
});
