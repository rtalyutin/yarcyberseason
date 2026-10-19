import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const { default: sharp } = await import(backendRequire.resolve('sharp'));
const { generateKeyPair, SignJWT } = await import(backendRequire.resolve('jose'));
import { createPlayerProfileHandler } from '../backend/player-profile-api.mjs';
import { createPlayerS3Store, PLAYER_PREFIX } from '../backend/player-profile-store.mjs';
import { createPlayerProviders } from '../backend/player-profile-auth.mjs';
import { photoBasename, playerConfig } from '../backend/player-profile-config.mjs';

class FakeS3 {
  objects = new Map(); calls = []; loseStateResponse = false; deny = false;
  async send(command) {
    if (this.deny) throw Object.assign(Error('denied'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });
    const p = command.input; this.calls.push({ command: command.constructor.name, ...p });
    const existing = this.objects.get(p.Key);
    if (command.constructor.name === 'GetObjectCommand') {
      if (!existing) throw Object.assign(Error('missing'), { name: 'NoSuchKey' });
      return { Body: Readable.from([existing.body]), ContentLength: existing.body.length, ETag: existing.etag, Metadata: existing.metadata, ContentType: existing.contentType };
    }
    assert.equal(command.constructor.name, 'PutObjectCommand'); assert.equal(p.ACL, 'private');
    if (p.IfNoneMatch === '*' && existing || p.IfMatch && (!existing || p.IfMatch.replaceAll('"', '') !== existing.etag.replaceAll('"', ''))) throw Object.assign(Error('precondition'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
    const body = Buffer.from(p.Body); this.objects.set(p.Key, { body, etag: `"${createHash('md5').update(body).digest('hex')}"`, metadata: p.Metadata || {}, contentType: p.ContentType });
    if (this.loseStateResponse && p.Key.endsWith('/state.json')) { this.loseStateResponse = false; throw Error('connection reset after commit'); }
    return {};
  }
  state() { return JSON.parse(this.objects.get(`${PLAYER_PREFIX}state.json`).body); }
}
const envBase = { YCS_PLAYER_ENABLED: 'true', YCS_PLAYER_ORIGIN: 'http://localhost:5173', YCS_PLAYER_SESSION_SECRET: 'synthetic-player-test-secret-at-least-32-bytes',
  YCS_PLAYER_DISCIPLINES_JSON: JSON.stringify([{ code: 'cs', id: 'cs2', label: 'CS2', roles: [{ id: 'igl', label: 'Капитан' }] }, { code: 'dota2', id: 'dota2', label: 'Dota 2', roles: [{ id: 'support', label: 'Поддержка' }] }]) };

async function fixture(t, { env = {}, s3 = new FakeS3() } = {}) {
  const settings = { ...envBase, ...env }; let clock = Date.now();
  const providers = Object.fromEntries(['telegram', 'vk'].map((name) => [name, { configured: true,
    authorization(a) { return `https://synthetic.invalid/${name}?state=${a.id}`; },
    async exchange(a, params) { return { subject: params.get('code') }; } }]));
  const handler = createPlayerProfileHandler({ env: settings, store: createPlayerS3Store({ env: settings, s3 }), providers, now: () => clock });
  const server = createServer(async (req, res) => { await handler(req, res, new URL(req.url, 'http://localhost')); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); t.after(() => new Promise((r) => { server.closeAllConnections(); server.close(r); }));
  const base = `http://127.0.0.1:${server.address().port}/api/player/v1`;
  function client() {
    return { cookie: '', csrf: '', async call(path, { method = 'GET', body, headers = {} } = {}) {
      const response = await fetch(base + path, { method, redirect: 'manual', headers: { cookie: this.cookie, origin: settings.YCS_PLAYER_ORIGIN,
        ...(method !== 'GET' ? { 'x-csrf-token': this.csrf } : {}), ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...headers },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
      if (response.headers.get('set-cookie')) this.cookie = response.headers.get('set-cookie').split(';')[0];
      let data = null; if (response.status !== 303 && response.headers.get('content-type')?.includes('application/json')) data = await response.json();
      return { response, status: response.status, data };
    }, async session() { const r = await this.call('/session'); this.csrf = r.data?.csrfToken; return r; },
    async login(provider = 'telegram', subject = 'alice', intent = 'login', dis = 'cs') {
      await this.session(); const start = await this.call('/auth/start', { method: 'POST', body: { provider, intent, Dis: dis } }); assert.equal(start.status, 200);
      const result = await this.call(`/auth/callback/${provider}?state=${start.data.attemptId}&code=${subject}`); assert.equal(result.status, 303);
      const session = await this.session(); return { result, session, attemptId: start.data.attemptId };
    }, async upload(bytes, type = 'image/png') {
      const form = new FormData(); form.append('file', new Blob([bytes], { type }), 'input.png');
      return this.call('/photos', { method: 'POST', body: form });
    } };
  }
  const image = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#53aacc' } }).png().withExif({ IFD0: { Artist: 'synthetic-only' } }).toBuffer();
  const payload = (assetId, nickname = 'SameNick', name = null) => ({ requestId: randomUUID(), expectedVersion: null, disciplineCode: 'cs', profile: { nickname, name, city: null, photoAssetId: assetId }, discipline: { roleIds: [], gameAccount: null }, usagePermissions: [] });
  return { s3, client, image, payload, advance: (ms) => { clock += ms; }, settings, base };
}

test('context resolves explicit CS, rejects missing/duplicate/unknown Dis, unavailable is explicit', async (t) => {
  const f = await fixture(t); const c = f.client();
  const context = await c.call('/context?Dis=cs'); assert.equal(context.status, 200); assert.equal(context.data.discipline.id, 'cs2');
  assert.deepEqual(context.data.discipline.roles, [{ id: 'igl', label: 'Капитан' }]);
  for (const query of ['', '?Dis=', '?Dis=no', '?Dis=cs&Dis=cs']) assert.equal((await c.call('/context' + query)).status, 400);
  const disabled = await fixture(t, { env: { YCS_PLAYER_ENABLED: 'false' } }); const d = disabled.client();
  assert.equal((await d.call('/context?Dis=cs')).data.available, false); assert.equal((await d.session()).status, 503);
});

test('server session authenticates official-flow result; own profile persists after service restart', async (t) => {
  const f = await fixture(t); const c = f.client(); const login = await c.login('telegram', 'newcomer', 'login', 'dota2');
  assert.equal(login.session.data.authenticated, true); assert.match(login.result.response.headers.get('location'), /Dis=dota2&auth=success&authAttempt=/);
  assert.equal((await c.call('/me?Dis=cs')).data.profile, null);
  const upload = await c.upload(f.image); assert.equal(upload.status, 201);
  const save = await c.call('/me', { method: 'PUT', body: f.payload(upload.data.assetId, 'Привет') }); assert.equal(save.status, 200); assert.equal(save.data.profile.photoFilename, '??-Привет.jpg');
  const restarted = await fixture(t, { s3: f.s3 }); const d = restarted.client(); d.cookie = c.cookie;
  const again = await d.call('/me?Dis=cs'); assert.equal(again.data.playerId, save.data.playerId); assert.equal(again.data.profile.nickname, 'Привет');
  assert.ok(f.s3.calls.filter((x) => x.command === 'PutObjectCommand').every((x) => x.Key.startsWith(PLAYER_PREFIX)));
});

test('private staged photo is actual 1024 JPEG without EXIF and cannot be read/claimed by another owner', async (t) => {
  const f = await fixture(t); const a = f.client(), b = f.client(), guest = f.client(); await a.login(); await b.login('vk', 'bob');
  const upload = await a.upload(f.image); assert.equal(upload.status, 201); const id = upload.data.assetId;
  const photo = await a.call('/photos/' + id); assert.equal(photo.status, 200);
  const metadata = await sharp(Buffer.from(await photo.response.arrayBuffer())).metadata(); assert.equal(metadata.width, 1024); assert.equal(metadata.height, 1024); assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.exif, undefined);
  assert.equal((await guest.call('/photos/' + id)).status, 401); assert.equal((await b.call('/photos/' + id)).status, 404);
  assert.equal((await b.call('/me', { method: 'PUT', body: f.payload(id) })).status, 404);
});

test('literal optional-FIO filename with atomic suffixes, Cyrillic and named profile', async (t) => {
  const f = await fixture(t); const a = f.client(), b = f.client(), c = f.client(); await a.login('telegram', 'a'); await b.login('telegram', 'b'); await c.login('telegram', 'c');
  const aa = await a.upload(f.image), bb = await b.upload(f.image), cc = await c.upload(f.image);
  const [one, two] = await Promise.all([a.call('/me', { method: 'PUT', body: f.payload(aa.data.assetId) }), b.call('/me', { method: 'PUT', body: f.payload(bb.data.assetId) })]);
  assert.equal(one.status, 200); assert.equal(two.status, 200);
  assert.deepEqual([one.data.profile.photoFilename, two.data.profile.photoFilename].sort(), ['??-SameNick-1.jpg', '??-SameNick.jpg'].sort());
  const named = await c.call('/me', { method: 'PUT', body: f.payload(cc.data.assetId, 'Ник', 'Иван Иванов') }); assert.equal(named.data.profile.photoFilename, 'Иван-Иванов-Ник.jpg');
  assert.ok(f.s3.calls.filter((x) => x.Key.includes('/photos/') && x.command === 'PutObjectCommand').every((x) => x.IfNoneMatch === '*'));
});

test('save idempotency, different body rejection and parallel initial writes', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); const upload = await c.upload(f.image); const body = f.payload(upload.data.assetId);
  const responses = await Promise.all([c.call('/me', { method: 'PUT', body }), c.call('/me', { method: 'PUT', body })]);
  assert.deepEqual(responses.map((r) => r.status), [200, 200]); assert.deepEqual(responses[0].data, responses[1].data);
  assert.equal(Object.values(f.s3.state().accounts).filter((a) => a.profile).length, 1);
  assert.equal((await c.call('/me', { method: 'PUT', body: { ...body, profile: { ...body.profile, nickname: 'changed' } } })).data.error, 'idempotency_conflict');
  assert.equal((await c.call('/operations/' + body.requestId)).data.status, 'committed'); assert.equal((await c.call('/operations/' + randomUUID())).data.status, 'not_found');
});

test('same-version race rejects one save; nick-only change reserves new filename without uploading again', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); const asset = await c.upload(f.image); const first = await c.call('/me', { method: 'PUT', body: f.payload(asset.data.assetId) });
  const change = (nick) => ({ requestId: randomUUID(), expectedVersion: 1, disciplineCode: 'cs', profile: { nickname: nick } });
  const results = await Promise.all([c.call('/me', { method: 'PUT', body: change('one') }), c.call('/me', { method: 'PUT', body: change('two') })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const saved = results.find((r) => r.status === 200).data; assert.equal(saved.version, 2); assert.match(saved.profile.photoFilename, /^\?\?-(one|two)\.jpg$/); assert.equal(saved.profile.photoAssetId, first.data.profile.photoAssetId);
});

test('discipline patch isolates Steam and roles; omitted keeps, null clears optional values', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); const asset = await c.upload(f.image); const body = f.payload(asset.data.assetId, 'nick', 'Имя');
  body.discipline = { roleIds: ['igl'], gameAccount: { platform: 'steam', identifier: '76561198000000000' } }; assert.equal((await c.call('/me', { method: 'PUT', body })).status, 200);
  const second = await c.call('/me', { method: 'PUT', body: { requestId: randomUUID(), expectedVersion: 1, disciplineCode: 'dota2', profile: {}, discipline: { roleIds: ['support'], gameAccount: { platform: 'steam', identifier: '76561198000000000' } } } }); assert.equal(second.status, 200);
  const third = await c.call('/me', { method: 'PUT', body: { requestId: randomUUID(), expectedVersion: 2, disciplineCode: 'dota2', profile: { name: null }, discipline: { gameAccount: null } } }); assert.equal(third.status, 200);
  const cs = await c.call('/me?Dis=cs'); assert.deepEqual(cs.data.discipline.roleIds, ['igl']); assert.equal(cs.data.discipline.gameAccount.identifier, '76561198000000000'); assert.equal(cs.data.profile.name, null);
  const dota = await c.call('/me?Dis=dota2'); assert.deepEqual(dota.data.discipline.roleIds, ['support']); assert.equal(dota.data.discipline.gameAccount, null);
});

