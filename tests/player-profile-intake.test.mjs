import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createPlayerProfileHandler } from '../backend/player-profile-api.mjs';
import { createPlayerS3Store, digest, PLAYER_PREFIX } from '../backend/player-profile-store.mjs';

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const { default: sharp } = await import(backendRequire.resolve('sharp'));
const origin = 'http://localhost:5173';
const envBase = { YCS_PLAYER_ORIGIN: origin, YCS_PLAYER_INTAKE_ENABLED: 'true', AWS_ACCESS_KEY_ID: 'SYNTHETIC_TEST_KEY',
  AWS_SECRET_ACCESS_KEY: 'synthetic-intake-secret-32-bytes-not-live', YCS_PLAYER_ENABLED: 'false' };
const listen = async (server) => { await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; };
const close = (server) => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); });
class FakeS3 {
  objects = new Map(); calls = []; loseFinalPut = false; loseStatePut = false; failStatePut = false; failFinalReceipt = false; denied = false; denyDelete = false;
  async send(command) {
    const p = command.input; this.calls.push({ operation: command.constructor.name, input: p });
    if (this.denied) throw Object.assign(Error('denied'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });
    const current = this.objects.get(p.Key);
    if (command.constructor.name === 'HeadObjectCommand') {
      if (!current) throw Object.assign(Error('missing'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
      return { ETag: current.etag, Metadata: current.metadata };
    }
    if (command.constructor.name === 'DeleteObjectCommand') {
      if (this.denyDelete) throw Object.assign(Error('denied'), { name: 'AccessDenied' });
      if (current && p.IfMatch !== current.etag) throw Object.assign(Error('changed'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
      this.objects.delete(p.Key); return {};
    }
    if (command.constructor.name === 'GetObjectCommand') {
      if (!current) throw Object.assign(Error('missing'), { name: 'NoSuchKey' });
      return { Body: Readable.from([current.body]), ContentLength: current.body.length, ETag: current.etag, Metadata: current.metadata, ContentType: current.type };
    }
    assert.equal(command.constructor.name, 'PutObjectCommand'); assert.equal(p.ACL, 'private');
    if (p.IfNoneMatch === '*' && current || p.IfMatch && (!current || p.IfMatch.replaceAll('"', '') !== current.etag.replaceAll('"', ''))) throw Object.assign(Error('exists'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
    if (this.failStatePut && p.Key.endsWith('state.json')) { this.failStatePut = false; throw Error('connection lost before state commit'); }
    if (this.failFinalReceipt && p.Key.endsWith('state.json') && Object.values(JSON.parse(p.Body).receipts).some((r) => r.kind === 'anonymous_intake' && r.status === 'finalized')) {
      this.failFinalReceipt = false; throw Error('connection lost before final receipt commit');
    }
    const body = Buffer.from(p.Body);
    this.objects.set(p.Key, { body, metadata: p.Metadata || {}, type: p.ContentType, etag: `"${createHash('md5').update(body).digest('hex')}"` });
    if (this.loseFinalPut && p.Key.includes('/photos/')) { this.loseFinalPut = false; throw Error('connection lost after image commit'); }
    if (this.loseStatePut && p.Key.endsWith('state.json')) { this.loseStatePut = false; throw Error('connection lost after state commit'); }
    return {};
  }
  finals() { return [...this.objects.keys()].filter((key) => key.startsWith(`${PLAYER_PREFIX}photos/`)); }
  state() { return JSON.parse(this.objects.get(`${PLAYER_PREFIX}state.json`).body); }
}

async function setup(t, { env = {}, s3 = new FakeS3() } = {}) {
  const settings = { ...envBase, ...env }; let clock = Date.now(); const signed = new Map(); const directRequests = []; const backendBodies = [];
  const { GetObjectCommand, PutObjectCommand } = await import(backendRequire.resolve('@aws-sdk/client-s3'));
  const objectServer = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost'); const grant = signed.get(url.searchParams.get('capability'));
    directRequests.push({ method: req.method, url: url.pathname, headers: req.headers });
    try {
      if (!grant || grant.expires <= clock || req.method !== grant.method) { res.writeHead(403); res.end(); return; }
      const p = grant.input;
      if (req.method === 'PUT') {
        const chunks = []; for await (const chunk of req) chunks.push(chunk); const body = Buffer.concat(chunks);
        assert.equal(body.length, p.ContentLength); assert.equal(req.headers['content-type'], p.ContentType); assert.equal(req.headers['if-none-match'], '*'); assert.equal(req.headers['x-amz-acl'], 'private');
        assert.equal(req.headers['x-amz-meta-owner'], p.Metadata.owner); assert.equal(req.headers['x-amz-meta-fingerprint'], p.Metadata.fingerprint);
        await s3.send(new PutObjectCommand({ ...p, Body: body })); res.writeHead(200); res.end();
      } else {
        const result = await s3.send(new GetObjectCommand(p)); const chunks = []; for await (const chunk of result.Body) chunks.push(chunk);
        res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store' }); res.end(Buffer.concat(chunks));
      }
    } catch (error) { res.writeHead(error.$metadata?.httpStatusCode || 500); res.end(); }
  });
  const objectUrl = await listen(objectServer);
  const presign = async (client, command, options) => {
    const capability = randomUUID(); signed.set(capability, { input: command.input, method: command.constructor.name === 'PutObjectCommand' ? 'PUT' : 'GET', expires: clock + options.expiresIn * 1000 });
    return `${objectUrl}/${command.input.Key.split('/').map(encodeURIComponent).join('/')}?capability=${capability}`;
  };
  const store = createPlayerS3Store({ env: settings, s3, presign, now: () => clock });
  const handler = createPlayerProfileHandler({ env: settings, store, now: () => clock });
  const server = createServer(async (req, res) => {
    req.on('data', (chunk) => backendBodies.push(Buffer.from(chunk)));
    await handler(req, res, new URL(req.url, 'http://localhost'));
  });
  const url = await listen(server);
  t.after(async () => { await close(server); await close(objectServer); });
  const image = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#23aacc' } }).jpeg().withExif({ IFD0: { Artist: 'synthetic-test-only' } }).toBuffer();
  const request = async (path, body, headers = {}) => {
    const response = await fetch(`${url}/api/player/v1/intake/${path}`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: response.status, response, data: await response.json() };
  };
  const input = (extra = {}) => ({ requestId: randomUUID(), Dis: 'cs', name: null, nickname: 'nick', sha256: digest(image), size: image.length, contentType: 'image/jpeg', ...extra });
  const upload = (prepared, bytes = image) => fetch(prepared.upload.url, { method: 'PUT', headers: prepared.upload.headers, body: bytes });
  return { url, settings, s3, signed, image, request, input, upload, directRequests, backendBodies, advance: (ms) => { clock += ms; } };
}

test('anonymous browser PUT goes directly to S3; complete processes S3→S3 and browser verifies exact signed GET', async (t) => {
  const f = await setup(t); const body = f.input(); const prepared = await f.request('prepare', body); assert.equal(prepared.status, 200);
  assert.equal(prepared.response.headers.get('set-cookie'), null); assert.equal(prepared.response.headers.get('access-control-allow-credentials'), null);
  assert.equal(prepared.data.upload.method, 'PUT'); assert.equal(Object.keys(prepared.data.upload.headers).some((key) => key.toLowerCase() === 'content-length'), false);
  assert.equal(f.s3.objects.size, 0, 'prepare only signs; no object/identity/account write');
  assert.equal((await f.upload(prepared.data)).status, 200);
  const complete = await f.request('complete', { ticket: prepared.data.ticket }); assert.equal(complete.status, 200); assert.equal(complete.data.status, 'finalized'); assert.equal(complete.data.photo.filename, '??-nick.jpg');
  assert.equal(complete.data.stagingCleanup, 'deleted');
  const photo = await fetch(complete.data.photo.readUrl); assert.equal(photo.status, 200); const actual = Buffer.from(await photo.arrayBuffer());
  assert.equal(actual.length, complete.data.photo.size); assert.equal(digest(actual), complete.data.photo.sha256);
  const metadata = await sharp(actual).metadata(); assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.width, 1024); assert.equal(metadata.height, 1024); assert.equal(metadata.exif, undefined);
  assert.deepEqual(f.directRequests.map((r) => r.method), ['PUT', 'GET']); assert.equal(f.backendBodies.some((b) => b.includes(f.image)), false);
  assert.deepEqual(f.s3.state().accounts, {}); assert.deepEqual(f.s3.state().identities, {}); assert.deepEqual(f.s3.state().sessions, {});
  assert.ok(f.s3.calls.every((c) => c.input.Key.startsWith(PLAYER_PREFIX) && !c.operation.startsWith('List')));
});

test('literal ?? and Cyrillic FIO naming reserve concurrent collisions atomically', async (t) => {
  const f = await setup(t); const a = (await f.request('prepare', f.input())).data, b = (await f.request('prepare', f.input())).data;
  await f.upload(a); await f.upload(b);
  const saved = await Promise.all([f.request('complete', { ticket: a.ticket }), f.request('complete', { ticket: b.ticket })]);
  assert.deepEqual(saved.map((r) => r.status), [200, 200]); assert.deepEqual(saved.map((r) => r.data.photo.filename).sort(), ['??-nick-1.jpg', '??-nick.jpg'].sort());
  const named = (await f.request('prepare', f.input({ name: 'Иван Иванов', nickname: 'Ник' }))).data; await f.upload(named);
  const name = await f.request('complete', { ticket: named.ticket }); assert.equal(name.data.photo.filename, 'Иван-Иванов-Ник.jpg');
  const third = (await f.request('prepare', f.input())).data; await f.upload(third); assert.equal((await f.request('complete', { ticket: third.ticket })).data.photo.filename, '??-nick-2.jpg');
  assert.ok(f.s3.calls.filter((c) => c.operation === 'PutObjectCommand' && c.input.Key.includes('/photos/')).every((c) => c.input.IfNoneMatch === '*'));
});

test('repeated prepare of the same immutable request and concurrent complete create exactly one final object', async (t) => {
  const f = await setup(t); const input = f.input(); const a = (await f.request('prepare', input)).data, b = (await f.request('prepare', input)).data;
  assert.notEqual(a.ticket, b.ticket, 'random AEAD nonce'); assert.equal(new URL(a.upload.url).pathname, new URL(b.upload.url).pathname, 'stable staging identity');
  assert.equal((await f.upload(a)).status, 200); assert.equal((await f.upload(b)).status, 412);
  const result = await Promise.all([f.request('complete', { ticket: a.ticket }), f.request('complete', { ticket: b.ticket })]);
  assert.deepEqual(result.map((r) => r.status), [200, 200]); assert.equal(result[0].data.photo.filename, result[1].data.photo.filename); assert.equal(f.s3.finals().length, 1);
  assert.equal((await f.request('complete', { ticket: a.ticket })).data.photo.filename, '??-nick.jpg'); assert.equal(f.s3.finals().length, 1);
});

test('unknown outcome before/after receipt and after final PUT recovers actual immutable bytes without suffix duplicates', async (t) => {
  for (const fault of ['loseFinalPut', 'loseStatePut', 'failStatePut']) {
    const f = await setup(t); const prepared = (await f.request('prepare', f.input())).data; await f.upload(prepared); f.s3[fault] = true;
    const first = await f.request('complete', { ticket: prepared.ticket });
    assert.equal(first.status, fault === 'failStatePut' ? 503 : 200);
    const again = await f.request('complete', { ticket: prepared.ticket }); assert.equal(again.status, 200); assert.equal(again.data.photo.filename, '??-nick.jpg'); assert.equal(f.s3.finals().length, 1);
  }
});

test('pending intent recovers a written final image after receipt timeout even if staging is absent', async (t) => {
  const f = await setup(t); const prepared = (await f.request('prepare', f.input())).data; await f.upload(prepared); f.s3.failFinalReceipt = true;
  const first = await f.request('complete', { ticket: prepared.ticket }); assert.equal(first.status, 503); assert.equal(f.s3.finals().length, 1);
  assert.equal(Object.values(f.s3.state().receipts)[0].status, 'pending');
  for (const key of f.s3.objects.keys()) if (key.includes('/staging/')) f.s3.objects.delete(key);
  const from = f.s3.calls.length; const recovered = await f.request('complete', { ticket: prepared.ticket }); assert.equal(recovered.status, 200); assert.equal(recovered.data.photo.filename, '??-nick.jpg'); assert.equal(f.s3.finals().length, 1);
  assert.equal(Object.values(f.s3.state().receipts)[0].status, 'finalized');
  assert.equal(f.s3.calls.slice(from).some((c) => c.operation === 'GetObjectCommand' && c.input.Key.includes('/staging/')), false, 'exact durable candidate is sufficient; no staging or foreign filename scan');
});

test('ticket is opaque, authenticated, immutable, expires and cannot accept extra target/key/file fields', async (t) => {
  const f = await setup(t); const prepared = (await f.request('prepare', f.input({ name: 'ConfidentialName' }))).data;
  assert.equal(prepared.ticket.includes('ConfidentialName'), false); assert.equal(prepared.ticket.includes('staging/'), false);
  assert.equal((await f.request('complete', { ticket: prepared.ticket + 'X' })).status, 401);
  const parts = prepared.ticket.split('.'); const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const index = alphabet.indexOf(parts[3].at(-1)); parts[3] = parts[3].slice(0, -1) + alphabet[index + 1];
  assert.equal((await f.request('complete', { ticket: parts.join('.') })).status, 401, 'noncanonical base64 alias is rejected');
  assert.equal((await f.request('complete', { ticket: prepared.ticket, filename: 'other.jpg' })).status, 422);
  assert.equal((await f.request('complete', { ticket: prepared.ticket, file: 'base64notallowed' })).status, 422);
  f.advance(900_001); assert.equal((await f.request('complete', { ticket: prepared.ticket })).status, 410); assert.equal(f.s3.objects.size, 0);
});

test('exact Origin is required; dedicated feature gate does not inherit account-profile enablement and no cookie is used', async (t) => {
  const f = await setup(t);
  assert.equal((await f.request('prepare', f.input(), { origin: 'https://evil.invalid' })).status, 403);
  const missingOrigin = await fetch(f.url + '/api/player/v1/intake/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f.input()) }); assert.equal(missingOrigin.status, 403);
  const prepared = await f.request('prepare', f.input(), { cookie: 'ycs_player_session=forged', 'x-csrf-token': 'unused' }); assert.equal(prepared.status, 200); assert.equal(prepared.response.headers.get('set-cookie'), null);
  const options = await fetch(f.url + '/api/player/v1/intake/prepare', { method: 'OPTIONS', headers: { origin } }); assert.equal(options.status, 204); assert.equal(options.headers.get('access-control-allow-origin'), origin); assert.equal(options.headers.get('access-control-allow-credentials'), null);
  assert.equal(options.headers.get('access-control-allow-headers'), 'Content-Type');
  const disabled = await setup(t, { env: { YCS_PLAYER_INTAKE_ENABLED: 'false', YCS_PLAYER_ENABLED: 'true' } });
  assert.equal((await disabled.request('prepare', disabled.input())).data.error, 'player_intake_not_configured'); assert.equal(disabled.signed.size, 0);
  const context = await fetch(disabled.url + '/api/player/v1/intake/context?Dis=cs'); assert.equal(context.status, 200); assert.equal((await context.json()).available, false);
});

test('missing upload, wrong actual SHA/size/metadata and malformed JPEG never produce a final image', async (t) => {
  const f = await setup(t); const prepared = (await f.request('prepare', f.input())).data;
  assert.equal((await f.request('complete', { ticket: prepared.ticket })).data.error, 'upload_not_found'); await f.upload(prepared);
  const key = [...f.s3.objects.keys()][0]; const original = structuredClone(f.s3.objects.get(key));
  f.s3.objects.get(key).body = Buffer.from('wrongbytes'); assert.equal((await f.request('complete', { ticket: prepared.ticket })).data.error, 'upload_mismatch');
  f.s3.objects.set(key, { ...original, body: Buffer.from(original.body), metadata: { ...original.metadata, owner: 'other' } }); assert.equal((await f.request('complete', { ticket: prepared.ticket })).data.error, 'upload_mismatch');
  const broken = Buffer.from('<svg onload="alert(1)">'); const invalid = (await f.request('prepare', f.input({ requestId: randomUUID(), sha256: digest(broken), size: broken.length }))).data;
  await f.upload(invalid, broken); assert.equal((await f.request('complete', { ticket: invalid.ticket })).status, 415); assert.equal(f.s3.finals().length, 0);
});

test('anonymous S3 derivative above one megapixel rejects before final write without changing full-profile limits', async (t) => {
  const f = await setup(t); const large = await sharp({ create: { width: 2048, height: 1024, channels: 3, background: '#123456' } }).jpeg().toBuffer();
  const prepared = (await f.request('prepare', f.input({ sha256: digest(large), size: large.length }))).data; assert.equal((await f.upload(prepared, large)).status, 200);
  const complete = await f.request('complete', { ticket: prepared.ticket }); assert.equal(complete.status, 415); assert.equal(complete.data.error, 'unsupported_image'); assert.equal(f.s3.finals().length, 0);
  assert.equal(f.s3.calls.some((c) => c.operation === 'PutObjectCommand' && c.input.Key.endsWith('state.json')), false);
  const context = await fetch(f.url + '/api/player/v1/intake/context?Dis=cs'); const data = await context.json(); assert.equal(data.photo.maxPixels, 64_000_000); assert.equal(data.photo.derivativeMaxPixels, 1024 * 1024);
});

test('only mandatory nick and JPEG proof are accepted; untrusted paths, oversize and arbitrary parameters reject', async (t) => {
  const f = await setup(t);
  for (const changes of [{ nickname: '' }, { nickname: '  ' }, { nickname: null }, { nickname: 42 }, { size: '10' }, { sha256: 'bad' }, { requestId: 'bad' }, { ownerId: 'forged' }]) assert.equal((await f.request('prepare', f.input(changes))).status, 422);
  assert.equal((await f.request('prepare', f.input({ size: 10 * 1024 * 1024 + 1 }))).status, 413);
  assert.equal((await f.request('prepare', f.input({ contentType: 'image/png' }))).status, 415);
  assert.equal((await f.request('prepare', f.input({ Dis: 'unknown' }))).status, 400);
  assert.equal((await f.request('prepare', f.input({ nickname: 'x'.repeat(64 * 1024) }))).status, 413);
  const chunked = new ReadableStream({ start(controller) { controller.enqueue(Buffer.from('{"nickname":"')); controller.enqueue(Buffer.alloc(64 * 1024, 120)); controller.enqueue(Buffer.from('"}')); controller.close(); } });
  const limited = await fetch(f.url + '/api/player/v1/intake/prepare', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: chunked, duplex: 'half' }); assert.equal(limited.status, 413);
  assert.equal(f.signed.size, 0); assert.equal(f.s3.objects.size, 0);
  const path = (await f.request('prepare', f.input({ nickname: '../../user#name?key' }))).data; await f.upload(path); const saved = await f.request('complete', { ticket: path.ticket }); assert.equal(saved.status, 200);
  assert.doesNotMatch(saved.data.photo.filename.slice(3), /[/\\?#]/);
});

test('receipt readback detects final object corruption and never returns a GET for foreign/replaced bytes', async (t) => {
  const f = await setup(t); const prepared = (await f.request('prepare', f.input())).data; await f.upload(prepared);
  assert.equal((await f.request('complete', { ticket: prepared.ticket })).status, 200);
  const key = f.s3.finals()[0]; f.s3.objects.get(key).body = Buffer.from('replacement');
  const count = f.signed.size; const repeat = await f.request('complete', { ticket: prepared.ticket }); assert.equal(repeat.status, 503); assert.equal(repeat.data.error, 'storage_unavailable'); assert.equal(f.signed.size, count); assert.equal(f.s3.finals().length, 1);
});

test('temporary cleanup is scoped and conditional; failure preserves final success and retry works without staging', async (t) => {
  const f = await setup(t); const prepared = (await f.request('prepare', f.input())).data; await f.upload(prepared); f.s3.denyDelete = true;
  const complete = await f.request('complete', { ticket: prepared.ticket }); assert.equal(complete.status, 200); assert.equal(complete.data.stagingCleanup, 'pending');
  assert.ok([...f.s3.objects.keys()].some((key) => key.includes('/staging/')));
  f.s3.denyDelete = false; const retry = await f.request('complete', { ticket: prepared.ticket }); assert.equal(retry.status, 200); assert.equal(retry.data.stagingCleanup, 'deleted');
  assert.equal([...f.s3.objects.keys()].some((key) => key.includes('/staging/')), false);
  assert.equal((await f.request('complete', { ticket: prepared.ticket })).data.photo.filename, '??-nick.jpg');
  const deletes = f.s3.calls.filter((call) => call.operation === 'DeleteObjectCommand');
  assert.ok(deletes.length); assert.ok(deletes.every((call) => call.input.Key.includes('/staging/') && call.input.IfMatch && !call.input.VersionId)); assert.equal(f.s3.finals().length, 1);
});

test('official AWS presigner signs size/type/conditional private upload and short exact GET without network', async () => {
  const store = createPlayerS3Store({ env: envBase });
  const key = `${PLAYER_PREFIX}staging/00000000-0000-4000-8000-000000000000.jpg`;
  const upload = await store.presignIntakeUpload({ key, size: 1234, metadata: { owner: 'intake:synthetic', fingerprint: 'a'.repeat(64) }, expiresIn: 300 });
  const url = new URL(upload.url); assert.ok(url.hostname === 's3.twcstorage.ru' || url.hostname.endsWith('.s3.twcstorage.ru')); assert.equal(decodeURIComponent(url.pathname).endsWith(key), true);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300'); const signed = new Set(url.searchParams.get('X-Amz-SignedHeaders').split(';'));
  for (const header of ['content-length', 'content-type', 'if-none-match', 'x-amz-acl', 'x-amz-meta-owner', 'x-amz-meta-fingerprint']) assert.ok(signed.has(header), header);
  assert.equal(Object.keys(upload.headers).some((h) => h.toLowerCase() === 'content-length'), false);
  assert.equal([...url.searchParams.keys()].some((p) => /checksum/i.test(p)), false);
  const get = new URL(await store.presignIntakeRead({ key: `${PLAYER_PREFIX}photos/??-nick.jpg`, expiresIn: 60 }));
  assert.equal(get.searchParams.get('X-Amz-Expires'), '60'); assert.ok(decodeURIComponent(get.pathname).endsWith('/photos/??-nick.jpg')); assert.equal(get.searchParams.get('response-cache-control'), 'private, no-store');
});
