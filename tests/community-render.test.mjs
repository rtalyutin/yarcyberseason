import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('all published team and match templates render with real JSON', async () => {
  // Transform JSX without starting an HTTP server or a browser.
  const server = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  const previousWindow = globalThis.window;
  globalThis.window = { location: { origin: 'https://example.test', pathname: '/', search: '', hash: '' } };
  try {
    const { TeamPage, MatchPage } = await server.ssrLoadModule('/src/components/CommunityPages.jsx');
    const { community } = await server.ssrLoadModule('/src/data/community.js');
    for (const team of community.teams.values()) {
      const html = renderToStaticMarkup(React.createElement(TeamPage, { teamId: team.id }));
      assert.ok(html.includes('Следить за командой'), team.id);
      assert.ok(html.includes(`/calendars/teams/${team.id}.ics`), team.id);
      assert.ok(!html.includes('<form'), team.id);
    }
    for (const match of community.matches.values()) {
      const html = renderToStaticMarkup(React.createElement(MatchPage, { tournamentSlug: match.tournamentSlug, matchId: match.id }));
      assert.ok(html.includes('Скопировать ссылку'), match.id);
      assert.ok(html.includes('Скачать карточку результата'), match.id);
      assert.ok(!html.includes('<iframe'), match.id);
    }
    const final = renderToStaticMarkup(React.createElement(MatchPage, { tournamentSlug: 'cs2-august-2026', matchId: 'cs2-aug-grand-final' }));
    assert.ok(final.includes('Счёт отдельных карт не опубликован'));
    assert.ok(final.includes('2026'));
    const disputed = renderToStaticMarkup(React.createElement(MatchPage, { tournamentSlug: 'dota2-main-2026', matchId: 'dota-main-group-16' }));
    assert.match(disputed, /Опубликованный счёт: 1:1/);
    assert.match(disputed, /disabled=""/);
    assert.ok(renderToStaticMarkup(React.createElement(TeamPage, { teamId: 'missing' })).includes('Команда не найдена'));
    assert.ok(renderToStaticMarkup(React.createElement(MatchPage, { tournamentSlug: 'missing', matchId: 'missing' })).includes('Матч не найден'));
    const { CommunitySearch } = await server.ssrLoadModule('/src/components/CommunityLinks.jsx');
    const search = renderToStaticMarkup(React.createElement(CommunitySearch));
    assert.ok(search.includes('Ссылка на чат появится позже'));
    assert.ok(search.includes('href="https://forms.yandex.ru/u/6a84776d5056903d3b881f6b"'));
    assert.ok(search.includes('Зарегистрироваться как соло-игрок'));
    assert.ok(!search.includes('Найти команду ↗'));
    assert.ok(!search.includes('Нужен игрок ↗'));
  } finally { globalThis.window = previousWindow; await server.close(); }
});
