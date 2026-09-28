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
      for (const entry of team.entries) {
        const entryHtml = html.split(`data-tournament-id="${entry.tournament.id}"`)[1]?.split('</div>')[0];
        assert.ok(entryHtml, `${team.id}/${entry.tournament.id}`);
        if (entry.roster) {
          assert.equal((entryHtml.match(/<li>/g) || []).length, entry.roster.members.length);
          for (const member of entry.roster.members) {
            const escapedName = renderToStaticMarkup(React.createElement('strong', null, member.name));
            assert.ok(entryHtml.includes(escapedName), member.name);
          }
          assert.ok(entryHtml.includes(`Источник: ${new URL(entry.roster.source.url).hostname}`));
          assert.ok(entryHtml.includes(`href="${entry.roster.source.url}"`));
        } else {
          assert.ok(entryHtml.includes('Состав на этот турнир не опубликован.'));
          assert.ok(!entryHtml.includes('community-roster-list'));
        }
      }
    }
    for (const [oldId, teamId] of community.teamAliases) {
      const oldHtml = renderToStaticMarkup(React.createElement(TeamPage, { teamId: oldId }));
      const canonicalHtml = renderToStaticMarkup(React.createElement(TeamPage, { teamId }));
      assert.equal(oldHtml, canonicalHtml, oldId);
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
    const { TournamentNavigator } = await server.ssrLoadModule('/src/components/TournamentNavigator.jsx');
    const { nextTournament } = await server.ssrLoadModule('/src/data/tournaments/index.js');
    const tournament = renderToStaticMarkup(React.createElement(TournamentNavigator, {
      tournament: nextTournament,
      renderStage: () => null,
      renderRewards: () => null,
    }));
    assert.ok(tournament.includes('Заявленные команды'));
    assert.ok(tournament.includes('Регистрация закрыта — набрано 16 команд'));
    assert.ok(!tournament.includes('forms.yandex.ru'));
    assert.ok(!tournament.includes('Ссылка на чат появится позже'));
  } finally { globalThis.window = previousWindow; await server.close(); }
});