test('CSRF, owner forgery, signed-cookie tamper, expiry and logout are denied', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); const asset = await c.upload(f.image); const body = f.payload(asset.data.assetId);
  assert.equal((await c.call('/me', { method: 'PUT', body, headers: { 'x-csrf-token': 'wrong' } })).status, 403);
  assert.equal((await c.call('/me', { method: 'PUT', body, headers: { origin: 'https://evil.invalid' } })).status, 403);
  assert.equal((await c.call('/me', { method: 'PUT', body: { ...body, ownerId: 'other' } })).status, 422);
  const tampered = f.client(); tampered.cookie = c.cookie.slice(0, -1) + (c.cookie.endsWith('A') ? 'B' : 'A'); assert.equal((await tampered.call('/me?Dis=cs')).status, 401);
  assert.equal((await c.call('/logout', { method: 'POST', body: {} })).status, 200); assert.equal((await c.call('/me?Dis=cs')).status, 401);
  await c.login(); f.advance(86400_001); assert.equal((await c.call('/me?Dis=cs')).status, 401);
});

test('confirmed second provider shares profile, duplicate callback and occupied identity cannot merge accounts', async (t) => {
  const f = await fixture(t); const a = f.client(), b = f.client(); await a.login('telegram', 'alice'); const ownerA = (await a.session()).data.ownerId;
  const linked = await a.login('vk', 'alice-vk', 'link'); assert.equal(linked.session.data.ownerId, ownerA); assert.deepEqual(new Set(linked.session.data.providers), new Set(['telegram', 'vk']));
  assert.equal((await a.call(`/auth/callback/vk?state=${linked.attemptId}&code=alice-vk`)).status, 401);
  await b.login('telegram', 'bob'); const ownerB = (await b.session()).data.ownerId; const conflict = await b.login('vk', 'alice-vk', 'link');
  assert.match(conflict.result.response.headers.get('location'), /auth=identity_already_linked/); assert.equal(conflict.session.data.ownerId, ownerB);
  const again = f.client(); await again.login('vk', 'alice-vk'); assert.equal((await again.session()).data.ownerId, ownerA);
});

