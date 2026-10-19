import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createPlayerIntakeClient, runPlayerIntake } from '../src/lib/player-intake-client.js';

// Independent wire/operation oracle. All URLs and bytes are synthetic; no S3,
// production API, cookie jar or provider is contacted by this test double.
const API = 'https://site.synthetic.invalid/api/player/v1/intake';
const PUT = 'https://synthetic.s3.twcstorage.ru/private/player-profiles/v1/staging/synthetic.jpg?X-Amz-Signature=synthetic';
const GET = 'https://synthetic.s3.twcstorage.ru/private/player-profiles/v1/photos/%3F%3F-nick.jpg?X-Amz-Signature=synthetic';
const bytes = Buffer.from([255, 216, 255, 224, 0, 13, 10, 128, 254, 255, 217]);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const future = (ms = 60_000) => new Date(Date.now() + ms).toISOString();
const prepared = (id, overrides = {}) => ({ requestId: id, ticket: 'synthetic-ticket', ticketExpiresAt: future(900_000),
  upload: { method: 'PUT', url: PUT, headers: { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' }, expiresAt: future(300_000) }, ...overrides });
const finalized = (id, overrides = {}) => ({ status: 'finalized', requestId: id,
  photo: { filename: '??-nick.jpg', readUrl: GET, readExpiresAt: future(), sha256: sha(bytes), size: bytes.length,
    contentType: 'image/jpeg', width: 1024, height: 1024, ...overrides } });
const operation = () => { const id = randomUUID(); return { blob: new Blob([bytes], { type: 'image/jpeg' }),
  request: { requestId: id, Dis: 'cs', name: null, nickname: 'nick', sha256: sha(bytes), size: bytes.length, contentType: 'image/jpeg' } }; };
const failed = (code, status) => Object.assign(new Error(`synthetic ${code}`), { code, status });
const delay = (ms, value) => new Promise((resolve) => setTimeout(resolve, ms, value));

test('intake verifier CLIENT-01: only JSON metadata/ticket reach API; exact photo PUT/GET use S3 with credentials omitted', async () => {
  const op = operation(), calls = [];
  const api = createPlayerIntakeClient({ baseUrl: 'https://site.synthetic.invalid', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url === API + '/prepare') return Response.json(prepared(op.request.requestId));
    if (url === PUT) { assert.deepEqual(Buffer.from(await options.body.arrayBuffer()), bytes); return new Response(null, { status: 200 }); }
    if (url === API + '/complete') return Response.json(finalized(op.request.requestId));
    if (url === GET) return new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'content-length': String(bytes.length) } });
    assert.fail(`unexpected destination ${url}`);
  } });
  const result = await runPlayerIntake({ api, operation: op });
  assert.deepEqual(Buffer.from(await result.photo.arrayBuffer()), bytes);
  assert.deepEqual(calls.map((c) => [c.url, c.options.method || 'GET']), [[API + '/prepare', 'POST'], [PUT, 'PUT'], [API + '/complete', 'POST'], [GET, 'GET']]);
  assert.deepEqual(JSON.parse(calls[0].options.body), op.request);
  assert.deepEqual(Object.keys(JSON.parse(calls[0].options.body)).sort(), ['Dis', 'contentType', 'name', 'nickname', 'requestId', 'sha256', 'size'].sort());
  assert.deepEqual(JSON.parse(calls[2].options.body), { ticket: 'synthetic-ticket' });
  for (const { options } of calls) {
    assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
    const headers = new Headers(options.headers || {}); assert.equal(headers.has('cookie'), false); assert.equal(headers.has('authorization'), false);
  }
});

test('intake verifier CLIENT-02: wrong S3 photo size/hash or HTTP failure never produce successful read', async () => {
  const id = randomUUID();
  for (const [response, expected] of [
    [() => new Response(Buffer.concat([bytes, Buffer.from([0])]), { headers: { 'content-type': 'image/jpeg' } }), null],
    [() => new Response(Buffer.alloc(bytes.length), { headers: { 'content-type': 'image/jpeg' } }), null],
    [() => new Response(bytes, { status: 403, headers: { 'content-type': 'image/jpeg' } }), 'read_failed'],
  ]) {
    const api = createPlayerIntakeClient({ fetchImpl: async () => response() });
    // The contract requires failure; it does not prescribe a client-local name
    // for the checksum/size mismatch (distinct from an upstream upload error).
    await assert.rejects(api.read(finalized(id)), expected ? { code: expected } : undefined);
  }
});

test('intake verifier CLIENT-03: forged S3 destination is rejected before a photo can leave the browser', async () => {
  for (const bad of ['https://hostile.invalid/private/player-profiles/v1/staging/x.jpg',
    'https://s3.twcstorage.ru.hostile.invalid/private/player-profiles/v1/staging/x.jpg',
    'http://s3.twcstorage.ru/private/player-profiles/v1/staging/x.jpg',
    'https://user:secret@s3.twcstorage.ru/private/player-profiles/v1/staging/x.jpg',
    'https://s3.twcstorage.ru/other/x.jpg']) {
    const op = operation(), calls = [];
    const api = createPlayerIntakeClient({ fetchImpl: async (url) => { calls.push(url); return Response.json(prepared(op.request.requestId,
      { upload: { method: 'PUT', url: bad, headers: {}, expiresAt: future() } })); } });
    await assert.rejects(runPlayerIntake({ api, operation: op }), { code: 'invalid_response' });
    assert.equal(calls.length, 1); assert.ok(calls[0].endsWith('/prepare'));
  }
});

