import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createPlayerProfileHandler } from '../backend/player-profile-api.mjs';
import { createPlayerS3Store, PLAYER_PREFIX } from '../backend/player-profile-store.mjs';
import { createPlayerIntakeClient, runPlayerIntake } from '../src/lib/player-intake-client.js';

// Independent HTTP/S3 protocol fixture. Presigning is a local capability double,
// never an assertion about live Timeweb signatures, CORS, credentials or IAM.
const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const sharp = backendRequire('sharp');
const { PutObjectCommand, GetObjectCommand } = backendRequire('@aws-sdk/client-s3');
const hash = (b) => createHash('sha256').update(b).digest('hex');
const etag = (b) => `"${createHash('md5').update(b).digest('hex')}"`;
const defer = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const absent = () => Object.assign(new Error('synthetic missing'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
const conflict = () => Object.assign(new Error('synthetic CAS conflict'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });

class IndependentS3 {
  objects = new Map(); calls = []; gate = null; fault = null;
  async send(command) {
    const p = command.input, kind = command.constructor.name, old = this.objects.get(p.Key);
    this.calls.push({ kind, input: p }); assert.ok(p.Key.startsWith(PLAYER_PREFIX));
    if (kind === 'GetObjectCommand' || kind === 'HeadObjectCommand') {
      if (!old) throw absent();
      return { ETag: old.etag, Metadata: old.metadata, ContentType: old.type, ContentLength: old.body.length,
        ...(kind === 'GetObjectCommand' ? { Body: Readable.from([old.body]) } : {}) };
    }
    if (kind === 'DeleteObjectCommand') {
      assert.ok(p.Key.startsWith(PLAYER_PREFIX + 'staging/')); assert.ok(p.IfMatch); assert.equal(p.VersionId, undefined);
      if (old && old.etag !== p.IfMatch) throw conflict(); this.objects.delete(p.Key); return {};
    }
    assert.equal(kind, 'PutObjectCommand'); assert.equal(p.ACL, 'private');
    if (p.IfNoneMatch === '*' && old || p.IfMatch && old?.etag.replaceAll('"', '') !== p.IfMatch.replaceAll('"', '')) throw conflict();
    const target = p.Key.endsWith('/state.json') ? 'state' : p.Key.includes('/photos/') ? 'final' : 'staging';
    const faultMatches = () => this.fault?.target === target && (!this.fault.requireFinal || this.finals().length > 0);
    if (faultMatches() && this.fault.when === 'before') {
      if (this.fault.dropStaging) for (const key of this.objects.keys()) if (key.includes('/staging/')) this.objects.delete(key);
      this.fault = null; throw new Error('synthetic lost before commit');
    }
    const body = Buffer.from(p.Body); this.objects.set(p.Key, { body, etag: etag(body), metadata: p.Metadata || {}, type: p.ContentType });
    if (target === 'final' && this.gate) { const gate = this.gate; this.gate = null; gate.entered.resolve(); await gate.release.promise; }
    if (faultMatches() && this.fault.when === 'after') { this.fault = null; throw new Error('synthetic lost after commit'); }
    return {};
  }
  finals() { return [...this.objects.keys()].filter((key) => key.startsWith(PLAYER_PREFIX + 'photos/')); }
  state() { return JSON.parse(this.objects.get(PLAYER_PREFIX + 'state.json').body); }
}

async function fixture(t, { enabled = true } = {}) {
  let clock = Date.now();
  const origin = 'https://site.synthetic.invalid';
  const env = { YCS_PLAYER_ORIGIN: origin, YCS_PLAYER_INTAKE_ENABLED: enabled ? 'true' : 'false', YCS_PLAYER_ENABLED: 'false',
    AWS_ACCESS_KEY_ID: 'SYNTHETIC_KEY_NEVER_LIVE', AWS_SECRET_ACCESS_KEY: 'synthetic-signing-secret-never-a-real-account' };
  const s3 = new IndependentS3(), grants = new Map(), direct = [], apiRequests = [];
  const listen = async (server) => { await new Promise((r) => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${server.address().port}`; };
  const stop = (server) => new Promise((r) => { server.closeAllConnections(); server.close(r); });
  const objectServer = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost'), grant = grants.get(u.searchParams.get('cap'));
    direct.push({ method: req.method, headers: req.headers, url: req.url });
    try {
      if (!grant || grant.expires <= clock || req.method !== grant.method || decodeURIComponent(u.pathname) !== '/' + grant.input.Key) { res.writeHead(403); res.end(); return; }
      const input = grant.input;
      if (req.method === 'PUT') {
        const chunks = []; for await (const chunk of req) chunks.push(chunk); const body = Buffer.concat(chunks);
        if (body.length !== input.ContentLength || req.headers['content-type'] !== 'image/jpeg' || req.headers['if-none-match'] !== '*' ||
          req.headers['x-amz-acl'] !== 'private' || req.headers['x-amz-meta-owner'] !== input.Metadata.owner || req.headers['x-amz-meta-fingerprint'] !== input.Metadata.fingerprint) {
          res.writeHead(403); res.end(); return;
        }
        await s3.send(new PutObjectCommand({ ...input, Body: body })); res.writeHead(200); res.end();
      } else {
        const got = await s3.send(new GetObjectCommand(input)); const chunks = []; for await (const chunk of got.Body) chunks.push(chunk);
        res.writeHead(200, { 'content-type': got.ContentType, 'cache-control': 'private, no-store' }); res.end(Buffer.concat(chunks));
      }
    } catch (error) { res.writeHead(error.$metadata?.httpStatusCode || 500); res.end(); }
  });
  const objectOrigin = await listen(objectServer);
  const presign = async (_, command, options) => {
    const cap = randomUUID(); grants.set(cap, { input: command.input, method: command.constructor.name === 'PutObjectCommand' ? 'PUT' : 'GET', expires: clock + options.expiresIn * 1000 });
    return 'https://verifier.s3.twcstorage.ru/' + command.input.Key.split('/').map(encodeURIComponent).join('/') + '?cap=' + cap;
  };
  const store = createPlayerS3Store({ env, s3, presign, now: () => clock });
  const handler = createPlayerProfileHandler({ env, store, now: () => clock, providers: {},
    auth: { configured: false, session() { assert.fail('anonymous intake must not use a session'); } } });
  const backend = createServer(async (req, res) => {
    const entry = { method: req.method, url: req.url, headers: req.headers, chunks: [] }; apiRequests.push(entry);
    req.on('data', (chunk) => entry.chunks.push(Buffer.from(chunk)));
    const handled = await handler(req, res, new URL(req.url, 'http://localhost')); if (!handled) { res.writeHead(404); res.end(); }
  });
  const backendOrigin = await listen(backend);
  t.after(async () => { await stop(backend); await stop(objectServer); });
  const transport = async (url, options = {}) => {
    const parsed = new URL(url); const headers = new Headers(options.headers || {});
    if (parsed.hostname === 'verifier.s3.twcstorage.ru') return fetch(objectOrigin + parsed.pathname + parsed.search, { ...options, headers });
    assert.equal(parsed.origin, backendOrigin); headers.set('origin', origin);
    return fetch(url, { ...options, headers });
  };
  const api = createPlayerIntakeClient({ baseUrl: backendOrigin, fetchImpl: transport });
  const image = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#2a759d' } }).jpeg().withExif({ IFD0: { Artist: 'synthetic independent fixture' } }).toBuffer();
  const operation = (extra = {}, bytes = image) => ({ blob: new Blob([bytes], { type: 'image/jpeg' }), request: { requestId: randomUUID(),
    Dis: 'cs', name: null, nickname: 'nick', sha256: hash(bytes), size: bytes.length, contentType: 'image/jpeg', ...extra } });
  const post = async (path, body, customHeaders = {}) => {
    const response = await fetch(`${backendOrigin}/api/player/v1/intake/${path}`, { method: 'POST',
      headers: { origin, 'content-type': 'application/json', ...customHeaders }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json(), response };
  };
  return { api, image, operation, post, s3, grants, direct, apiRequests, transport, backendOrigin, origin, advance(ms) { clock += ms; } };
}

test('intake verifier HTTP-01: real client/backend do anonymous metadata→direct S3 PUT→S3 normalization→verified final GET', async (t) => {
  const f = await fixture(t); const context = await f.api.context('cs'); assert.equal(context.mode, 'anonymous-direct-s3'); assert.equal(context.available, true);
  assert.deepEqual([context.uploadTtlSeconds, context.ticketTtlSeconds, context.readTtlSeconds], [300, 900, 60]);
  const op = f.operation(), saved = await runPlayerIntake({ api: f.api, operation: op });
  assert.equal(saved.result.photo.filename, '??-nick.jpg'); const actual = Buffer.from(await saved.photo.arrayBuffer());
  assert.equal(actual.length, saved.result.photo.size); assert.equal(hash(actual), saved.result.photo.sha256);
  const info = await sharp(actual).metadata(); assert.equal(info.format, 'jpeg'); assert.equal(info.width, 1024); assert.equal(info.height, 1024); assert.equal(info.exif, undefined);
  assert.deepEqual(f.direct.map((r) => r.method), ['PUT', 'GET']);
  for (const r of f.apiRequests) { assert.equal(r.headers.cookie, undefined); assert.equal(r.headers.authorization, undefined); assert.equal(Buffer.concat(r.chunks).includes(f.image), false); }
  const prepare = JSON.parse(Buffer.concat(f.apiRequests.find((r) => r.url.endsWith('/prepare')).chunks)); assert.deepEqual(prepare, op.request);
  const complete = JSON.parse(Buffer.concat(f.apiRequests.find((r) => r.url.endsWith('/complete')).chunks)); assert.deepEqual(Object.keys(complete), ['ticket']);
  const state = f.s3.state(); for (const key of ['accounts', 'identities', 'sessions', 'assets']) assert.deepEqual(state[key], {});
  const record = Object.values(state.receipts)[0]; assert.equal(record.input.nickname, 'nick'); assert.equal(record.input.name, null);
  assert.equal([...f.s3.objects.keys()].some((key) => key.includes('/staging/')), false);
});

test('intake verifier HTTP-02: controlled concurrent same-nick writes get exact ?? suffixes and optional Cyrillic FIO', async (t) => {
  const f = await fixture(t), one = f.operation(), two = f.operation();
  const a = await f.api.prepare(one.request), b = await f.api.prepare(two.request); await f.api.upload(a, one.blob); await f.api.upload(b, two.blob);
  const gate = { entered: defer(), release: defer() }; f.s3.gate = gate;
  const firstPending = f.api.complete(a); await gate.entered.promise; const second = await f.api.complete(b); gate.release.resolve(); const first = await firstPending;
  assert.deepEqual([first.photo.filename, second.photo.filename], ['??-nick.jpg', '??-nick-1.jpg']);
  const third = await runPlayerIntake({ api: f.api, operation: f.operation() }); assert.equal(third.result.photo.filename, '??-nick-2.jpg');
  const named = await runPlayerIntake({ api: f.api, operation: f.operation({ name: 'Иван Иванов', nickname: 'Ник' }) });
  assert.equal(named.result.photo.filename, 'Иван-Иванов-Ник.jpg'); assert.equal(f.s3.finals().length, 4);
  assert.ok(f.s3.calls.filter((c) => c.kind === 'PutObjectCommand' && c.input.Key.includes('/photos/')).every((c) => c.input.IfNoneMatch === '*' && c.input.ACL === 'private'));
});

test('intake verifier HTTP-03: repeated prepare/complete stays one photo and refreshed GET recovers after old GET expires', async (t) => {
  const f = await fixture(t), op = f.operation(); const a = await f.api.prepare(op.request), b = await f.api.prepare(op.request);
  assert.notEqual(a.ticket, b.ticket); assert.equal(new URL(a.upload.url).pathname, new URL(b.upload.url).pathname);
  await f.api.upload(a, op.blob); await f.api.upload(b, op.blob);
  const results = await Promise.all([f.api.complete(a), f.api.complete(b)]); assert.equal(results[0].photo.filename, results[1].photo.filename);
  assert.equal(f.s3.finals().length, 1); assert.equal(Object.keys(f.s3.state().receipts).length, 1);
  f.advance(60_001); await assert.rejects(f.api.read(results[0]), { code: 'read_failed' });
  const refreshed = await f.api.complete(a); assert.deepEqual(Buffer.from(await (await f.api.read(refreshed)).arrayBuffer()).length, refreshed.photo.size);
  assert.equal(refreshed.photo.filename, '??-nick.jpg'); assert.equal(f.s3.finals().length, 1);
});

test('intake verifier HTTP-04: wrong staging bytes/metadata or malformed JPEG and forged ticket never finalize', async (t) => {
  const f = await fixture(t), op = f.operation(), prepared = await f.api.prepare(op.request); await f.api.upload(prepared, op.blob);
  const key = [...f.s3.objects.keys()].find((k) => k.includes('/staging/')), saved = f.s3.objects.get(key);
  f.s3.objects.set(key, { ...saved, body: Buffer.alloc(saved.body.length) });
  await assert.rejects(f.api.complete(prepared), { code: 'upload_mismatch' }); assert.equal(f.s3.finals().length, 0);
  f.s3.objects.set(key, { ...saved, metadata: { ...saved.metadata, owner: 'foreign' } });
  await assert.rejects(f.api.complete(prepared), { code: 'upload_mismatch' }); assert.equal(f.s3.finals().length, 0);
  const malformed = f.operation({}, Buffer.from('<svg>not a JPEG</svg>')), invalid = await f.api.prepare(malformed.request); await f.api.upload(invalid, malformed.blob);
  await assert.rejects(f.api.complete(invalid), { code: 'unsupported_image' });
  assert.equal((await f.post('complete', { ticket: prepared.ticket + 'changed' })).status, 401);
  assert.equal((await f.post('complete', { ticket: prepared.ticket, file: 'forbidden-backend-file-bytes' })).status, 422);
  assert.equal(f.s3.finals().length, 0);
});

test('intake verifier HTTP-05: final PUT/CAS ambiguous faults recover exact operation without a new filename', async (t) => {
  for (const fault of [{ target: 'final', when: 'after' }, { target: 'state', when: 'after' }, { target: 'state', when: 'before' }]) {
    const f = await fixture(t), op = f.operation(); f.s3.fault = fault;
    let saved;
    try { saved = await runPlayerIntake({ api: f.api, operation: op }); }
    catch (error) { assert.equal(error.code, 'save_unknown'); saved = await runPlayerIntake({ api: f.api, operation: op }); }
    assert.equal(saved.result.photo.filename, '??-nick.jpg'); assert.equal(f.s3.finals().length, 1);
    assert.equal(Object.keys(f.s3.state().receipts).length, 1); assert.equal(hash(Buffer.from(await saved.photo.arrayBuffer())), saved.result.photo.sha256);
  }
});

test('intake verifier HTTP-06: exact Origin/feature gate apply without cookies, unknown Dis rejects and final corruption is not success', async (t) => {
  const f = await fixture(t), op = f.operation();
  assert.equal((await f.post('prepare', op.request, { origin: 'https://foreign.synthetic.invalid' })).status, 403);
  assert.equal((await f.post('prepare', { ...op.request, Dis: 'unsupported' })).status, 400);
  const ready = await f.post('prepare', op.request, { cookie: 'ycs_player_session=forged; organizer_session=forged' });
  assert.equal(ready.status, 200); assert.equal(ready.response.headers.get('set-cookie'), null); assert.equal(ready.response.headers.get('access-control-allow-credentials'), null);
  await f.api.upload(ready.data, op.blob); const done = await f.api.complete(ready.data);
  const key = f.s3.finals()[0]; f.s3.objects.get(key).body = Buffer.alloc(f.s3.objects.get(key).body.length);
  const grantsBefore = f.grants.size; await assert.rejects(f.api.complete(ready.data), { code: 'storage_unavailable' }); assert.equal(f.grants.size, grantsBefore);
  await assert.rejects(f.api.read(done));
  const disabled = await fixture(t, { enabled: false }); assert.equal((await disabled.api.context('cs')).available, false);
  await assert.rejects(disabled.api.prepare(disabled.operation().request), { code: 'player_intake_not_configured' }); assert.equal(disabled.grants.size, 0);
});

test('intake verifier HTTP-07: durable pending intent recovers an already stored final after lost finalization CAS and absent staging', async (t) => {
  const f = await fixture(t), op = f.operation(), prepared = await f.api.prepare(op.request); await f.api.upload(prepared, op.blob);
  // The pending intent commits, then final JPEG commits; only the final status
  // CAS fails. Source disappearance is a separate controlled crash-cut fixture.
  f.s3.fault = { target: 'state', when: 'before', requireFinal: true, dropStaging: true };
  await assert.rejects(f.api.complete(prepared), { code: 'save_unknown' });
  assert.equal(f.s3.finals().length, 1); assert.equal(Object.values(f.s3.state().receipts)[0].status, 'pending');
  assert.equal([...f.s3.objects.keys()].some((key) => key.includes('/staging/')), false);
  const before = f.s3.calls.length, finalPuts = () => f.s3.calls.filter((c) => c.kind === 'PutObjectCommand' && c.input.Key.includes('/photos/')).length;
  assert.equal(finalPuts(), 1);
  const recovered = await f.api.complete(prepared); assert.equal(recovered.photo.filename, '??-nick.jpg');
  assert.equal(Object.values(f.s3.state().receipts)[0].status, 'finalized'); assert.equal(finalPuts(), 1);
  assert.equal(f.s3.calls.slice(before).some((c) => c.kind === 'GetObjectCommand' && c.input.Key.includes('/staging/')), false);
  assert.equal(hash(Buffer.from(await (await f.api.read(recovered)).arrayBuffer())), recovered.photo.sha256);
});

test('intake verifier HTTP-08: untrusted derivative above 1024² is rejected before any intent/final write', async (t) => {
  const f = await fixture(t);
  const large = await sharp({ create: { width: 1025, height: 1024, channels: 3, background: '#2a759d' } }).jpeg().toBuffer();
  const op = f.operation({}, large), prepared = await f.api.prepare(op.request); await f.api.upload(prepared, op.blob);
  await assert.rejects(f.api.complete(prepared), { code: 'unsupported_image' }); assert.equal(f.s3.finals().length, 0);
  assert.equal(f.s3.calls.some((c) => c.kind === 'PutObjectCommand' && c.input.Key.endsWith('/state.json')), false);
  const context = await f.api.context('cs'); assert.equal(context.photo.maxPixels, 64_000_000); assert.equal(context.photo.derivativeMaxPixels, 1024 ** 2);
});