test('save acknowledgement lost after CAS is recovered from durable receipt', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); const asset = await c.upload(f.image); const body = f.payload(asset.data.assetId);
  f.s3.loseStateResponse = true; const result = await c.call('/me', { method: 'PUT', body }); assert.equal(result.status, 200); assert.equal(result.data.version, 1);
  assert.equal((await c.call('/operations/' + body.requestId)).data.version, 1);
});

test('corrupt/forged/oversize images never replace current photo, and no arbitrary URL is fetched', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); const asset = await c.upload(f.image); await c.call('/me', { method: 'PUT', body: f.payload(asset.data.assetId) });
  assert.equal((await c.upload(Buffer.from('<svg onload="alert(1)"/>'))).status, 415); assert.equal((await c.upload(f.image, 'image/jpeg')).status, 415);
  assert.equal((await c.upload(Buffer.alloc(10 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await c.call('/me', { method: 'PUT', body: { requestId: randomUUID(), expectedVersion: 1, disciplineCode: 'cs', profile: {}, discipline: { gameAccount: { platform: 'steam', identifier: 'http://127.0.0.1/' } } } })).status, 422);
  assert.equal((await c.call('/me?Dis=cs')).data.profile.photoAssetId, asset.data.assetId);
});

test('typed metadata extension works without new domain columns; protected and wrong role values reject', async (t) => {
  const f = await fixture(t, { env: { YCS_PLAYER_FIELDS_JSON: JSON.stringify([{ id: 'custom_bio', type: 'string', scope: 'profile', required: false, maxLength: 100 }]) } });
  const c = f.client(); await c.login(); const asset = await c.upload(f.image); const body = f.payload(asset.data.assetId); body.profile.custom_bio = 'Привет';
  const saved = await c.call('/me', { method: 'PUT', body }); assert.equal(saved.status, 200); assert.equal(saved.data.profile.custom_bio, 'Привет');
  assert.deepEqual(Object.values(f.s3.state().accounts)[0].profile.parameters.custom_bio, { type: 'string', value: 'Привет' });
  const update = { requestId: randomUUID(), expectedVersion: 1, disciplineCode: 'cs', profile: {}, discipline: { roleIds: ['support'] } };
  assert.equal((await c.call('/me', { method: 'PUT', body: update })).status, 422);
  update.profile.ownerId = 'other'; assert.equal((await c.call('/me', { method: 'PUT', body: update })).status, 422);
});

