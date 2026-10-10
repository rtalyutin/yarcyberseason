import test from 'node:test';
import assert from 'node:assert/strict';
import { getMatchBroadcastLinks } from '../src/lib/broadcast-links.js';
import { getHomeBroadcastContent } from '../src/lib/home-content.js';
import { buildOrganizerTable } from '../src/lib/organizer-table.js';
import autumn from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };

const twitch = 'https://www.twitch.tv/yarcyberseason';
const vk = 'https://vk.com/yarcyberseason';
const legacy = { broadcastUrl: twitch, streamUrl: vk, note: 'Трансляция: Twitch и ВК', casters: [{ url: twitch }] };
const links = (broadcastLinks, status = 'scheduled') => getMatchBroadcastLinks({ ...legacy, status, broadcastLinks });

test('published migration preserves the confirmed opening URLs and sporting result', () => {
  const match = autumn.stages[0].rounds[0].matches.find((entry) => entry.id === 'dota-autumn-swiss-r1-04');
  assert.deepEqual(match.broadcastLinks, { twitch, vk });
  assert.equal(Object.hasOwn(match, 'broadcastUrl'), false);
  assert.equal(Object.hasOwn(match, 'streamUrl'), false);
  assert.equal(match.status, 'completed');
  assert.equal(match.resultConfirmed, true);
  assert.deepEqual([match.score1, match.score2], [1, 0]);
  assert.equal(match.scheduledAt, '2026-10-09T20:30:00+03:00');
  assert.equal(match.casters[0].name, '@queleez');
});

test('a match without populated canonical URLs has no broadcast links or legacy fallback', () => {
  assert.deepEqual(getMatchBroadcastLinks(legacy), []);
  for (const empty of [null, {}, { twitch: '', vk: ' \n ' }, [], 'https://example.com',
    { twitch: 'http://example.com', vk: 'javascript:alert(1)' },
    { twitch: 'https://user:password@example.com', vk: 'not a URL' }]) {
    assert.deepEqual(links(empty), [], JSON.stringify(empty));
  }
});

test('each populated platform produces its own action independently of match status', () => {
  assert.deepEqual(links({ twitch }), [{ platform: 'twitch', label: 'Twitch', href: twitch }]);
  assert.deepEqual(links({ vk }), [{ platform: 'vk', label: 'VK', href: vk }]);
  for (const status of ['scheduled', 'live', 'completed', 'walkover', 'bye', 'unknown']) {
    assert.deepEqual(links({ vk, twitch }, status), [
      { platform: 'twitch', label: 'Twitch', href: twitch },
      { platform: 'vk', label: 'VK', href: vk },
    ]);
  }
});

const tournament = (match) => ({ id: 'fixture', slug: 'fixture', title: 'Fixture', discipline: 'Dota 2',
  homeBroadcastMatchIds: ['one'], stages: [{ id: 'swiss', title: 'Swiss', rounds: [{ id: 'r1', label: 'Тур 1',
    matches: [{ id: 'one', team1: 'A', team2: 'B', ...match }] }] }] });

test('home action uses canonical URLs only after an explicitly live status', () => {
  const data = tournament({ ...legacy, broadcastLinks: { twitch, vk }, status: 'scheduled', scheduledAt: '2000-01-01T20:00:00+03:00' });
  const match = data.stages[0].rounds[0].matches[0];
  assert.equal(getHomeBroadcastContent(data).state, 'scheduled');
  assert.equal(getHomeBroadcastContent(data).streamUrl, null);
  match.status = 'live';
  assert.equal(getHomeBroadcastContent(data).streamUrl, twitch);
  match.broadcastLinks = { vk };
  assert.equal(getHomeBroadcastContent(data).streamUrl, vk);
  delete match.broadcastLinks;
  assert.equal(getHomeBroadcastContent(data).streamUrl, null);
});

test('organizer projection carries both canonical links and isolates private overrides', () => {
  const data = tournament({ ...legacy, broadcastLinks: { twitch, vk }, status: 'scheduled' });
  const row = buildOrganizerTable([data]).rows[0];
  assert.equal(row.broadcast.url, twitch);
  assert.deepEqual(row.broadcast.links, getMatchBroadcastLinks(data.stages[0].rounds[0].matches[0]));
  const assigned = buildOrganizerTable([data], { matches: { 'fixture/one': { broadcast: { url: 'https://example.com/private-assignment' } } } }).rows[0];
  assert.equal(assigned.broadcast.url, 'https://example.com/private-assignment');
  assert.equal(getMatchBroadcastLinks(data.stages[0].rounds[0].matches[0])[0].href, twitch);
  delete data.stages[0].rounds[0].matches[0].broadcastLinks;
  assert.deepEqual(buildOrganizerTable([data]).rows[0].broadcast.links, []);
});
