import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerClient } from '../src/lib/player-profile-client.js';
import { formFromPlayer, playerSaveRequest, readPlayerDiscipline, drawPlayerCrop } from '../src/lib/player-profile.js';

const context = { discipline: { code: 'cs' }, fields: [
  { id: 'nickname', scope: 'profile' }, { id: 'name', scope: 'profile' },
  { id: 'city', scope: 'profile' }, { id: 'custom_favorite', scope: 'profile' }],
  usagePermissions: [{ purpose: 'website', textVersion: 'new' }] };

test('Dis accepts the explicit context only, not theme, repeated or missing parameters', () => {
  assert.equal(readPlayerDiscipline('?Dis=cs&theme=dota2'), 'cs');
  for (const value of ['', '?dis=cs', '?Dis=', '?Dis=CS', '?Dis=cs&Dis=cs', '?Dis=../cs', '?Dis=%00']) assert.equal(readPlayerDiscipline(value), null);
});

test('form keeps metadata fields and requires a new decision for changed usage text', () => {
  const form = formFromPlayer({ profile: { nickname: ' Test ', name: null, city: 'Ярославль', custom_favorite: 'mouse' },
    discipline: { roleIds: ['awp'], gameAccount: { platform: 'steam', identifier: '76561198000000000', verification: 'self_declared' } },
    usagePermissions: [{ purpose: 'website', textVersion: 'old', allowed: true }] }, context);
  assert.equal(form.name, ''); assert.equal(form.custom_favorite, 'mouse');
  assert.equal(form.usagePermissions[0].allowed, false);
  const body = playerSaveRequest({ form, context, base: { version: 4 }, photoAssetId: 'photo', requestId: 'stable-id' });
  assert.deepEqual(body, { requestId: 'stable-id', expectedVersion: 4, disciplineCode: 'cs',
    profile: { nickname: 'Test', name: null, city: 'Ярославль', custom_favorite: 'mouse', photoAssetId: 'photo' },
    discipline: { roleIds: ['awp'], gameAccount: { platform: 'steam', identifier: '76561198000000000' } },
    usagePermissions: [{ purpose: 'website', textVersion: 'new', allowed: false }] });
  assert.equal(Object.hasOwn(body, 'ownerId'), false);
});

test('client uses cookie ownership and session CSRF, leaving multipart boundary to the browser', async () => {
  const calls = [];
  const client = createPlayerClient({ fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith('/session') ? { authenticated: true, csrfToken: 'csrf' } : { assetId: 'photo' });
  } });
  await client.session(); await client.upload(new Blob(['image'], { type: 'image/jpeg' }));
  assert.equal(calls[1].url, '/api/player/v1/photos');
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'csrf');
  assert.equal(Object.hasOwn(calls[1].options.headers, 'Content-Type'), false);
  assert.ok(calls[1].options.body instanceof FormData);
});

test('a lost response can be looked up and retried with the identical operation and payload', async () => {
  const calls = []; let lost = true;
  const client = createPlayerClient({ baseUrl: 'https://api.example.test/', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'PUT' && lost) { lost = false; throw new Error('lost response after commit'); }
    return Response.json(url.includes('/operations/') ? { status: 'committed' } : { version: 1 });
  } });
  const body = { requestId: 'immutable-operation', profile: { nickname: 'same' } };
  await assert.rejects(client.save(body), { code: 'network_error' });
  assert.equal((await client.operation(body.requestId)).status, 'committed');
  await client.save(body);
  const saves = calls.filter((call) => call.options.method === 'PUT');
  assert.equal(saves[0].options.body, saves[1].options.body);
  assert.equal(calls[1].url, 'https://api.example.test/api/player/v1/operations/immutable-operation');
});

test('known validation failure is separate from an unknown transport result', async () => {
  const client = createPlayerClient({ fetchImpl: async () => Response.json({ error: 'validation_failed', fields: { nickname: 'required' } }, { status: 422 }) });
  await assert.rejects(client.save({}), (failure) => failure.status === 422 && failure.code === 'validation_failed' && failure.fields.nickname === 'required');
});

test('portrait crop uses the central square and bounded translated area after a quarter turn', () => {
  const calls = []; const context2d = Object.fromEntries(['save', 'fillRect', 'scale', 'translate', 'rotate', 'drawImage', 'restore'].map((method) => [method, (...args) => calls.push([method, ...args])]));
  const canvas = { getContext: () => context2d };
  drawPlayerCrop(canvas, { width: 200, height: 100 }, { rotation: 0, zoom: 1, horizontal: 0, vertical: 0 }, 100);
  assert.deepEqual(calls.find((call) => call[0] === 'translate'), ['translate', 50, 50]);
  assert.equal(canvas.width, 100); assert.equal(canvas.height, 100);
  calls.length = 0;
  drawPlayerCrop(canvas, { width: 200, height: 100 }, { rotation: 90, zoom: 1, horizontal: 0, vertical: 100 }, 100);
  assert.deepEqual(calls.find((call) => call[0] === 'translate'), ['translate', 50, 0]);
  assert.deepEqual(calls.find((call) => call[0] === 'rotate'), ['rotate', Math.PI / 2]);
});