test('outdated permission text is atomic and grant stores registered fields only', async (t) => {
  const permissions = [{ purpose: 'broadcast', textVersion: 'test-v1', text: 'Synthetic test text', fields: ['nickname', 'photo'] }];
  const f = await fixture(t, { env: { YCS_PLAYER_PERMISSIONS_JSON: JSON.stringify(permissions) } }); const c = f.client(); await c.login(); const asset = await c.upload(f.image); const body = f.payload(asset.data.assetId);
  body.usagePermissions = [{ purpose: 'broadcast', allowed: true, textVersion: 'stale' }]; assert.equal((await c.call('/me', { method: 'PUT', body })).status, 409); assert.equal((await c.call('/me?Dis=cs')).data.profile, null);
  body.usagePermissions[0].textVersion = 'test-v1'; const saved = await c.call('/me', { method: 'PUT', body }); assert.equal(saved.status, 200); assert.deepEqual(saved.data.usagePermissions[0].fields, ['nickname', 'photo']);
});

test('storage denial is unavailable, never a false new profile', async (t) => {
  const f = await fixture(t); const c = f.client(); await c.login(); f.s3.deny = true;
  const result = await c.call('/me?Dis=cs'); assert.equal(result.status, 503); assert.equal(result.data.error, 'storage_unavailable');
});

