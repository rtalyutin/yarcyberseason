import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

let vite, PlayerIntakePage;
before(async () => {
  vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  PlayerIntakePage = (await vite.ssrLoadModule('/src/components/PlayerIntakePage.jsx')).default;
});
after(async () => { await vite?.close(); });
const defer = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const text = (node) => typeof node === 'string' ? node : node.children?.map(text).join('') || '';
const findInput = (f, name) => f.renderer.root.findAllByType('input').find((node) => node.props.name === name);
const sendButton = (f) => f.renderer.root.findAllByType('button').find((node) => node.props.type === 'submit');
const failed = (code, status) => Object.assign(new Error(`synthetic ${code}`), { code, status });
const bytes = Buffer.from([255, 216, 255, 224, 0, 13, 10, 128, 254, 255, 217]);

async function fixture(t, { search = '?Dis=cs', available = true, contextFailure = null, defaultFetch = null } = {}) {
  const previous = { window: globalThis.window, document: globalThis.document, decode: globalThis.createImageBitmap,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT, fetch: globalThis.fetch };
  const listeners = new Map();
  const forbidden = () => assert.fail('anonymous intake must not access browser identity/storage');
  globalThis.window = { location: { search }, addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn);
  }, removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  get localStorage() { return forbidden(); }, get sessionStorage() { return forbidden(); }, open: forbidden };
  globalThis.document = { get cookie() { return forbidden(); }, set cookie(_) { forbidden(); } };
  if (defaultFetch) globalThis.fetch = defaultFetch;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const state = { calls: [], prepareImpl: null, completeImpl: null, readImpl: null, uploadImpl: null,
    decodeImpl: null, encodes: 0, closed: 0, latestRequest: null };
  const waiting = new Map();
  const recordCall = (...call) => { state.calls.push(call); waiting.get(call[0])?.resolve(); };
  const waitForCall = (name) => {
    if (state.calls.some((call) => call[0] === name)) return Promise.resolve();
    const gate = defer(); waiting.set(name, gate); return gate.promise;
  };
  globalThis.createImageBitmap = async (file) => {
    if (state.decodeImpl) return state.decodeImpl(file);
    let closed = false; return { width: 200, height: 100, close() { if (!closed) { state.closed++; closed = true; } } };
  };
  const photo = new Blob([bytes], { type: 'image/jpeg' });
  const api = {
    context: async (code) => { recordCall('context', code); if (contextFailure) throw contextFailure;
      return { mode: 'anonymous-direct-s3', available, discipline: { code, label: 'CS2' } }; },
    prepare: async (request, signal) => { recordCall('prepare', request, signal); state.latestRequest = request;
      if (state.prepareImpl) return state.prepareImpl(request, signal);
      return { requestId: request.requestId, ticket: 'synthetic-ticket', ticketExpiresAt: new Date(Date.now() + 900_000).toISOString(),
        upload: { url: 'https://synthetic.s3.twcstorage.ru/private/player-profiles/v1/staging/p.jpg', method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' }, expiresAt: new Date(Date.now() + 300_000).toISOString() } }; },
    upload: async (prepared, blob, signal) => { recordCall('upload', prepared, blob, signal); if (state.uploadImpl) return state.uploadImpl(prepared, blob, signal); },
    complete: async (prepared, signal) => { recordCall('complete', prepared, signal); if (state.completeImpl) return state.completeImpl(prepared, signal);
      return { status: 'finalized', requestId: prepared.requestId, photo: { filename: '??-nick.jpg', contentType: 'image/jpeg', width: 1024, height: 1024,
        size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
        readUrl: 'https://synthetic.s3.twcstorage.ru/private/player-profiles/v1/photos/%3F%3F-nick.jpg' } }; },
    read: async (result, signal) => { recordCall('read', result, signal); if (state.readImpl) return state.readImpl(result, signal); return photo; },
    session: forbidden, me: forbidden, login: forbidden, start: forbidden,
  };
  const encoder = async () => { state.encodes++; return photo; };
  let renderer, currentSearch = search;
  const create = () => TestRenderer.create(React.createElement(PlayerIntakePage, { client: defaultFetch ? undefined : api, initialSearch: currentSearch, photoEncoder: encoder }), {
    createNodeMock(element) { if (element.type !== 'canvas') return null;
      const context = Object.fromEntries(['save', 'fillRect', 'scale', 'translate', 'rotate', 'drawImage', 'restore'].map((name) => [name, () => {}]));
      return { getContext: () => context }; },
  });
  await act(async () => { renderer = create(); });
  t.after(async () => { await act(async () => renderer.unmount()); globalThis.window = previous.window; globalThis.document = previous.document;
    globalThis.createImageBitmap = previous.decode; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act; globalThis.fetch = previous.fetch; });
  const f = { get renderer() { return renderer; }, state, api, photo,
    change: async (name, value) => { await act(async () => { findInput(f, name).props.onChange({ target: { value } }); }); },
    choose: async () => { await act(async () => { await renderer.root.findAllByType('input').find((node) => node.props.type === 'file').props.onChange({ target: { files: [{ type: 'image/png', size: 111 }], value: 'synthetic' } }); }); },
    submit: async () => { await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); },
    startSubmit: async (stage = 'upload') => { let pending; const entered = waitForCall(stage);
      await act(async () => { pending = renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); await entered; }); return { pending }; },
    navigate: async (next) => { currentSearch = next; await act(async () => { renderer.update(React.createElement(PlayerIntakePage, { client: api, initialSearch: currentSearch, photoEncoder: encoder })); }); },
    remount: async () => { await act(async () => renderer.unmount()); await act(async () => { renderer = create(); }); },
  };
  return f;
}

