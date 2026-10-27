import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { createServer } from 'vite';

function rendered(element) {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    let html = '';
    output.on('data', (chunk) => { html += chunk; });
    output.on('end', () => resolve(html));
    output.on('error', reject);
    const stream = renderToPipeableStream(element, {
      onAllReady() { stream.pipe(output); },
      onError: reject,
    });
  });
}

// Render the actual route component, including its lazy discipline-specific loader.
// This catches feature loss at the routing boundary that model tests cannot see.
test('changing presentation preserves match maps, statistics, awards and tournament navigation', async () => {
  const server = await createServer({ configFile: false, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  try {
    const { MatchPage } = await server.ssrLoadModule('/src/components/CommunityPages.jsx');
    const fixtures = [
      { tournamentSlug: 'dota2-autumn-2026', matchId: 'final-1', score: '3 : 0', maps: 5, dota: true },
      { tournamentSlug: 'cs2-august-2026', matchId: 'cs2-aug-grand-final', score: '2 : 3', maps: 5, dota: false },
    ];
    for (const fixture of fixtures) {
      let expected;
      for (const theme of ['cs2', 'dota2', 'corporate']) {
        const html = await rendered(React.createElement(MatchPage, { ...fixture, theme }));
        assert.ok(html.includes(`data-match-theme="${theme}"`), `${fixture.matchId}/${theme}`);
        assert.ok(html.includes(fixture.score), `${fixture.matchId}/${theme}: score`);
        assert.ok(html.includes('Составы и статистика'), `${fixture.matchId}/${theme}: statistics`);
        assert.ok(html.includes('Поделиться'), `${fixture.matchId}/${theme}: share`);
        assert.ok(html.includes('Скачать результат'), `${fixture.matchId}/${theme}: export`);
        assert.ok(html.includes(`href="/tournaments/${fixture.tournamentSlug}"`));
        assert.ok(html.includes('href="/tournaments"'));
        assert.equal((html.match(/class="mc-map-tile/g) || []).length, fixture.maps);
        assert.equal(html.includes('id="mc-series-mvp-title"'), fixture.dota);
        const behavior = [...html.matchAll(/<(?:button|select)\b[^>]*>[\s\S]*?<\/(?:button|select)>/g)]
          .map(([control]) => control.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
        if (expected) assert.deepEqual(behavior, expected, `${fixture.matchId}: theme changed controls`);
        else expected = behavior;
      }
    }
    const { community } = await server.ssrLoadModule('/src/data/community.js');
    const technical = [...community.matches.values()].find((match) => match.discipline === 'Dota 2' && match.result.technical);
    assert.ok(technical, 'actual technical fixture required');
    for (const theme of ['cs2', 'dota2', 'corporate']) {
      const html = await rendered(React.createElement(MatchPage, { tournamentSlug: technical.tournamentSlug, matchId: technical.id, theme }));
      assert.ok(html.includes('За технический результат MVP не начисляется.'));
      assert.ok(!html.includes('id="mc-stats-title"'), 'technical result must not manufacture played statistics');
    }
    const missing = await rendered(React.createElement(MatchPage, { tournamentSlug: 'missing', matchId: 'missing', theme: 'corporate' }));
    assert.ok(missing.replace(/<!--.*?-->/g, '').includes('Матч не найден'));
    assert.ok(missing.includes('href="/tournaments"'));
  } finally { await server.close(); }
});