test('filename path delimiters never become object path and exact placeholder is preserved', () => {
  assert.equal(photoBasename(null, 'nick'), '??-nick'); assert.equal(photoBasename('Иван Иванов', 'nick'), 'Иван-Иванов-nick');
  assert.doesNotMatch(photoBasename(null, '../../Nick?name#hash').slice(3), /[/\\?#]/);
  assert.equal(playerConfig({ YCS_PLAYER_DISCIPLINES_JSON: '{invalid' }).configValid, false);
});

test('Telegram validates signature issuer/audience/nonce; VK validates exchange state and user-info binding', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const env = { YCS_PLAYER_TELEGRAM_CLIENT_ID: '12345', YCS_PLAYER_TELEGRAM_CLIENT_SECRET: 'synthetic-secret', YCS_PLAYER_VK_CLIENT_ID: '45678' };
  const attempt = { id: 'state', nonce: 'nonce', verifier: 'verifier' }; let aud = '12345', nonce = 'nonce', vkState = 'state', infoId = '87'; const calls = [];
  const providers = createPlayerProviders({ env, telegramKey: publicKey, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.includes('telegram.org')) return Response.json({ id_token: await new SignJWT({ nonce }).setProtectedHeader({ alg: 'RS256' }).setIssuer('https://oauth.telegram.org').setAudience(aud).setSubject('123').setIssuedAt().setExpirationTime('5m').sign(privateKey) });
    return url.includes('user_info') ? Response.json({ user: { user_id: infoId } }) : Response.json({ access_token: 'synthetic-access-token', state: vkState, user_id: 87 });
  } });
  assert.deepEqual(await providers.telegram.exchange(attempt, new URLSearchParams({ code: 'one' }), 'https://site.invalid/callback'), { subject: '123' });
  aud = 'wrong'; await assert.rejects(() => providers.telegram.exchange(attempt, new URLSearchParams({ code: 'one' }), 'https://site.invalid/callback'), { code: 'auth_provider_rejected' }); aud = '12345'; nonce = 'wrong'; await assert.rejects(() => providers.telegram.exchange(attempt, new URLSearchParams({ code: 'one' }), 'https://site.invalid/callback'), { code: 'auth_provider_rejected' });
  const params = new URLSearchParams({ code: 'one', device_id: 'device' }); assert.deepEqual(await providers.vk.exchange(attempt, params, 'https://site.invalid/callback'), { subject: '87' });
  vkState = 'wrong'; await assert.rejects(() => providers.vk.exchange(attempt, params, 'https://site.invalid/callback'), { code: 'auth_provider_rejected' }); vkState = 'state'; infoId = '88'; await assert.rejects(() => providers.vk.exchange(attempt, params, 'https://site.invalid/callback'), { code: 'auth_provider_rejected' });
  assert.ok(calls.every((c) => !c.options.body.toString().includes('scope=phone')));
});
