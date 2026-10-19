import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAppServer } from '../scripts/server.mjs';
import { playerUpstream } from '../scripts/player-profile-proxy.mjs';

const listen = async (server) => { await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; };
const close = (server) => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); });
async function setup(t, { handler, env = {}, proxyOptions = {} } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ycs-player-proxy-'));
  await mkdir(path.join(directory, 'player/profile'), { recursive: true });
  await writeFile(path.join(directory, 'index.html'), '<div data-prerender-path="/">Existing home</div>');
  await writeFile(path.join(directory, 'player/profile/index.html'), '<div data-prerender-path="/player/profile">Existing profile shell</div>');
  const calls = []; let upstream, upstreamUrl;
  if (handler) {
    upstream = createServer((req, res) => { calls.push(req); handler(req, res); }); upstreamUrl = await listen(upstream);
  }
  const logs = [];
  const frontend = createAppServer({ directory, env: { ...(upstreamUrl ? { YCS_PLAYER_UPSTREAM: upstreamUrl } : {}), ...env }, playerProxyOptions: proxyOptions,
    logger: { error: (message) => logs.push(message) } });
  const base = await listen(frontend);
  t.after(async () => { await close(frontend); if (upstream) await close(upstream); await rm(directory, { recursive: true, force: true }); });
  return { base, calls, logs, upstreamUrl };
}

test('only the exact player prefix gets configured proxy/explicit unavailable; health and other APIs/pages retain behavior', async (t) => {
  const f = await setup(t);
  for (const suffix of ['', '/session', '/photos/a']) {
    const response = await fetch(f.base + '/api/player/v1' + suffix); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'player_not_configured' });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  const health = await fetch(f.base + '/healthz'); assert.equal(health.status, 200); assert.deepEqual(await health.json(), { status: 'ok' });
  const home = await fetch(f.base + '/'); assert.equal(home.status, 200); assert.match(await home.text(), /Existing home/);
  const profile = await fetch(f.base + '/player/profile?Dis=cs'); assert.equal(profile.status, 200); assert.match(await profile.text(), /Existing profile shell/);
  for (const path of ['/api/missing', '/api/player/v10/session', '/api/player/v1-other']) assert.equal((await fetch(f.base + path)).status, 404);
  assert.deepEqual(f.logs, []);
});

test('upstream validation accepts only a trusted HTTPS origin or local HTTP test origin', async (t) => {
  for (const value of ['https://backend.example', 'https://backend.example:8443/', 'http://localhost:8080', 'http://127.0.0.1:8080']) assert.ok(playerUpstream(value), value);
  for (const value of ['', 'http://backend.example', 'ftp://backend.example', 'https://user:secret@backend.example', 'https://backend.example/path', 'https://backend.example/?query=1', 'https://backend.example/#hash']) assert.equal(playerUpstream(value), null, value);
  const f = await setup(t, { env: { YCS_PLAYER_UPSTREAM: 'https://backend.example/untrusted-path' } });
  assert.equal((await fetch(f.base + '/api/player/v1/session')).status, 503);
});

test('real HTTP forwarding preserves method/query/player cookies/Origin/CSRF/body and keeps destination fixed', async (t) => {
  const observed = [];
  const f = await setup(t, { handler: async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    observed.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
    res.writeHead(201, { 'content-type': 'application/json', 'set-cookie': ['ycs_player_session=signed; Path=/api/player/v1; HttpOnly; SameSite=Lax', 'ycs_secondary=test; Path=/api/player/v1; HttpOnly'], 'cache-control': 'public,max-age=900', 'x-unrelated-sensitive': 'do-not-forward' });
    res.end('{"saved":true}');
  } });
  const body = JSON.stringify({ requestId: 'synthetic', nickname: 'Тест' });
  const response = await fetch(f.base + '/api/player/v1/me?Dis=cs&literal=%3F%3F', { method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'https://site.example', 'x-csrf-token': 'synthetic-csrf', cookie: 'organizer_secret=ignored; ycs_player_session=signed',
      authorization: 'Bearer do-not-forward', 'x-forwarded-host': 'evil.invalid', 'x-unrelated': 'drop-me' }, body });
  assert.equal(response.status, 201); assert.deepEqual(await response.json(), { saved: true });
  assert.equal(response.headers.getSetCookie().length, 2); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.equal(response.headers.get('x-unrelated-sensitive'), null);
  const request = observed[0]; assert.equal(request.method, 'PUT'); assert.equal(request.url, '/api/player/v1/me?Dis=cs&literal=%3F%3F'); assert.equal(request.body.toString(), body);
  assert.equal(request.headers.host, new URL(f.upstreamUrl).host); assert.equal(request.headers.origin, 'https://site.example'); assert.equal(request.headers['x-csrf-token'], 'synthetic-csrf'); assert.equal(request.headers.cookie, 'ycs_player_session=signed');
  assert.equal(request.headers.authorization, undefined); assert.equal(request.headers['x-forwarded-host'], undefined); assert.equal(request.headers['x-unrelated'], undefined); assert.deepEqual(f.logs, []);
});

