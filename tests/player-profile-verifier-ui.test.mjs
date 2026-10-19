import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

// React lifecycle tests, without a browser, DOM, navigation or real provider.
let vite, PlayerProfilePage;
before(async () => {
  vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  PlayerProfilePage = (await vite.ssrLoadModule('/src/components/PlayerProfilePage.jsx')).default;
});
after(async () => { await vite?.close(); });

const defer = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const text = (node) => typeof node === 'string' ? node : node.children?.map(text).join('') || '';
const button = (renderer, label) => renderer.root.findAllByType('button').find((node) => text(node).includes(label));
const input = (renderer, name) => renderer.root.findAllByType('input').find((node) => node.props.name === name);
const failed = (code, status) => Object.assign(new Error(`synthetic ${code}`), { code, status });

async function fixture(t, { search = '?Dis=cs', contextFailure = null } = {}) {
  const previousWindow = globalThis.window, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const listeners = new Map();
  const popup = { closed: false, location: { href: '' }, close() { this.closed = true; } };
  const fakeWindow = {
    location: { origin: 'http://localhost:5173', search }, opener: null, name: '',
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    open() { popup.closed = false; return popup; }, setInterval() { return 1; }, clearInterval() {},
  };
  globalThis.window = fakeWindow; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const state = { owner: 'ownerA', authenticated: true, pendingMe: null, saves: [], meCalls: [], saveImpl: null, contextCalls: [], sessionCalls: 0, photoCalls: 0 };
  const config = (code) => ({ available: true, discipline: { code, id: code, label: code, roles: [] },
    fields: ['nickname', 'name', 'city'].map((id) => ({ id, scope: 'profile', required: id === 'nickname', maxLength: 200 })),
    photo: { size: 1024, maxPixels: 64_000_000, maxBytes: 10_485_760, formats: ['image/jpeg', 'image/png', 'image/webp'] },
    providers: { telegram: true, vk: true }, usagePermissions: [], retryWindowMs: 86_400_000 });
  const record = (owner, code) => ({ playerId: owner, version: 1,
    profile: { nickname: `${owner}-${code}`, name: null, city: null, photoAssetId: `${owner}-photo`, photoFilename: `??-${owner}.jpg` },
    discipline: { code, roleIds: [], gameAccount: null }, usagePermissions: [] });
  const api = {
    context: async (code) => { state.contextCalls.push(code); if (contextFailure) throw contextFailure; return config(code); },
    session: async () => { state.sessionCalls++; return { authenticated: state.authenticated, ownerId: state.owner, providers: ['telegram'] }; },
    me: async (code) => { state.meCalls.push({ owner: state.owner, code }); return state.pendingMe ? state.pendingMe.promise : record(state.owner, code); },
    photo: async () => { state.photoCalls++; return new Blob(['synthetic image'], { type: 'image/jpeg' }); },
    start: async () => ({ attemptId: 'attempt1', authorizationUrl: 'https://oauth.telegram.org/auth?state=attempt1' }),
    save: async (body) => { state.saves.push(body); return state.saveImpl ? state.saveImpl(body) : { ...record(state.owner, body.disciplineCode), version: 2, profile: { ...body.profile } }; },
    operation: async () => ({ status: 'not_found' }),
    logout: async () => { state.authenticated = false; return { authenticated: false }; },
  };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(PlayerProfilePage, { client: api, initialSearch: search }), {
    createNodeMock(element) {
      if (element.type !== 'canvas') return null;
      const context = Object.fromEntries(['save', 'fillRect', 'scale', 'translate', 'rotate', 'drawImage', 'restore'].map((name) => [name, () => {}]));
      return { getContext: () => context, toBlob: (callback) => callback(new Blob(['synthetic crop'], { type: 'image/jpeg' })) };
    },
  }); });
  t.after(async () => {
    await act(async () => renderer.unmount());
    globalThis.window = previousWindow; globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  });
  const change = async (name, value) => { await act(async () => { input(renderer, name).props.onChange({ target: { value } }); }); };
  const submit = async () => { await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); };
  const deliverAuth = async () => { await act(async () => {
    for (const listener of [...(listeners.get('message') || [])]) listener({ origin: fakeWindow.location.origin, source: popup,
      data: { type: 'ycs-player-auth', attemptId: 'attempt1', status: 'success' } });
    await Promise.resolve();
  }); };
  return { renderer, state, api, record, change, submit, deliverAuth };
}

