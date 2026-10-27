import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

let vite, TournamentNavigator, currentTournament;
before(async () => {
  vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  ({ TournamentNavigator } = await vite.ssrLoadModule('/src/components/TournamentNavigator.jsx'));
  ({ currentTournament } = await vite.ssrLoadModule('/src/data/tournaments/index.js'));
});
after(async () => { await vite?.close(); });

const nodeText = (node) => typeof node === 'string' ? node : node.children?.map(nodeText).join('') || '';
const sectionLinks = (renderer) => renderer.root.findAllByType('a').filter((node) => node.props.className === 'tn-section-link');
async function fixture(t, tournament = currentTournament, search = '') {
  const savedWindow = globalThis.window, savedAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const listeners = new Map();
  const historyWrites = [];
  const updateLocation = (path) => { fakeWindow.location = new URL(path, 'https://example.test'); };
  const fakeWindow = {
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    history: Object.fromEntries(['pushState', 'replaceState'].map((method) => [method, (_, __, path) => { historyWrites.push({ method, path }); updateLocation(path); }])),
  };
  updateLocation(`/tournaments/${tournament.slug}${search}`);
  globalThis.window = fakeWindow; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer;
  const props = { tournament, renderStage: (stage) => React.createElement('p', null, stage.title), renderRewards: () => null };
  await act(async () => { renderer = TestRenderer.create(React.createElement(TournamentNavigator, { ...props, theme: 'cs2' })); });
  t.after(async () => { await act(async () => renderer.unmount()); globalThis.window = savedWindow; globalThis.IS_REACT_ACT_ENVIRONMENT = savedAct; });
  const theme = async (value) => { await act(async () => renderer.update(React.createElement(TournamentNavigator, { ...props, theme: value }))); };
  const click = async (node, extra = {}) => {
    let prevented = false;
    await act(async () => node.props.onClick({ button: 0, preventDefault() { prevented = true; }, ...extra }));
    return prevented;
  };
  const pop = async (path) => { updateLocation(path); await act(async () => { for (const listener of listeners.get('popstate') || []) listener(); }); };
  return { renderer, theme, click, pop, fakeWindow, historyWrites };
}

test('all themes keep the same shareable sections, order, labels, and canonical catalogue escape', async (t) => {
  const f = await fixture(t);
  let baseline;
  for (const theme of ['cs2', 'dota2', 'corporate']) {
    await f.theme(theme);
    const links = sectionLinks(f.renderer).map((node) => ({ text: nodeText(node), href: node.props.href }));
    if (!baseline) baseline = links;
    else assert.deepEqual(links, baseline);
    assert.deepEqual(links.map(({ href }) => new URL(href, 'https://example.test').searchParams.get('section')), ['results', 'matches', 'participants', 'swiss', 'playoffs', 'mvp', 'info']);
    assert.ok(f.renderer.root.findAllByType('a').some((node) => node.props.href === '/tournaments' && nodeText(node) === 'Турниры'));
    assert.ok(f.renderer.root.findAllByType('a').some((node) => node.props.href === currentTournament.matchday.route));
  }
});

test('an unpublished schedule remains reachable and honest in every theme', async (t) => {
  const f = await fixture(t, { id: 'pending', slug: 'pending', title: 'Pending cup', discipline: 'Dota 2', stages: [], summary: 'Schedule pending' });
  for (const theme of ['cs2', 'dota2', 'corporate']) {
    await f.theme(theme);
    const active = sectionLinks(f.renderer).find((node) => node.props['aria-current'] === 'page');
    assert.equal(new URL(active.props.href, 'https://example.test').searchParams.get('section'), 'matches');
    assert.ok(nodeText(f.renderer.toJSON()).includes('Расписание ещё не опубликовано'));
    assert.ok(nodeText(f.renderer.toJSON()).includes('Время — МСК'));
  }
});

test('section links retain filters, honor modified clicks and restore via browser history', async (t) => {
  const f = await fixture(t, currentTournament, '?section=matches&phase=playoffs&q=Easy');
  const participants = () => sectionLinks(f.renderer).find((node) => new URL(node.props.href, 'https://example.test').searchParams.get('section') === 'participants');
  assert.equal(new URL(participants().props.href, 'https://example.test').searchParams.get('q'), 'Easy');
  assert.equal(await f.click(participants(), { ctrlKey: true }), false);
  assert.equal(f.historyWrites.length, 0);
  assert.equal(await f.click(participants()), true);
  assert.equal(f.fakeWindow.location.searchParams.get('phase'), 'playoffs');
  assert.equal(f.fakeWindow.location.searchParams.get('q'), 'Easy');
  await f.theme('dota2');
  assert.equal(sectionLinks(f.renderer).find((node) => node.props['aria-current'] === 'page'), participants());
  await f.pop(`/tournaments/${currentTournament.slug}?section=matches&phase=playoffs&q=Easy`);
  assert.equal(f.renderer.root.findByType('input').props.value, 'Easy');
  assert.equal(f.renderer.root.findAllByType('button').find((node) => node.props['aria-pressed'] === true).props['aria-pressed'], true);
});

test('search reports the filtered subset and clearing it preserves the selected phase across themes', async (t) => {
  const f = await fixture(t, currentTournament, '?section=matches&phase=playoffs&q=NO_MATCH_XYZ');
  for (const theme of ['cs2', 'dota2', 'corporate']) {
    await f.theme(theme);
    assert.ok(nodeText(f.renderer.toJSON()).includes('Найдено: 0 матчей. Показано: 0.'));
    assert.ok(nodeText(f.renderer.toJSON()).includes('Команда не найдена'));
  }
  const clear = f.renderer.root.findAllByType('button').find((node) => nodeText(node) === 'Очистить поиск');
  await f.click(clear);
  assert.equal(f.fakeWindow.location.searchParams.get('phase'), 'playoffs');
  assert.equal(f.fakeWindow.location.searchParams.has('q'), false);
  assert.ok(nodeText(f.renderer.toJSON()).includes('14 матчей'));
});


test('opening Matches without a phase includes Swiss and playoffs; explicit links retain their filter', async (t) => {
  const f = await fixture(t, currentTournament, '?section=matches');
  const selected = () => f.renderer.root.findAllByType('button').find((node) => node.props['aria-pressed'] === true);
  assert.ok(nodeText(selected()).includes('47'));
  assert.ok(nodeText(f.renderer.toJSON()).includes('47 матчей'));
  await f.pop(`/tournaments/${currentTournament.slug}?section=matches&phase=playoffs`);
  assert.ok(nodeText(selected()).includes('14'));
  assert.ok(nodeText(f.renderer.toJSON()).includes('14 матчей'));
});
