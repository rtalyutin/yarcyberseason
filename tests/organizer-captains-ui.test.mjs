import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('organizer aliases expose only the login shell and stay outside indexing', async () => {
  const server = await createServer({ configFile: false, define: { __YCS_DATA_VERSION__: '"test-data-version"', __YCS_BUILD_GENERATED_AT__: '"2026-10-08T00:00:00Z"' }, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  try {
    const { App } = await server.ssrLoadModule('/src/App.jsx');
    const { getPageMetadata } = await server.ssrLoadModule('/src/lib/page-metadata.js');
    for (const path of ['/org', '/orgs', '/org/']) {
      const html = renderToStaticMarkup(React.createElement(App, { initialPath: path }));
      assert.match(html, /Доступ организаторов/);
      assert.doesNotMatch(html, /orgs-captain-registry/);
      assert.doesNotMatch(html, /Страница не найдена/);
      assert.equal(getPageMetadata(path).noindex, true);
      assert.equal(getPageMetadata(path).canonicalPath, '/org');
    }
  } finally { await server.close(); }
});

test('organizer activity keeps the agreed time during a new proposal and shows claims without chat', async () => {
  const server = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  try {
    const { CaptainActivity } = await server.ssrLoadModule('/src/components/OrganizerCaptains.jsx');
    const html = renderToStaticMarkup(React.createElement(CaptainActivity, { matches: [{
      match: { id: 'fixture', team1: { id: 'a', name: 'Alpha' }, team2: { id: 'b', name: 'Beta' }, round: 'Тур 1', bestOf: 'BO3' },
      agreed: { startsAt: '2026-10-10T15:00:00Z', agreedAt: '2026-10-09T12:00:00Z' },
      proposal: { startsAt: '2026-10-10T16:30:00Z', confirmedTeamIds: ['a'] },
      resultClaims: [{ id: 'claim', teamId: 'b', score: [2, 1], comment: '<script>result</script>', createdAt: '2026-10-10T19:00:00Z' }],
      messages: [{ id: 'private', teamId: 'a', text: 'Private captain conversation', createdAt: '2026-10-09T12:00:00Z' }],
    }] }));
    assert.match(html, /Время согласовано/);
    assert.match(html, /18:00 МСК/);
    assert.match(html, /19:30 МСК/);
    assert.match(html, /Ожидает подтверждения · 1\/2/);
    assert.match(html, /Подтвердили: Alpha/);
    assert.match(html, /2 : 1/);
    assert.match(html, /&lt;script&gt;result&lt;\/script&gt;/);
    assert.doesNotMatch(html, /Private captain conversation|<script>/);
  } finally { await server.close(); }
});