test('intake verifier UI-01: exactly nickname/optional FIO/photo, no login or identity read, mandatory pair gates submit', async (t) => {
  const f = await fixture(t);
  assert.deepEqual(f.renderer.root.findAllByType('input').filter((n) => n.props.type !== 'range').map((n) => n.props.type === 'file' ? 'photo' : n.props.name).sort(), ['name', 'nickname', 'photo']);
  assert.equal(findInput(f, 'name').props.required, false); assert.equal(findInput(f, 'nickname').props.required, true);
  assert.match(text(findInput(f, 'name').parent), /ФИОНеобязательно/);
  assert.equal(f.renderer.root.findAllByType('button').some((n) => /Войти|Привязать/.test(text(n))), false);
  assert.deepEqual(f.state.calls.map((c) => c[0]), ['context']); assert.equal(sendButton(f).props.disabled, true);
  await f.change('nickname', 'nick'); assert.equal(sendButton(f).props.disabled, true);
  await f.choose(); assert.equal(sendButton(f).props.disabled, false);
  await f.change('nickname', '   '); assert.equal(sendButton(f).props.disabled, true);
});

test('intake verifier UI-02: finalized receipt alone is insufficient; success appears only after read, then no edit and reload is empty', async (t) => {
  const f = await fixture(t), gate = defer(); f.state.readImpl = async () => gate.promise;
  await f.change('nickname', 'nick'); await f.choose(); const { pending } = await f.startSubmit('read');
  assert.ok(f.state.calls.some((c) => c[0] === 'complete')); assert.ok(f.state.calls.some((c) => c[0] === 'read'));
  assert.doesNotMatch(text(f.renderer.root), /Карточка отправлена/);
  await act(async () => { gate.resolve(f.photo); await pending; });
  assert.match(text(f.renderer.root), /Карточка отправлена/); assert.equal(sendButton(f), undefined);
  assert.ok(f.renderer.root.findAllByType('fieldset').every((n) => n.props.disabled));
  assert.equal(f.state.closed, 1); assert.equal(f.renderer.root.findAllByType('canvas').length, 0);
  await f.remount(); assert.equal(findInput(f, 'nickname').props.value, ''); assert.equal(findInput(f, 'name').props.value, '');
  assert.equal(f.renderer.root.findAllByType('img').filter((n) => n.props.alt === 'Фото, полученное после сохранения').length, 0);
  assert.equal(f.state.calls.filter((c) => c[0] === 'prepare').length, 1);
});

test('intake verifier UI-03: unknown prepare retry keeps exact request/blob and encodes only once', async (t) => {
  const f = await fixture(t); await f.change('nickname', 'nick'); await f.choose();
  f.state.prepareImpl = async () => { throw failed('network_error'); };
  await f.submit(); assert.doesNotMatch(text(f.renderer.root), /Карточка отправлена/);
  assert.match(text(sendButton(f)), /Проверить загрузку/); assert.ok(f.renderer.root.findAllByType('fieldset').every((n) => n.props.disabled));
  const first = f.state.calls.find((c) => c[0] === 'prepare')[1]; f.state.prepareImpl = null;
  await f.submit();
  const prepares = f.state.calls.filter((c) => c[0] === 'prepare'); assert.equal(prepares.length, 2); assert.strictEqual(prepares[1][1], first);
  assert.equal(f.state.encodes, 1); assert.equal(f.state.calls.filter((c) => c[0] === 'upload').length, 1);
  assert.strictEqual(f.state.calls.find((c) => c[0] === 'upload')[2], f.photo);
  assert.match(text(f.renderer.root), /Карточка отправлена/);
});