test('verifier UI-SAVE-01: unknown request followed by definitive 422 unlocks unchanged draft and retains exact request ID', async (t) => {
  const f = await fixture(t); await f.change('nickname', 'draft-after-network-loss');
  f.state.saveImpl = async () => { throw failed('network_error'); };
  await f.submit(); assert.ok(button(f.renderer, 'Проверить и повторить тот же запрос'));
  assert.equal(f.renderer.root.findAllByType('fieldset').every((node) => node.props.disabled), true);
  f.state.saveImpl = async () => { throw failed('validation_failed', 422); };
  await act(async () => { await button(f.renderer, 'Проверить и повторить тот же запрос').props.onClick(); });
  assert.equal(f.state.saves.length, 2); assert.strictEqual(f.state.saves[0], f.state.saves[1]);
  assert.equal(button(f.renderer, 'Проверить и повторить тот же запрос'), undefined);
  assert.equal(f.renderer.root.findAllByType('fieldset').some((node) => node.props.disabled), false);
  assert.equal(input(f.renderer, 'nickname').props.value, 'draft-after-network-loss');
  assert.equal(button(f.renderer, 'Сохранить профиль').props.disabled, false);
});

test('verifier UI-AUTH-01: new owner clears old private draft before delayed profile read and keeps all editing locked', async (t) => {
  const f = await fixture(t); await f.change('nickname', 'PRIVATE-DRAFT-A');
  f.state.saveImpl = async () => { throw failed('unauthenticated', 401); };
  await f.submit(); assert.ok(button(f.renderer, 'Войти через Telegram'));
  f.state.owner = 'ownerB'; f.state.pendingMe = defer();
  await act(async () => { await button(f.renderer, 'Войти через Telegram').props.onClick(); });
  await f.deliverAuth();
  assert.notEqual(input(f.renderer, 'nickname').props.value, 'PRIVATE-DRAFT-A');
  assert.equal(f.renderer.root.findAllByType('fieldset').every((node) => node.props.disabled), true);
  assert.equal(button(f.renderer, 'Сохранить профиль').props.disabled, true);
  assert.equal(f.state.saves.length, 1);
  await act(async () => { f.state.pendingMe.resolve(f.record('ownerB', 'cs')); await f.state.pendingMe.promise; });
  assert.equal(input(f.renderer, 'nickname').props.value, 'ownerB-cs');
  assert.equal(f.renderer.root.findAllByType('fieldset').some((node) => node.props.disabled), false);
});

test('verifier UI-DIS-01: changing URL discipline does not transplant the previous discipline draft', async (t) => {
  const f = await fixture(t); await f.change('nickname', 'CS-ONLY-DRAFT');
  await act(async () => { f.renderer.update(React.createElement(PlayerProfilePage, { client: f.api, initialSearch: '?Dis=test' })); });
  assert.equal(input(f.renderer, 'nickname').props.value, 'ownerA-test');
  assert.equal(f.state.meCalls.at(-1).code, 'test');
});

test('verifier UI-AUTH-02: same-owner reauthentication keeps text, selected bitmap and crop controls in memory', async (t) => {
  const f = await fixture(t), previousDecode = globalThis.createImageBitmap;
  let closed = false;
  // Decode is a component boundary double; pixel correctness is a separate test.
  globalThis.createImageBitmap = async () => ({ width: 200, height: 100, close() { closed = true; } });
  t.after(() => { globalThis.createImageBitmap = previousDecode; });
  await f.change('nickname', 'SAME-OWNER-DRAFT');
  await act(async () => { await f.renderer.root.findAllByType('input').find((node) => node.props.type === 'file').props.onChange({ target: { files: [{ type: 'image/png', size: 123 }], value: 'selected' } }); });
  await act(async () => { f.renderer.root.findAllByType('input').find((node) => node.props.type === 'range' && node.props.min === 1).props.onChange({ target: { value: '2' } }); });
  f.api.upload = async () => { throw failed('unauthenticated', 401); };
  await f.submit(); assert.ok(button(f.renderer, 'Войти через Telegram'));
  await act(async () => { await button(f.renderer, 'Войти через Telegram').props.onClick(); });
  await f.deliverAuth();
  assert.equal(input(f.renderer, 'nickname').props.value, 'SAME-OWNER-DRAFT');
  assert.equal(f.renderer.root.findAllByType('canvas').length, 1);
  assert.equal(f.renderer.root.findAllByType('input').find((node) => node.props.type === 'range' && node.props.min === 1).props.value, 2);
  assert.equal(closed, false); assert.equal(f.state.meCalls.length, 1);
  assert.equal(button(f.renderer, 'Сохранить профиль').props.disabled, false);
});