test('multipart bytes and protected binary image responses remain intact', async (t) => {
  const image = Buffer.from([255, 216, 255, 222, 0, 1, 2, 3]); let uploaded;
  const f = await setup(t, { handler: async (req, res) => {
    if (req.method === 'POST') { const chunks = []; for await (const c of req) chunks.push(c); uploaded = Buffer.concat(chunks); res.writeHead(201, { 'content-type': 'application/json' }); res.end('{"assetId":"synthetic"}'); }
    else { res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': image.length, 'content-security-policy': "default-src 'none'; sandbox" }); res.end(image); }
  } });
  const form = new FormData(); form.append('file', new Blob([image], { type: 'image/jpeg' }), 'file.jpg');
  const upload = await fetch(f.base + '/api/player/v1/photos', { method: 'POST', body: form }); assert.equal(upload.status, 201); assert.ok(uploaded.includes(image)); assert.match(uploaded.toString('latin1'), /name="file"; filename="file.jpg"/);
  const photo = await fetch(f.base + '/api/player/v1/photos/synthetic'); assert.equal(photo.headers.get('content-type'), 'image/jpeg'); assert.deepEqual(Buffer.from(await photo.arrayBuffer()), image); assert.match(photo.headers.get('cache-control'), /no-store/);
});

test('OAuth 303 and Set-Cookie are relayed without following redirect or exposing proxy configuration', async (t) => {
  let targetCalls = 0; const target = createServer((req, res) => { targetCalls++; res.end('should not be fetched'); }); const targetUrl = await listen(target); t.after(() => close(target));
  const f = await setup(t, { handler: (req, res) => { res.writeHead(303, { location: targetUrl + '/player/profile?Dis=cs&auth=success&authAttempt=synthetic', 'set-cookie': 'ycs_player_session=new; Path=/api/player/v1; HttpOnly' }); res.end(); } });
  const response = await fetch(f.base + '/api/player/v1/auth/callback/telegram?code=synthetic&state=synthetic', { redirect: 'manual' });
  assert.equal(response.status, 303); assert.equal(response.headers.get('location'), targetUrl + '/player/profile?Dis=cs&auth=success&authAttempt=synthetic'); assert.match(response.headers.get('set-cookie'), /ycs_player_session=new/); assert.equal(targetCalls, 0); assert.equal(await response.text(), ''); assert.deepEqual(f.logs, []);
});

test('declared and streamed request bounds reject before effect; response bounds never send partial success', async (t) => {
  const f = await setup(t, { proxyOptions: { maxRequestBytes: 100, maxResponseBytes: 100 }, handler: (req, res) => {
    if (req.url.includes('declared')) res.writeHead(200, { 'content-length': 101 });
    else res.writeHead(200, { 'content-type': 'application/json' });
    res.write(Buffer.alloc(80)); res.end(Buffer.alloc(21));
  } });
  const upload = await fetch(f.base + '/api/player/v1/photos', { method: 'POST', body: Buffer.alloc(101) }); assert.equal(upload.status, 413); assert.equal(f.calls.length, 0); assert.deepEqual(await upload.json(), { error: 'file_too_large' });
  const stream = new ReadableStream({ start(controller) { controller.enqueue(Buffer.alloc(80)); controller.enqueue(Buffer.alloc(21)); controller.close(); } });
  const chunked = await fetch(f.base + '/api/player/v1/photos', { method: 'POST', body: stream, duplex: 'half' }); assert.equal(chunked.status, 413); assert.equal(f.calls.length, 0);
  for (const suffix of ['declared', 'chunked']) { const response = await fetch(f.base + '/api/player/v1/' + suffix); assert.equal(response.status, 502); assert.deepEqual(await response.json(), { error: 'upstream_response_too_large' }); }
  assert.deepEqual(f.logs, []);
});

test('connection loss and total deadline return private errors; timed-out upstream is aborted', async (t) => {
  let aborted = 0;
  const f = await setup(t, { proxyOptions: { timeoutMs: 50 }, handler: (req, res) => {
    if (req.url.includes('loss')) { res.writeHead(200, { 'content-type': 'application/json' }); res.write('{"partial":'); res.destroy(); }
    else res.once('close', () => { aborted++; });
  } });
  const loss = await fetch(f.base + '/api/player/v1/loss'); assert.equal(loss.status, 502); assert.deepEqual(await loss.json(), { error: 'dependency_unavailable' });
  const timeout = await fetch(f.base + '/api/player/v1/session'); assert.equal(timeout.status, 504); assert.deepEqual(await timeout.json(), { error: 'upstream_timeout' });
  // A next real HTTP request provides an event-loop turn for upstream close.
  assert.equal((await fetch(f.base + '/healthz')).status, 200); assert.equal(aborted, 1); assert.deepEqual(f.logs, []);
});

test('bounded admission and client cancellation do not block unrelated frontend traffic', async (t) => {
  let started; const entered = new Promise((resolve) => { started = resolve; }); let stopped; const closed = new Promise((resolve) => { stopped = resolve; });
  const f = await setup(t, { proxyOptions: { maxActive: 1, timeoutMs: 2000 }, handler: (req, res) => { started(); res.once('close', stopped); } });
  const controller = new AbortController(); const pending = fetch(f.base + '/api/player/v1/session', { signal: controller.signal });
  await entered;
  const second = await fetch(f.base + '/api/player/v1/session'); assert.equal(second.status, 429); assert.deepEqual(await second.json(), { error: 'rate_limited' });
  assert.equal((await fetch(f.base + '/healthz')).status, 200); controller.abort(); await assert.rejects(pending); await closed; assert.deepEqual(f.logs, []);
});
