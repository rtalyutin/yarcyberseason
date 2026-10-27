import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';

let server, TournamentDirectory, catalogue, navigation, App;
before(async () => {
  server = await createServer({ configFile: false, esbuild: { jsx: 'automatic' },
    define: { __YCS_DATA_VERSION__: '"qa"', __YCS_BUILD_GENERATED_AT__: '"2026-10-27T00:00:00Z"' },
    optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, preTransformRequests: false, hmr: false }, appType: 'custom' });
  ({ TournamentDirectory } = await server.ssrLoadModule('/src/components/TournamentDirectory.jsx'));
  catalogue = await server.ssrLoadModule('/src/data/tournaments/index.js');
  navigation = await server.ssrLoadModule('/src/lib/site-navigation.js');
  ({ App } = await server.ssrLoadModule('/src/App.jsx'));
});
after(async () => { await server?.close(); });

const text = (node) => typeof node === 'string' ? node : node.children?.map(text).join('') || '';
const cards = (renderer) => renderer.root.findAllByType('article').filter((node) => node.props.className === 'directory-card');
function render(element) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough(); let html = '';
    stream.on('data', (part) => { html += part; }); stream.on('end', () => resolve(html)); stream.on('error', reject);
    const output = renderToPipeableStream(element, { onAllReady() { output.pipe(stream); }, onError: reject });
  });
}
async function mount(t, url = '/tournaments') {
  const priorWindow = globalThis.window, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const listeners = new Map();
  const window = {
    location: new URL(url, 'https://example.test'),
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    history: Object.fromEntries(['pushState', 'replaceState'].map((method) => [method, (_, __, target) => { window.location = new URL(target, 'https://example.test'); }])),
  };
  globalThis.window = window; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(TournamentDirectory)); });
  t.after(async () => { await act(async () => renderer.unmount()); globalThis.window = priorWindow; globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct; });
  return { renderer, window,
    async change(node, value) { await act(async () => node.props.onChange({ target: { value } })); },
    async back(url) { window.location = new URL(url, 'https://example.test'); await act(async () => { for (const listener of listeners.get('popstate') || []) listener(); }); },
  };
}

test('every tournament has a direct catalogue route and contextual matches stay in its own tournament', async () => {
  const html = await render(React.createElement(TournamentDirectory));
  assert.equal((html.match(/class="directory-card"/g) || []).length, catalogue.tournaments.length);
  for (const item of catalogue.tournaments) {
    assert.ok(html.includes(`href="/tournaments/${item.slug}"`), item.slug);
    for (const path of [`/tournaments/${item.slug}`, `/tournaments/${item.slug}/matches/example`]) {
      const links = navigation.getSiteNavigation(path);
      assert.equal(links.find((item) => item.label === 'Турниры').href, '/tournaments');
      assert.ok(links.find((item) => item.label === 'Матчи').href.startsWith(`/tournaments/${item.slug}`), path);
    }
  }
});

test('catalogue filters, URL restoration and empty-state reset preserve the correct records', async (t) => {
  const f = await mount(t, '/tournaments?game=Dota+2');
  assert.equal(cards(f.renderer).length, 3);
  await f.change(f.renderer.root.findByType('input'), 'октября');
  assert.equal(cards(f.renderer).length, 1);
  assert.ok(text(cards(f.renderer)[0]).includes('октября'));
  await f.change(f.renderer.root.findAllByType('select')[1], 'active');
  assert.equal(cards(f.renderer).length, 0);
  const reset = f.renderer.root.findAllByType('button').find((node) => text(node) === 'Сбросить фильтры');
  await act(async () => reset.props.onClick());
  assert.equal(cards(f.renderer).length, 5);
  assert.equal(f.window.location.search, '');
  await f.back('/tournaments?game=Counter-Strike+2');
  assert.equal(cards(f.renderer).length, 2);
  assert.equal(f.renderer.root.findAllByType('select')[0].props.value, 'Counter-Strike 2');
});

test('catalogue follows replacement of the mutable live tournament record on rerender', async (t) => {
  const f = await mount(t);
  const original = catalogue.currentTournament;
  const replacement = { ...original, statusLabel: 'QA status updated' };
  try {
    catalogue.updateDotaTournament(replacement);
    await act(async () => f.renderer.update(React.createElement(TournamentDirectory)));
    assert.ok(text(f.renderer.toJSON()).includes('QA status updated'), 'new result/status record must be visible without changing filters');
  } finally { catalogue.updateDotaTournament(original); }
});

test('catalogue and archive render through shared app shell with reachable skip target and metadata', async () => {
  const { getPageMetadata } = await server.ssrLoadModule('/src/lib/page-metadata.js');
  for (const pathname of ['/tournaments', '/results']) {
    const html = await render(React.createElement(App, { initialPath: pathname }));
    assert.ok(html.includes('id="page-content"'));
    assert.ok(html.includes('href="#page-content"'));
    assert.ok(html.includes('class="tournament-directory"'));
    assert.equal(getPageMetadata(pathname).noindex, undefined);
    const built = await readFile(new URL(`../dist/client${pathname}/index.html`, import.meta.url), 'utf8');
    assert.ok(built.includes(`data-prerender-path="${pathname}"`));
    assert.ok(built.includes(`href="https://xn--90aiaibl0ahlel5n.xn--p1ai${pathname}"`));
  }
});

test('unknown tournament routes do not claim an unrelated current tournament', async () => {
  for (const pathname of ['/tournaments/missing/matches/missing', '/tournaments/missing/matchday']) {
    const html = await render(React.createElement(App, { initialPath: pathname }));
    assert.ok(!html.includes('site-tournament-context'), `${pathname}: unrelated tournament context`);
    assert.ok(html.includes('href="/tournaments"'), `${pathname}: missing catalogue recovery`);
  }
});

test('every built match contains its real matchup and result before client JavaScript', async () => {
  const { community } = await server.ssrLoadModule('/src/data/community.js');
  for (const match of community.matches.values()) {
    const pathname = `/tournaments/${match.tournamentSlug}/matches/${match.id}`;
    const html = await readFile(new URL(`../dist/client${pathname}/index.html`, import.meta.url), 'utf8');
    const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    assert.ok(heading, `${pathname}: static h1 is required`);
    assert.ok(!html.includes('Загружаем матч'), `${pathname}: suspense fallback leaked into publication`);
    assert.ok(html.includes('data-match-theme="cs2"'), `${pathname}: real match component missing`);
    if (match.result.score) {
      assert.ok(html.includes(match.result.score.join(' : ')), `${pathname}: published series score missing`);
    } else {
      assert.ok(html.includes('— : —'), `${pathname}: unknown score must stay unknown`);
    }
    assert.ok(html.includes(`href="/tournaments/${match.tournamentSlug}"`), `${pathname}: parent tournament unavailable`);
  }
});