test('verifier UI-PHOTO-01: cancelling photo replacement restores saved asset, preserves other edits and does not upload', async (t) => {
  const f = await fixture(t), previousDecode = globalThis.createImageBitmap;
  let closed = false, uploads = 0;
  globalThis.createImageBitmap = async () => ({ width: 200, height: 100, close() { closed = true; } });
  t.after(() => { globalThis.createImageBitmap = previousDecode; });
  f.api.upload = async () => { uploads++; throw new Error('cancelled replacement must not upload'); };
  await f.change('nickname', 'KEEP-TEXT-EDIT');
  await act(async () => { await f.renderer.root.findAllByType('input').find((node) => node.props.type === 'file').props.onChange({ target: { files: [{ type: 'image/png', size: 123 }], value: 'selected' } }); });
  assert.equal(f.renderer.root.findAllByType('canvas').length, 1);
  await act(async () => { button(f.renderer, 'Отменить замену фото').props.onClick(); });
  assert.equal(closed, true); assert.equal(f.renderer.root.findAllByType('canvas').length, 0);
  assert.equal(f.renderer.root.findAllByType('img').filter((node) => node.props.alt === 'Ваше фото игрока').length, 1);
  assert.equal(input(f.renderer, 'nickname').props.value, 'KEEP-TEXT-EDIT');
  assert.equal(button(f.renderer, 'Сохранить профиль').props.disabled, false);
  await f.submit(); assert.equal(uploads, 0); assert.equal(f.state.saves.length, 1);
  assert.equal(f.state.saves[0].profile.photoAssetId, 'ownerA-photo');
  assert.equal(f.state.saves[0].profile.nickname, 'KEEP-TEXT-EDIT');
});

test('verifier UI-UNAVAILABLE-01: context failure shows CS2 public form metadata with optional FIO and disables all private actions', async (t) => {
  const f = await fixture(t, { contextFailure: failed('invalid_response', 503) });
  assert.deepEqual(f.state.contextCalls, ['cs']); assert.equal(f.state.sessionCalls, 0);
  assert.equal(f.state.meCalls.length, 0); assert.equal(f.state.photoCalls, 0); assert.equal(f.state.saves.length, 0);
  assert.equal(f.renderer.root.findAllByType('article').filter((node) => node.props.className === 'player-card').length, 1);
  assert.equal(input(f.renderer, 'name').props.required, false);
  assert.match(text(input(f.renderer, 'name').parent), /ФИОНеобязательно/);
  for (const name of ['nickname', 'name', 'city', 'steam']) assert.equal(input(f.renderer, name).props.value, '');
  assert.equal(button(f.renderer, 'Войти через Telegram').props.disabled, true);
  assert.equal(button(f.renderer, 'Войти через VK').props.disabled, true);
  assert.equal(button(f.renderer, 'Сохранить профиль').props.disabled, true);
  const isDisabled = (node) => {
    for (let current = node; current; current = current.parent) {
      if ((current.type === 'input' || current.type === 'fieldset') && current.props.disabled) return true;
    }
    return false;
  };
  const inputs = f.renderer.root.findAllByType('input');
  assert.ok(inputs.some((node) => node.props.type === 'file'));
  assert.ok(inputs.every(isDisabled), 'upload/text controls must be disabled by their fieldset');
  const renderedText = text(f.renderer.root);
  assert.match(renderedText, /CS2/); assert.match(renderedText, /Сервис профиля ещё не подключён/);
  assert.doesNotMatch(renderedText, /ownerA|ownerA-photo|ПРОФИЛЬ СОХРАНЁН|Все изменения сохранены/);
  assert.equal(f.renderer.root.findAllByType('img').filter((node) => node.props.alt === 'Ваше фото игрока').length, 0);
});

test('verifier UI-UNAVAILABLE-02: unknown Dis with failed context never falls back to CS2 or invents a profile', async (t) => {
  const f = await fixture(t, { search: '?Dis=unsupported', contextFailure: failed('invalid_discipline', 400) });
  assert.deepEqual(f.state.contextCalls, ['unsupported']); assert.equal(f.state.sessionCalls, 0);
  assert.equal(f.state.meCalls.length, 0); assert.equal(f.state.photoCalls, 0); assert.equal(f.state.saves.length, 0);
  assert.equal(f.renderer.root.findAllByType('form').length, 0);
  assert.equal(f.renderer.root.findAllByType('article').filter((node) => node.props.className === 'player-card').length, 0);
  assert.doesNotMatch(text(f.renderer.root), /CS2|ownerA|ПРОФИЛЬ СОХРАНЁН/);
});
