import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import tournament from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };
import { getTournamentOutcome, getTournamentModel } from '../src/lib/tournament.js';
import { buildHomeContent } from '../src/lib/home-content.js';
import { loadHomeContent } from '../src/data/home-content.js';
import { currentTournament, nextTournament, archivedTournaments, updateDotaTournament } from '../src/data/tournaments/index.js';
import { projectContent } from '../src/data/project-content.js';
import { loadMiniAppModel, loadArchivedModels } from '../src/telegram/data/load.js';
import { resolveMiniAppLocation, serializeMiniAppRoute, tournamentRoute } from '../src/telegram/contracts.js';
import { applyDotaSnapshot } from '../src/lib/dota-results.js';

async function components(path) {
  const bundle = await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom'], loader: { '.css': 'empty' } });
  const result = { exports: {} };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), result, result.exports);
  return result.exports;
}
const { SeasonFinale } = await components('src/components/SeasonFinale.jsx');
const { HomeScreen, TournamentScreen } = await components('src/telegram/MiniApp.jsx');
const { TournamentNavigator } = await components('src/components/TournamentNavigator.jsx');
const { getPageMetadata } = await components('src/lib/page-metadata.js');
const markup = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const allMatches = (data) => data.stages.flatMap((stage) => (stage.rounds || [{ matches: stage.matches || [] }]).flatMap((round) => round.matches));

test('confirmed BO5 maps establish Leto 3:0 despite fewer kills on the third map', () => {
  const outcome = getTournamentOutcome(tournament);
  assert.equal(outcome.champion, 'Team Leto');
  assert.deepEqual(outcome.placements.map(({ position, team }) => [position, team]), [[1, 'Team Leto'], [2, 'Easy Gaming'], [3, 'Mi Ne Pushim!']]);
  const final = outcome.final;
  assert.deepEqual([final.team1, final.score1, final.score2, final.team2, final.bestOf, final.seriesId], ['Team Leto', 3, 0, 'Easy Gaming', 'BO5', 1159619]);
  assert.deepEqual(final.maps.map((map) => [map.matchId, map.kills1, map.kills2, map.durationSeconds]), [
    ['9061493228', 39, 26, 2871], ['9061646304', 31, 7, 1125], ['9061715579', 34, 49, 3747],
  ]);
  assert.ok(final.maps.every((map) => map.winnerTeamId === final.team1Id));
  assert.equal(getTournamentModel(tournament).finishedCount, 47);
  assert.equal(getTournamentModel(tournament).defaultSection, 'results');
  assert.ok(tournament.timeline.every((item) => item.state === 'completed'));
});

test('both homes and Mini App results show the same champion, podium and final links', () => {
  const content = loadHomeContent();
  const model = loadMiniAppModel();
  const web = markup(SeasonFinale, { content });
  const mini = markup(HomeScreen, { model, content, archives: loadArchivedModels(), navigate() {} });
  const results = markup(TournamentScreen, { model, route: tournamentRoute('results'), navigate() {} });
  const webResults = markup(TournamentNavigator, { tournament, navigate() {} });
  for (const html of [web, mini, results, webResults]) {
    for (const team of ['Team Leto', 'Easy Gaming', 'Mi Ne Pushim!']) assert.ok(html.includes(team), team);
    assert.doesNotMatch(html, /Следующий эфир|Регистрация закрыта|Итог грандфинала ожидает публикации/);
  }
  for (const html of [web, mini]) {
    assert.match(html, /Счёт серии 3:0/);
    assert.match(html, /dota2-autumn-2026\/matches\/final-1/);
    assert.match(html, /section=mvp/);
  }
  assert.match(results, /Счёт серии<\/span><strong>3:0/);
  assert.match(mini, /Партнёры турнира.*Партнёры финала.*При поддержке/s);
  assert.doesNotMatch(mini, /подарки выданы|призы вручены/i);
});

test('missing results remain pending without an invented champion or final score', () => {
  const pending = structuredClone(tournament);
  const final = allMatches(pending).find((match) => match.id === 'final-1');
  final.resultConfirmed = false;
  pending.results.placements = [{ position: 3, team: 'Mi Ne Pushim!' }];
  const content = buildHomeContent({ featuredTournament: pending, seasonTournament: pending, archives: [pending], project: projectContent });
  const html = markup(SeasonFinale, { content });
  assert.equal(content.outcome.champion, null);
  assert.equal(content.broadcast.score, null);
  assert.match(html, /Итог грандфинала ожидает публикации/);
  assert.match(html, /value="3"/);
  assert.doesNotMatch(html, /ПОБЕДИТЕЛЬ ТУРНИРА|Счёт серии 3:0/);
});

test('catalog refresh keeps the latest completed season featured until a real announcement', () => {
  const baseline = currentTournament;
  const archiveBinding = archivedTournaments;
  assert.equal(currentTournament.id, tournament.id);
  assert.equal(nextTournament, null);
  assert.equal(archivedTournaments[0].id, tournament.id);
  const announced = { ...structuredClone(baseline), status: 'upcoming', results: undefined };
  try {
    updateDotaTournament(announced);
    assert.equal(nextTournament, announced);
    assert.equal(archivedTournaments.some((entry) => entry.id === tournament.id), false);
    updateDotaTournament(baseline);
    assert.equal(archivedTournaments, archiveBinding);
    assert.equal(archivedTournaments[0], baseline);
    assert.equal(nextTournament, null);
  } finally { updateDotaTournament(baseline); }
});

test('older snapshots with no final preserve the confirmed final and technical maps', () => {
  const before = structuredClone(tournament);
  const snapshot = { schemaVersion: 1, tournamentId: tournament.id, leagueId: tournament.leagueId, revision: 1, updatedAt: '2026-10-24T00:00:00Z', matches: {} };
  const updated = applyDotaSnapshot(tournament, snapshot);
  for (const id of ['final-1', 'lower-4', 'dota-autumn-swiss-r2-08']) {
    assert.deepEqual(allMatches(updated).find((match) => match.id === id), allMatches(before).find((match) => match.id === id));
  }
  assert.deepEqual(tournament, before);
});

test('completed Mini App opens results by default and explicit overview survives a reload', () => {
  const availableSections = loadMiniAppModel().sections.map(({ id }) => id);
  assert.equal(resolveMiniAppLocation({ pathname: '/tg/tournament', availableSections }).route.section, 'results');
  for (const section of availableSections) {
    const route = tournamentRoute(section);
    const url = new URL(serializeMiniAppRoute(route), 'https://test.invalid');
    assert.deepEqual(resolveMiniAppLocation({ pathname: url.pathname, search: url.search, availableSections }).route, route);
  }
});

test('homepage metadata and the legacy next alias agree with the finished season', () => {
  assert.match(getPageMetadata('/').title, /Team Leto — чемпион/);
  assert.match(getPageMetadata('/').description, /3:0/);
  assert.equal(getPageMetadata('/tournaments/next').canonicalPath, '/tournaments/dota2-autumn-2026');
});
