import test from 'node:test';
import assert from 'node:assert/strict';
import { getMatchBroadcastLinks } from '../src/lib/broadcasts.js';
import { getHomeBroadcastBoard, getHomeBroadcastTitle, getTournamentBroadcasts } from '../src/lib/home-board.js';
import { buildHomeContent } from '../src/lib/home-content.js';
import { loadHomeContent } from '../src/data/home-content.js';
import { buildMiniAppModel } from '../src/telegram/data/model.js';
import { projectContent } from '../src/data/project-content.js';
import { currentTournament, updateDotaTournament, archivedTournaments } from '../src/data/tournaments/index.js';
import { syntheticFixtures } from './fixtures/telegram/fixtures.mjs';

const links = { twitch: 'https://www.twitch.tv/yarcyberseason', vk: 'https://vk.com/yarcyberseason' };
const assigned = (id, extra = {}) => ({ id, team1: 'Synthetic Alpha', team2: 'Synthetic Beta', status: 'scheduled', scheduledAt: '2026-10-09T20:30:00+03:00', broadcastLinks: { ...links }, ...extra });
const source = (...matches) => ({ discipline: 'Dota 2', stages: [{ id: 'synthetic', rounds: [{ matches }] }] });

test('only populated safe canonical match links create platform actions', () => {
  assert.deepEqual(getMatchBroadcastLinks({ broadcastLinks: links }), [
    { platform: 'twitch', label: 'Смотреть на Twitch', href: links.twitch },
    { platform: 'vk', label: 'Смотреть в VK Видео', href: links.vk },
  ]);
  for (const value of [undefined, null, {}, [], { twitch: ' ' }, { twitch: 'javascript:alert(1)', vk: 'https://user:pass@example.com' }]) {
    assert.deepEqual(getMatchBroadcastLinks({ broadcastLinks: value, streamUrl: links.twitch, broadcastUrl: links.vk, casters: ['Synthetic Caster'] }), []);
  }
});

test('publication and assignments control discovery; elapsed schedule never changes selection', () => {
  const first = assigned('earlier');
  const later = assigned('later', { scheduledAt: '2026-10-10T19:00:00+03:00' });
  const tournament = source(later, first, assigned('hidden', { published: false }), { id: 'timed-only', status: 'live', scheduledAt: '2026-10-09T17:00:00+03:00' });
  assert.deepEqual(getTournamentBroadcasts(tournament).map((match) => match.id), ['earlier', 'later']);
  const initial = getHomeBroadcastBoard(tournament);
  assert.equal(initial.match.id, 'earlier');
  assert.equal(initial.state, 'scheduled');
  assert.deepEqual(getHomeBroadcastBoard(structuredClone(tournament)), initial);
});

test('live priority, pending score hiding, confirmed completion and cancellation advance truthfully', () => {
  const first = assigned('earlier', { status: 'completed', resultConfirmed: false, score1: 1, score2: 0 });
  const later = assigned('later', { scheduledAt: '2026-10-10T19:00:00+03:00' });
  assert.equal(getHomeBroadcastBoard(source(first, { ...later, status: 'live' })).match.id, 'later');
  const pending = getHomeBroadcastBoard(source(first, later));
  assert.equal(pending.match.id, first.id);
  assert.equal(pending.state, 'pending');
  assert.equal(pending.score, null);
  for (const closed of [{ ...first, resultConfirmed: true }, { ...first, status: 'cancelled' }]) {
    assert.equal(getHomeBroadcastBoard(source(closed, later)).match.id, 'later');
    assert.equal(getHomeBroadcastBoard(source(closed)).state, 'unannounced');
    assert.equal(getHomeBroadcastBoard(source(closed)).match, null);
  }
});