test('intake verifier CLIENT-04: malformed complete receipt is rejected before any final GET/success', async () => {
  const id = randomUUID();
  for (const bad of [finalized('other-request'), finalized(id, { size: 0 }), finalized(id, { sha256: 'not-a-hash' }),
    finalized(id, { width: 1 }), finalized(id, { contentType: 'text/html' }), { status: 'pending', requestId: id }]) {
    const calls = [], api = createPlayerIntakeClient({ fetchImpl: async (url) => { calls.push(url); return Response.json(bad); } });
    await assert.rejects(api.complete(prepared(id)), { code: 'invalid_response' });
    assert.equal(calls.length, 1); assert.ok(calls[0].endsWith('/complete'));
  }
});

function stalledResponse(options, headers) {
  let streamController;
  const stream = new ReadableStream({ start(controller) { streamController = controller; } });
  options.signal.addEventListener('abort', () => { try { streamController.error(new DOMException('synthetic aborted', 'AbortError')); } catch {} }, { once: true });
  return { response: new Response(stream, { headers }), finish(data) { try { streamController.enqueue(data); streamController.close(); } catch {} } };
}

test('intake verifier CLIENT-05: response-body stall remains inside JSON deadline after response headers arrive', async () => {
  let stalled;
  const api = createPlayerIntakeClient({ timeoutMs: 10, fetchImpl: async (_, options) => {
    stalled = stalledResponse(options, { 'content-type': 'application/json' }); return stalled.response;
  } });
  const pending = api.context('cs');
  const observed = await Promise.race([pending.then(() => 'resolved', () => 'rejected'), delay(100, 'still-pending')]);
  stalled.finish(new TextEncoder().encode('{"mode":"anonymous-direct-s3"}')); await pending.catch(() => {});
  assert.equal(observed, 'rejected', 'JSON body must time out instead of outliving the configured deadline');
});

test('intake verifier CLIENT-06: S3 read-body stall remains abortable after response headers arrive', async () => {
  let stalled; const controller = new AbortController();
  const api = createPlayerIntakeClient({ timeoutMs: 1000, fetchImpl: async (_, options) => {
    stalled = stalledResponse(options, { 'content-type': 'image/jpeg' }); return stalled.response;
  } });
  const pending = api.read(finalized(randomUUID()), controller.signal);
  await Promise.resolve(); controller.abort();
  const observed = await Promise.race([pending.then(() => 'resolved', () => 'rejected'), delay(100, 'still-pending')]);
  stalled.finish(bytes); await pending.catch(() => {});
  assert.equal(observed, 'rejected', 'unmount/Dis-change abort must cancel an in-progress body read');
});

test('intake verifier RETRY-01: lost PUT acknowledgement recovers by complete/read with same request/blob and no second PUT', async () => {
  const op = operation(), originalRequest = op.request, originalBlob = op.blob; let puts = 0, prepares = 0, completes = 0;
  const api = createPlayerIntakeClient({ baseUrl: 'https://site.synthetic.invalid', fetchImpl: async (url) => {
    if (url.endsWith('/prepare')) { prepares++; return Response.json(prepared(op.request.requestId)); }
    if (url === PUT) { puts++; throw new Error('synthetic response lost after stored PUT'); }
    if (url.endsWith('/complete')) { completes++; return Response.json(finalized(op.request.requestId)); }
    if (url === GET) return new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
    assert.fail(url);
  } });
  await assert.rejects(runPlayerIntake({ api, operation: op }), { code: 'network_error' });
  const recovered = await runPlayerIntake({ api, operation: op });
  assert.equal(prepares, 1); assert.equal(puts, 1); assert.equal(completes, 1);
  assert.strictEqual(op.request, originalRequest); assert.strictEqual(op.blob, originalBlob);
  assert.deepEqual(Buffer.from(await recovered.photo.arrayBuffer()), bytes);
});

test('intake verifier RETRY-02: lost complete acknowledgement does not repeat PUT or allocate another request', async () => {
  const op = operation(); let puts = 0, prepares = 0, completes = 0;
  const api = createPlayerIntakeClient({ baseUrl: 'https://site.synthetic.invalid', fetchImpl: async (url) => {
    if (url.endsWith('/prepare')) { prepares++; return Response.json(prepared(op.request.requestId)); }
    if (url === PUT) { puts++; return new Response(null); }
    if (url.endsWith('/complete')) { if (++completes === 1) throw new Error('synthetic complete ack lost'); return Response.json(finalized(op.request.requestId)); }
    if (url === GET) return new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
    assert.fail(url);
  } });
  await assert.rejects(runPlayerIntake({ api, operation: op }), { code: 'network_error' });
  await runPlayerIntake({ api, operation: op });
  assert.deepEqual({ prepares, puts, completes }, { prepares: 1, puts: 1, completes: 2 });
});

test('intake verifier RETRY-03: expired PUT capability refreshes by the same immutable request before attempting upload', async () => {
  const op = operation(), first = prepared(op.request.requestId); first.upload.expiresAt = new Date(Date.now() - 1000).toISOString();
  op.prepared = first; op.attempted = true;
  let prepares = 0, completes = 0, uploads = 0;
  const api = {
    prepare: async (request) => { prepares++; assert.strictEqual(request, op.request); return prepared(request.requestId); },
    complete: async () => { if (++completes === 1) throw failed('upload_not_found', 404); return finalized(op.request.requestId); },
    upload: async (p, blob) => { uploads++; assert.notStrictEqual(p, first, 'expired PUT must be refreshed'); assert.strictEqual(blob, op.blob); },
    read: async () => op.blob,
  };
  await runPlayerIntake({ api, operation: op });
  assert.equal(prepares, 1); assert.equal(uploads, 1); assert.equal(completes, 2);
});
