import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createPlayerProfileHandler } from '../backend/player-profile-api.mjs';
import { createPlayerS3Store, PLAYER_PREFIX } from '../backend/player-profile-store.mjs';
import { processPlayerPhoto } from '../backend/player-profile-service.mjs';
import { PHOTO_LIMITS } from '../backend/player-profile-config.mjs';
import { createPlayerClient } from '../src/lib/player-profile-client.js';
import { formFromPlayer, playerSaveRequest } from '../src/lib/player-profile.js';

// Independent verifier fixture: public HTTP API and a protocol-level S3 double.
// No author-test helper, provider credential, external request, or real bucket.
const requireBackend = createRequire(new URL('../backend/package.json', import.meta.url));
const sharp = requireBackend('sharp');
const md5 = (body) => `"${createHash('md5').update(body).digest('hex')}"`;
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

class VerifierS3 {
  objects = new Map(); calls = []; fail = null; gate = null;
  async send(command) {
    const c = command.input, kind = command.constructor.name;
    this.calls.push({ kind, key: c.Key, acl: c.ACL, ifNone: c.IfNoneMatch, ifMatch: c.IfMatch });
    const saved = this.objects.get(c.Key);
    if (kind === 'GetObjectCommand') {
      if (!saved) throw Object.assign(new Error('synthetic missing'), { name: 'NoSuchKey' });
      return { Body: Readable.from([saved.body]), ContentLength: saved.body.length,
        ETag: saved.etag, Metadata: saved.metadata, ContentType: saved.type };
    }
    assert.equal(kind, 'PutObjectCommand');
    assert.equal(c.ACL, 'private');
    assert.ok(c.Key.startsWith(PLAYER_PREFIX));
    if ((c.IfNoneMatch === '*' && saved) || (c.IfMatch && saved?.etag !== c.IfMatch)) {
      throw Object.assign(new Error('synthetic precondition'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
    }
    if (this.fail?.key(c.Key) && this.fail.when === 'before') {
      this.fail = null; throw new Error('synthetic transport loss before commit');
    }
    const body = Buffer.from(c.Body);
    this.objects.set(c.Key, { body, etag: md5(body), metadata: c.Metadata || {}, type: c.ContentType });
    if (this.gate && c.Key.includes('/photos/')) {
      const gate = this.gate; this.gate = null; gate.entered.resolve(); await gate.release.promise;
    }
    if (this.fail?.key(c.Key) && this.fail.when === 'after') {
      this.fail = null; throw new Error('synthetic transport loss after commit');
    }
    return {};
  }
  state() { return JSON.parse(this.objects.get(`${PLAYER_PREFIX}state.json`).body); }
}

async function fixture(t, s3 = new VerifierS3()) {
  let instant = Date.now();
  const env = { YCS_PLAYER_ENABLED: 'true', YCS_PLAYER_ORIGIN: 'http://localhost:5173',
    YCS_PLAYER_SESSION_SECRET: 'independent-synthetic-session-secret-32bytes',
    YCS_PLAYER_DISCIPLINES_JSON: JSON.stringify([
      { code: 'cs', id: 'cs2', label: 'CS2', roles: [{ id: 'igl', label: 'IGL' }] },
      { code: 'test', id: 'test', label: 'Other configured discipline', roles: [{ id: 'support', label: 'Support' }] },
    ]) };
  const exchanges = [];
  const providers = Object.fromEntries(['telegram', 'vk'].map((name) => [name, {
    configured: true,
    authorization: (a) => `https://provider.synthetic.invalid/${name}?state=${a.id}`,
    exchange: async (attempt, params) => { exchanges.push({ name, subject: params.get('code'), intent: attempt.intent }); return { subject: params.get('code') }; },
  }]));
  const handler = createPlayerProfileHandler({ env, store: createPlayerS3Store({ env, s3 }), providers, now: () => instant });
  const server = createServer(async (req, res) => { await handler(req, res, new URL(req.url, 'http://localhost')); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api/player/v1`;
  const client = () => ({
    cookie: '', csrf: '',
    async request(path, { method = 'GET', body, headers = {} } = {}) {
      const multipart = body instanceof FormData;
      const response = await fetch(base + path, { method, redirect: 'manual',
        headers: { cookie: this.cookie, origin: env.YCS_PLAYER_ORIGIN, 'x-csrf-token': this.csrf,
          ...(body !== undefined && !multipart ? { 'content-type': 'application/json' } : {}), ...headers },
        body: body === undefined ? undefined : multipart ? body : JSON.stringify(body) });
      const setCookie = response.headers.get('set-cookie'); if (setCookie) this.cookie = setCookie.split(';')[0];
      const data = response.headers.get('content-type')?.includes('application/json') && response.status !== 303 ? await response.json() : null;
      return { status: response.status, data, response };
    },
    async session() { const r = await this.request('/session'); this.csrf = r.data?.csrfToken || ''; return r; },
    async start(provider, intent = 'login', Dis = 'cs') {
      await this.session(); const r = await this.request('/auth/start', { method: 'POST', body: { provider, intent, Dis } });
      assert.equal(r.status, 200); return r.data.attemptId;
    },
    async login(provider, subject, intent = 'login', dis = 'cs') {
      const attempt = await this.start(provider, intent, dis);
      const callback = await this.request(`/auth/callback/${provider}?state=${attempt}&code=${subject}`);
      assert.equal(callback.status, 303); const session = await this.session();
      return { attempt, location: callback.response.headers.get('location'), owner: session.data?.ownerId };
    },
    async upload(bytes, type = 'image/png') {
      const body = new FormData(); body.append('file', new Blob([bytes], { type }), 'synthetic.png');
      return this.request('/photos', { method: 'POST', body });
    },
  });
  const image = await sharp({ create: { width: 40, height: 60, channels: 3, background: '#cd0031' } }).png().toBuffer();
  const save = (asset, nickname = 'nick', name = null, expectedVersion = null) => ({ requestId: randomUUID(), expectedVersion,
    disciplineCode: 'cs', profile: { nickname, name, photoAssetId: asset } });
  return { client, s3, image, save, advance: (ms) => { instant += ms; }, exchanges, base, env };
}

test('verifier NAME-01: optional FIO, exact literal ??, three suffixes and named Unicode persist in S3', async (t) => {
  const f = await fixture(t), owners = [];
  for (let i = 0; i < 4; i++) {
    const c = f.client(); await c.login('telegram', `person${i}`); owners.push(c);
    const up = await c.upload(f.image); assert.equal(up.status, 201);
    const r = await c.request('/me', { method: 'PUT', body: f.save(up.data.assetId, 'Ник', i === 3 ? 'Иван Иванов' : null) });
    assert.equal(r.status, 200);
    const expected = ['??-Ник.jpg', '??-Ник-1.jpg', '??-Ник-2.jpg', 'Иван-Иванов-Ник.jpg'][i];
    assert.equal(r.data.profile.photoFilename, expected);
    assert.ok(f.s3.objects.has(`${PLAYER_PREFIX}photos/${expected}`));
  }
  const state = f.s3.state(); assert.equal(Object.keys(state.accounts).length, 4);
  assert.ok(Object.values(state.accounts).some((a) => a.profile.parameters.name.value === 'Иван Иванов'));
  assert.ok(f.s3.calls.filter((c) => c.kind === 'PutObjectCommand').every((c) => c.acl === 'private'));
});

test('verifier CAS-01: deterministic interleaving reserves distinct names without overwriting or losing either profile', async (t) => {
  const f = await fixture(t), a = f.client(), b = f.client(); await a.login('telegram', 'a'); await b.login('telegram', 'b');
  const one = await a.upload(f.image), two = await b.upload(f.image);
  const gate = { entered: deferred(), release: deferred() }; f.s3.gate = gate;
  const pending = a.request('/me', { method: 'PUT', body: f.save(one.data.assetId) });
  await gate.entered.promise;
  const second = await b.request('/me', { method: 'PUT', body: f.save(two.data.assetId) });
  gate.release.resolve(); const first = await pending;
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  assert.deepEqual([first.data.profile.photoFilename, second.data.profile.photoFilename], ['??-nick.jpg', '??-nick-1.jpg']);
  assert.equal(Object.values(f.s3.state().accounts).filter((a) => a.profile).length, 2);
  assert.ok(f.s3.calls.filter((c) => c.kind === 'PutObjectCommand' && c.key.includes('/photos/')).every((c) => c.ifNone === '*'));
});

test('verifier SAVE-01: pre-commit network loss is unknown, exact retry commits once and stale updates cannot overwrite', async (t) => {
  const f = await fixture(t), c = f.client(); await c.login('telegram', 'a'); const up = await c.upload(f.image), body = f.save(up.data.assetId);
  f.s3.fail = { when: 'before', key: (key) => key.endsWith('/state.json') };
  const lost = await c.request('/me', { method: 'PUT', body }); assert.equal(lost.status, 503); assert.equal(lost.data.error, 'save_unknown');
  assert.equal((await c.request(`/operations/${body.requestId}`)).data.status, 'not_found');
  const recovered = await c.request('/me', { method: 'PUT', body }); assert.equal(recovered.status, 200); assert.equal(recovered.data.version, 1);
  const replay = await c.request('/me', { method: 'PUT', body }); assert.deepEqual(replay.data, recovered.data);
  const stale = await c.request('/me', { method: 'PUT', body: { ...body, requestId: randomUUID(), profile: { nickname: 'stale' } } });
  assert.equal(stale.status, 409); assert.equal((await c.request('/me?Dis=cs')).data.profile.nickname, 'nick');
});

test('verifier SAVE-02: lost photo-create and state-CAS acknowledgements resolve from stored bytes/receipt', async (t) => {
  const f = await fixture(t), c = f.client(); await c.login('telegram', 'a'); const up = await c.upload(f.image), body = f.save(up.data.assetId);
  f.s3.fail = { when: 'after', key: (key) => key.includes('/photos/') };
  const photoLost = await c.request('/me', { method: 'PUT', body }); assert.equal(photoLost.status, 200);
  f.s3.fail = { when: 'after', key: (key) => key.endsWith('/state.json') };
  const change = { requestId: randomUUID(), expectedVersion: 1, disciplineCode: 'cs', profile: { city: 'test' } };
  const stateLost = await c.request('/me', { method: 'PUT', body: change }); assert.equal(stateLost.status, 200); assert.equal(stateLost.data.version, 2);
  assert.equal((await c.request(`/operations/${change.requestId}`)).data.version, 2);
});

test('verifier AUTH-01: equal provider subjects stay separate; confirmed linkage preserves owner; replay/state swap deny', async (t) => {
  const f = await fixture(t), a = f.client(), b = f.client();
  const aa = await a.login('telegram', '42'), bb = await b.login('vk', '42'); assert.notEqual(aa.owner, bb.owner);
  const link = await a.login('vk', '43', 'link', 'test'); assert.equal(link.owner, aa.owner); assert.match(link.location, /Dis=test&auth=success/);
  assert.equal((await a.request(`/auth/callback/vk?state=${link.attempt}&code=43`)).status, 401);
  const third = f.client(), login = await third.login('vk', '43'); assert.equal(login.owner, aa.owner);
  const start = await a.start('telegram'); const before = f.exchanges.length;
  assert.equal((await b.request(`/auth/callback/telegram?state=${start}&code=other`)).status, 401);
  assert.equal(f.exchanges.length, before);
});

test('verifier PRIV-01: saved photos remain private, another owner cannot claim asset, and logout/expiry revoke access', async (t) => {
  const f = await fixture(t), a = f.client(), b = f.client(), guest = f.client(); await a.login('telegram', 'a'); await b.login('vk', 'b');
  const up = await a.upload(f.image); assert.equal((await a.request('/me', { method: 'PUT', body: f.save(up.data.assetId) })).status, 200);
  const path = `/photos/${up.data.assetId}`;
  assert.equal((await guest.request(path)).status, 401); assert.equal((await b.request(path)).status, 404);
  assert.equal((await b.request('/me', { method: 'PUT', body: f.save(up.data.assetId) })).status, 404);
  const photo = await a.request(path); assert.equal(photo.status, 200); assert.match(photo.response.headers.get('cache-control'), /no-store/);
  assert.match(photo.response.headers.get('content-security-policy'), /sandbox/);
  await a.request('/logout', { method: 'POST' }); assert.equal((await a.request(path)).status, 401);
  await a.login('telegram', 'a'); f.advance(86_400_001); assert.equal((await a.request(path)).status, 401);
});

test('verifier DATA-01: one profile across disciplines, account replacement scoped and forged protected fields reject atomically', async (t) => {
  const f = await fixture(t), c = f.client(); await c.login('telegram', 'a'); const up = await c.upload(f.image);
  const first = f.save(up.data.assetId); first.discipline = { roleIds: ['igl'], gameAccount: { platform: 'steam', identifier: '76561198000000001' } };
  const r = await c.request('/me', { method: 'PUT', body: first }); assert.equal(r.status, 200);
  const second = { requestId: randomUUID(), expectedVersion: 1, disciplineCode: 'test', profile: {}, discipline: { roleIds: ['support'], gameAccount: { platform: 'steam', identifier: '76561198000000002' } } };
  assert.equal((await c.request('/me', { method: 'PUT', body: second })).data.playerId, r.data.playerId);
  assert.equal((await c.request('/me?Dis=cs')).data.discipline.gameAccount.identifier, '76561198000000001');
  const denied = await c.request('/me', { method: 'PUT', body: { ...second, requestId: randomUUID(), expectedVersion: 2, profile: { nickname: 'changed', ownerId: 'forged' } } });
  assert.equal(denied.status, 422); assert.equal((await c.request('/me?Dis=cs')).data.profile.nickname, 'nick');
});

test('verifier DATA-02: Steam identifier type must remain string; numeric IDs reject rather than silently lose precision', async (t) => {
  const f = await fixture(t), c = f.client(); await c.login('telegram', 'a'); const up = await c.upload(f.image);
  const body = f.save(up.data.assetId); body.discipline = { gameAccount: { platform: 'steam', identifier: 76561198000000001 } };
  const result = await c.request('/me', { method: 'PUT', body });
  assert.equal(result.status, 422, `numeric Steam ID accepted as ${JSON.stringify(result.data?.discipline?.gameAccount)}`);
  assert.equal((await c.request('/me?Dis=cs')).data.profile, null);
});

test('verifier PHOTO-01: EXIF orientation is applied before square crop and stripped from persisted derivative', async () => {
  const width = 120, height = 80, raw = Buffer.alloc(width * height * 3);
  const quadrants = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const color = quadrants[(y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0)];
    raw.set(color, (y * width + x) * 3);
  }
  const bytes = await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const processed = await processPlayerPhoto(bytes, { limits: PHOTO_LIMITS, contentType: 'image/jpeg', crop: { rotation: 0, left: 0, top: 0, width: 30, height: 30 } });
  const metadata = await sharp(processed.body).metadata(); assert.equal(metadata.width, 1024); assert.equal(metadata.height, 1024); assert.equal(metadata.orientation, undefined); assert.equal(metadata.exif, undefined);
  const pixel = await sharp(processed.body).extract({ left: 512, top: 512, width: 1, height: 1 }).raw().toBuffer();
  assert.ok(pixel[2] > 220 && pixel[0] < 25 && pixel[1] < 25, `oriented upper-left crop should be blue, observed RGB ${[...pixel]}`);
});

test('verifier CALLER-01: actual frontend client and request projection complete session/upload/save/read/photo through HTTP', async (t) => {
  const f = await fixture(t); let cookie = '';
  // Only the browser transport contract (cookie jar + Origin) is emulated.
  // Request paths, multipart, CSRF, form projection and responses are real code.
  const browserFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers || {}); headers.set('origin', f.env.YCS_PLAYER_ORIGIN);
    if (cookie) headers.set('cookie', cookie);
    const response = await fetch(url, { ...options, headers, redirect: 'manual' });
    const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
  const api = createPlayerClient({ baseUrl: f.base.replace(/\/api\/player\/v1$/, ''), fetchImpl: browserFetch });
  const context = await api.context('cs'); assert.equal(context.discipline.id, 'cs2');
  assert.equal((await api.session()).authenticated, false);
  const attempt = await api.start({ provider: 'telegram', intent: 'login', Dis: 'cs' });
  const callback = await browserFetch(`${f.base}/auth/callback/telegram?state=${attempt.attemptId}&code=client-person`);
  assert.equal(callback.status, 303); assert.equal((await api.session()).authenticated, true);
  const base = await api.me('cs'); assert.equal(base.profile, null);
  const photo = await api.upload(new Blob([f.image], { type: 'image/png' }));
  const form = formFromPlayer(base, context); form.nickname = 'ClientNick';
  const request = playerSaveRequest({ form, context, base, photoAssetId: photo.assetId, requestId: randomUUID() });
  const saved = await api.save(request); assert.equal(saved.profile.photoFilename, '??-ClientNick.jpg');
  const again = await api.me('cs'); assert.equal(again.playerId, saved.playerId); assert.equal(again.profile.nickname, form.nickname);
  const blob = await api.photo(photo.assetId); assert.equal(blob.type, 'image/jpeg'); assert.ok(blob.size > 100);
  assert.equal((await api.operation(request.requestId)).status, 'committed');
  await api.logout(); assert.equal((await api.session()).authenticated, false);
});