test('intake verifier UI-04: failed final photo read offers same-operation retry without a new request or second upload', async (t) => {
  const f = await fixture(t); await f.change('nickname', 'nick'); await f.choose();
  f.state.readImpl = async () => { throw failed('read_mismatch'); };
  await f.submit(); assert.doesNotMatch(text(f.renderer.root), /Карточка отправлена/); assert.match(text(sendButton(f)), /Проверить загрузку/);
  f.state.readImpl = null; await f.submit();
  assert.deepEqual(['prepare', 'upload', 'complete', 'read'].map((name) => f.state.calls.filter((c) => c[0] === name).length), [1, 1, 2, 2]);
  assert.equal(f.state.encodes, 1); assert.match(text(f.renderer.root), /Карточка отправлена/);
});

test('intake verifier UI-05: unavailable context allows local preview but not send; unknown Dis gets no CS2 form', async (t) => {
  const f = await fixture(t, { contextFailure: failed('network_error') });
  await f.change('nickname', 'offline-draft'); await f.choose();
  assert.match(text(f.renderer.root), /offline-draft/); assert.equal(f.renderer.root.findAllByType('canvas').length, 1);
  assert.ok(f.renderer.root.findAllByType('fieldset').every((n) => !n.props.disabled)); assert.equal(sendButton(f).props.disabled, true);
  assert.deepEqual(f.state.calls.map((c) => c[0]), ['context']);
  await f.navigate('?Dis=unsupported'); assert.equal(f.renderer.root.findAllByType('form').length, 0);
  assert.equal(f.renderer.root.findAllByType('span').find((n) => n.props.className === 'player-discipline').children.join(''), 'ЯКС');
  assert.deepEqual(f.state.calls.map((c) => c[0]), ['context']); assert.equal(f.state.closed, 1);
});

test('intake verifier UI-06: stale decode is closed and late upload completion cannot populate another Dis', async (t) => {
  const f = await fixture(t), decode = defer(); f.state.decodeImpl = async () => decode.promise;
  let choosePending;
  await act(async () => { choosePending = f.renderer.root.findAllByType('input').find((n) => n.props.type === 'file').props.onChange({ target: { files: [{ type: 'image/png', size: 111 }], value: 'synthetic' } }); await Promise.resolve(); });
  await f.navigate('?Dis=unsupported');
  await act(async () => { decode.resolve({ width: 200, height: 100, close() { f.state.closed++; } }); await choosePending; });
  assert.equal(f.state.closed, 1); assert.equal(f.renderer.root.findAllByType('canvas').length, 0);
  f.state.decodeImpl = null; await f.navigate('?Dis=cs'); await f.change('nickname', 'old-discipline'); await f.choose();
  const upload = defer(); f.state.uploadImpl = async () => upload.promise;
  const { pending } = await f.startSubmit(); const uploadCall = f.state.calls.find((c) => c[0] === 'upload'); assert.ok(uploadCall);
  await f.navigate('?Dis=unsupported'); assert.equal(uploadCall[3].aborted, true);
  await act(async () => { upload.resolve(); await pending; });
  assert.doesNotMatch(text(f.renderer.root), /Карточка отправлена/);
  await f.navigate('?Dis=cs'); assert.equal(findInput(f, 'nickname').props.value, '');
  assert.equal(f.renderer.root.findAllByType('canvas').length, 0); assert.equal(sendButton(f).props.disabled, true);
});

test('intake verifier UI-07: default non-injected client uses existing backend without credentials and stays disabled when unavailable', async (t) => {
  const calls = [];
  const f = await fixture(t, { defaultFetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json({ mode: 'anonymous-direct-s3', available: false, discipline: { code: 'cs', label: 'CS2' } });
  } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://rtalyutin-tg-mcp-4776.twc1.net/api/player/v1/intake/context?Dis=cs');
  assert.equal(calls[0].options.credentials, 'omit'); assert.equal(calls[0].options.referrerPolicy, 'no-referrer');
  const headers = new Headers(calls[0].options.headers); assert.equal(headers.has('cookie'), false); assert.equal(headers.has('authorization'), false);
  await f.change('nickname', 'local-preview'); await f.choose();
  assert.match(text(f.renderer.root), /local-preview/); assert.equal(sendButton(f).props.disabled, true); assert.equal(calls.length, 1);
});