test('opening headline is tied to the Moscow calendar date without inferred live state', () => {
  const tournament = source(assigned('dota-autumn-swiss-r1-04'));
  assert.equal(getHomeBroadcastTitle(tournament, new Date('2026-10-08T21:00:00Z')), 'Сегодня открываем сезон.');
  assert.equal(getHomeBroadcastTitle(tournament, new Date('2026-10-09T20:59:59Z')), 'Сегодня открываем сезон.');
  assert.equal(getHomeBroadcastTitle(tournament, new Date('2026-10-09T21:00:00Z')), 'Следующий эфир');
  assert.equal(getHomeBroadcastBoard(tournament).state, 'scheduled');
});

test('shared home projects current Dota, completed CS2, scoped partners and no invented facts', () => {
  const content = loadHomeContent(new Date('2026-10-11T08:00:00Z'));
  assert.equal(content.featuredTournament.id, 'dota2-autumn-2026');
  assert.equal(content.season.tournament.id, 'cs2-august-2026');
  assert.equal(content.season.finished, true);
  assert.equal(content.broadcast.state, 'completed');
  assert.equal(content.broadcast.match.id, 'final-1');
  assert.deepEqual(content.broadcast.score, [3, 0]);
  assert.deepEqual(content.broadcast.links, []);
  assert.equal(content.outcome.champion, 'Team Leto');
  assert.deepEqual(content.partners.map((partner) => partner.id), ['dodo-pizza', 'torrefacto', 'redragon']);
  assert.deepEqual(content.officialSupport.map((partner) => partner.id).sort(), ['fks-yao', 'minsport-yao']);
  const minimal = buildHomeContent({ featuredTournament: { ...currentTournament, prizeDistribution: undefined }, seasonTournament: archivedTournaments[0], archives: [], project: projectContent });
  assert.equal(minimal.facts.length, 1);
  assert.doesNotMatch(minimal.facts.join(' '), /undefined|null/);
});

test('a completed home never resurrects a historical stream after a clock change', () => {
  for (const now of [new Date('2026-10-11T08:00:00Z'), new Date('2026-12-13T08:00:00Z')]) {
    const content = loadHomeContent(now);
    assert.equal(content.broadcast.match.id, 'final-1');
    assert.equal(content.broadcast.state, 'completed');
    assert.equal(content.broadcast.actionSection, 'results');
    assert.deepEqual(content.broadcast.links, []);
  }
});

test('accepted tournament binding overlays are reflected on the next shared home projection', () => {
  const baseline = currentTournament;
  const overlay = structuredClone(baseline);
  overlay.status = "matches_live";
  delete overlay.results;
  const match = overlay.stages.flatMap((stage) => stage.rounds || [{ matches: stage.matches || [] }]).flatMap((round) => round.matches || []).find((item) => item.published !== false);
  match.status = 'live';
  match.resultConfirmed = false;
  match.broadcastLinks = { twitch: links.twitch };
  try {
    updateDotaTournament(overlay);
    const content = loadHomeContent();
    assert.equal(content.broadcast.match.id, match.id);
    assert.equal(content.broadcast.state, 'live');
    assert.equal(content.broadcast.links.length, 1);
  } finally { updateDotaTournament(baseline); }
});

test('Mini App match adapter reads canonical platforms, keeps replay and rejects legacy channel fallback', () => {
  const { tournament, registry } = structuredClone(syntheticFixtures.scheduledMatch);
  const match = tournament.stages[0].matches[0];
  match.broadcastLinks = links;
  match.streamUrl = 'https://example.com/wrong';
  match.broadcastUrl = 'https://example.com/wrong';
  match.replayUrl = 'https://example.com/replay';
  const model = buildMiniAppModel(tournament, registry, projectContent);
  assert.deepEqual(model.matches[0].links.map((action) => action.label), ['Смотреть на Twitch', 'Смотреть в VK Видео', 'Запись']);
  assert.ok(model.project.partners.some((partner) => partner.logoUrl === null));
  delete match.broadcastLinks;
  assert.deepEqual(buildMiniAppModel(tournament, registry, projectContent).matches[0].links.map((action) => action.label), ['Запись']);
});
