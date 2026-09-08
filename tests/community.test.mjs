import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { buildCommunityModel, normalizeResult, validateCommunity, teamSummary, matchPath, exactStart, upcomingMatches, matchDateLabel } from '../src/lib/community.js';
import { reconcilePublications, teamCalendar } from '../src/lib/calendar.js';
import worker from '../worker/index.js';

const read = (name) => JSON.parse(readFileSync(new URL('../' + name, import.meta.url)));
const tournaments = readdirSync(new URL('../src/data/tournaments/', import.meta.url)).filter((name) => name.endsWith('.json')).map((name) => read('src/data/tournaments/' + name));
const registry = read('src/data/teams.json');
const model = buildCommunityModel(tournaments, registry);
const current = tournaments.find((t) => t.id === 'cs2-august-2026');
const get = (id) => model.matches.get('cs2-august-2026/' + id);

test('migrated data preserves every original field and stable ID', () => {
  const ledger = read('docs/community/migration.json');
  assert.equal(model.matches.size, ledger.matches.length);
  for (const record of ledger.matches) {
    const match = model.matches.get(`${record.tournamentId}/${record.matchId}`);
    assert.ok(match);
    for (const [key, value] of Object.entries(record.original)) assert.deepEqual(match[key], value, `${record.matchId}.${key}`);
  }
  const shuffled = structuredClone(tournaments);
  shuffled.forEach((t) => t.stages.reverse());
  assert.deepEqual([...buildCommunityModel(shuffled, registry).matches.keys()].sort(), [...model.matches.keys()].sort());
  assert.deepEqual(validateCommunity(tournaments, registry), []);
});
test('BO1 rounds, series scores and final with missing maps remain distinct', () => {
  const single = get('cs2-r3-cipher-hunger');
  assert.deepEqual(single.result.series, [0, 1]);
  assert.deepEqual(single.result.maps[0].score, [5, 13]);
  const feb = model.matches.get('cs2-february-2026/cs2-group-01');
  assert.deepEqual(feb.result.series, [0, 1]); assert.equal(feb.result.maps.length, 0);
  const final = get('cs2-aug-grand-final');
  assert.deepEqual(final.result.series, [2, 3]); assert.equal(final.result.winnerSide, 2);
  assert.equal(final.result.maps.length, 0);
  assert.match(matchPath(final), /cs2-august-2026\/matches\/cs2-aug-grand-final$/);
});
test('no fictional opponents; confirmed identities span tournaments', () => {
  assert.equal(model.resolveTeam(current.id, 'Не заявленная команда'), null);
  assert.equal(get('cs2-r1-pivnaya-kega').team2Id, null);
  assert.ok(get('cs2-r2-saiten-hellwarriors').team2Id);
  assert.equal(model.resolveTeam(current.id, 'Без соперника'), null);
  assert.equal(model.resolveTeam(current.id, 'Resistance').id, model.resolveTeam('cs2-february-2026', 'Resistance').id);
  const renamed = structuredClone(registry), teamId = model.resolveTeam(current.id, 'PIVNAYA KEGA').id;
  renamed.teams.find((t) => t.id === teamId).name = 'Новое название';
  const next = buildCommunityModel(tournaments, renamed);
  assert.equal(next.teams.get(teamId).name, 'Новое название');
  assert.equal(next.matches.get(get('cs2-aug-grand-final').key).team2, 'PIVNAYA KEGA');
});
test('confirmed merges preserve all old links and count matches and tournaments once', () => {
  const original = read('docs/community/team-merges.json');
  assert.equal(model.teams.size, 42);
  assert.equal(model.teamAliases.size, 28);
  for (const merge of original.merges) {
    const team = model.getTeam(merge.teamId);
    for (const id of merge.sourceIds) assert.equal(model.getTeam(id), team, id);
    assert.equal(team.entries.length, 2, merge.name);
    const expected = [...model.matches.values()].filter((m) => m.team1Id === team.id || m.team2Id === team.id);
    assert.deepEqual(team.matches.map((m) => m.key).sort(), expected.map((m) => m.key).sort());
    assert.equal(new Set(team.matches.map((m) => m.key)).size, team.matches.length);
    assert.ok(team.matches.every((m) => m.team1Id !== m.team2Id));
    const summary = teamSummary(team);
    assert.ok(summary.opponents.every((o) => o.id !== team.id));
  }
  for (const tid of ['dota2-main-2026', 'dota2-qual-2026']) {
    assert.equal(model.resolveTeam(tid, 'Синергия'), model.resolveTeam(tid, 'Синергия ср'));
  }
  assert.equal(model.getTeam('missing'), null);
  for (const alias of [{ id: registry.teams[0].id, teamId: registry.teams[1].id }, { id: 'old', teamId: 'missing' }, { id: '../unsafe', teamId: registry.teams[0].id }]) {
    const broken = structuredClone(registry); broken.aliases.push(alias);
    assert.ok(validateCommunity(tournaments, broken).some((e) => e.includes('Invalid team alias')));
  }
});
test('draws and technical decisions do not become sporting wins', () => {
  const draw = normalizeResult({ status: 'completed', resultConfirmed: true, scoreKind: 'series', score1: 1, score2: 1, bestOf: 'BO2' }, 'Dota 2');
  assert.equal(draw.draw, true); assert.equal(draw.winnerSide, null);
  const team = { id: 'a', matches: [
    { team1Id: 'a', team2Id: 'b', result: draw },
    { team1Id: 'a', team2Id: null, result: normalizeResult({ status: 'bye', resultConfirmed: true, scoreKind: 'technical', score1: 1, score2: 0 }) },
  ] };
  const summary = teamSummary(team);
  assert.equal(summary.wins, 0); assert.equal(summary.draws, 1); assert.equal(summary.technical, 1);
  assert.equal(summary.opponents.length, 1);
});
test('unconfirmed and unknown scores cannot create cards or final statistics', () => {
  for (const status of ['scheduled', 'live', 'postponed', 'cancelled', 'unknown']) {
    const result = normalizeResult({ status, resultConfirmed: false, scoreKind: 'series', score1: 2, score2: 0 });
    assert.equal(result.score, null); assert.equal(result.canDownload, false);
  }
  const unknown = normalizeResult({ status: 'completed', resultConfirmed: true, scoreKind: 'unknown', score1: 13, score2: 5 });
  assert.equal(unknown.canDownload, false); assert.equal(unknown.series, null);
});
test('conflicting canonical records and final placements block publication', () => {
  const duplicate = structuredClone(tournaments);
  const t = duplicate.find((t) => t.id === current.id);
  t.stages[0].matches.push(structuredClone(t.stages[0].matches[0]));
  assert.ok(validateCommunity(duplicate, registry).some((e) => e.includes('Duplicate')));
  const wrong = structuredClone(tournaments);
  wrong.find((t) => t.id === current.id).results.placements[0].team = 'bobr1ki';
  assert.ok(validateCommunity(wrong, registry).some((e) => e.includes('Final/placement')));
});
test('review regressions: map disagreement, unreachable IDs and personal fields are rejected', () => {
  const inspect = (edit) => {
    const data = structuredClone(tournaments);
    const t = data.find((t) => t.id === current.id);
    const matches = t.stages.flatMap((s) => (s.rounds || [{ matches: s.matches || [] }]).flatMap((r) => r.matches));
    edit(matches);
    return validateCommunity(data, registry);
  };
  assert.ok(inspect((matches) => { matches.find((m) => m.id === 'cs2-r3-cipher-hunger').maps = [{ name: 'Ancient', score1: 13, score2: 5 }]; }).some((e) => e.includes('BO1 round/map')));
  assert.ok(inspect((matches) => { matches[0].id = 'M:01'; }).some((e) => e.includes('invalid match')));
  assert.ok(inspect((matches) => { matches[0].captain = 'Do not store'; }).some((e) => e.includes('Personal-data')));
  assert.ok(inspect((matches) => { matches.find((m) => m.id === 'cs2-aug-upper-sf-1').team1 = 'Resistance'; }).some((e) => e.includes('Participant conflicts')));
  const unresolved = model.matches.get('dota2-main-2026/dota-main-group-16');
  assert.deepEqual(unresolved.result.sourceScore, [1, 1]);
  assert.equal(unresolved.result.confirmed, false); assert.equal(unresolved.result.canDownload, false);
  assert.match(matchDateLabel(get('cs2-aug-grand-final')), /2026/);
});
const now = '2026-09-08T10:00:00.000Z';
const sample = { id: 'match-1', tournamentId: 'test', tournamentSlug: 'test', tournamentTitle: 'Тест; Кубок', team1: 'Команда А', team2: 'Команда Б', team1Id: 'a', team2Id: 'b', status: 'scheduled', scheduledAt: '2026-10-10T15:00:00+03:00' };
const empty = { schemaVersion: 1, records: [] };
test('merged calendar retains legacy events and follows future canonical events without duplicates', () => {
  const team = { id: 'canonical', name: 'Команда', legacyIds: ['a', 'other-old'] };
  const initial = reconcilePublications([sample], empty, now);
  const before = teamCalendar(team, initial, 'https://example.test');
  assert.match(before, /STATUS:CONFIRMED/);
  const merged = reconcilePublications([{ ...sample, team1Id: 'canonical' }], initial, now);
  const after = teamCalendar(team, merged, 'https://example.test');
  assert.equal(after.split('BEGIN:VEVENT').length - 1, 1);
  assert.equal(after.match(/UID:(.*)/)[1], before.match(/UID:(.*)/)[1]);
  assert.match(after, /STATUS:CONFIRMED/);
  const removed = reconcilePublications([], merged, now);
  assert.match(teamCalendar(team, removed, 'https://example.test'), /STATUS:CANCELLED/);
});
test('calendar uses real instants; yearless and timezone-free dates do not create events', () => {
  assert.equal(exactStart('2026-10-10T15:00:00'), null);
  assert.equal(exactStart('2026-02-31T15:00:00+03:00'), null);
  assert.equal(exactStart('2026-10-10T24:00:00+03:00'), null);
  const result = reconcilePublications([sample], empty, now);
  const ics = teamCalendar({ id: 'a', name: 'Команда А' }, result, 'https://example.test');
  assert.ok(ics.includes('DTSTART:20261010T120000Z\r\n'));
  assert.ok(ics.includes('Тест\\; Кубок'));
  assert.match(matchDateLabel(sample), /15:00 МСК$/);
  const unknown = { ...sample, scheduledAt: null, dateDisplay: '2 дек · 19:00' };
  assert.deepEqual(reconcilePublications([unknown], empty, now), empty);
  assert.equal(upcomingMatches({ matches: [unknown] }, Date.parse(now)).length, 1);
});
test('calendar move, cancellation, unset time and reassignment retain event identity', () => {
  const initial = reconcilePublications([sample], empty, now);
  const moved = reconcilePublications([{ ...sample, scheduledAt: '2026-10-11T15:00:00+03:00' }], initial, now);
  assert.equal(moved.records[0].uid, initial.records[0].uid); assert.equal(moved.records[0].revision, 1);
  assert.deepEqual(reconcilePublications([{ ...sample, scheduledAt: '2026-10-11T15:00:00+03:00' }], moved, '2026-09-09T10:00:00Z'), moved);
  const paused = reconcilePublications([{ ...sample, status: 'postponed', scheduledAt: null }], moved, now);
  assert.equal(paused.records[0].start, moved.records[0].start); assert.equal(paused.records[0].cancelled, true);
  const resumed = reconcilePublications([sample], paused, now);
  assert.equal(resumed.records[0].uid, initial.records[0].uid); assert.equal(resumed.records[0].revision, 3);
  const cancelled = reconcilePublications([{ ...sample, status: 'cancelled' }], resumed, now);
  assert.match(teamCalendar({ id: 'a', name: 'А' }, cancelled, 'https://example.test'), /STATUS:CANCELLED/);
});
test('old team receives a cancellation and new team gets the same UID', () => {
  const initial = reconcilePublications([sample], empty, now);
  const changed = reconcilePublications([{ ...sample, team1Id: 'c', team1: 'Команда В' }], initial, now);
  const oldFeed = teamCalendar({ id: 'a', name: 'А' }, changed, 'https://example.test');
  const newFeed = teamCalendar({ id: 'c', name: 'В' }, changed, 'https://example.test');
  assert.match(oldFeed, /STATUS:CANCELLED/); assert.match(newFeed, /STATUS:CONFIRMED/);
  assert.equal(oldFeed.match(/UID:(.*)/)[1], newFeed.match(/UID:(.*)/)[1]);
  const removed = reconcilePublications([], changed, now);
  assert.match(teamCalendar({ id: 'c', name: 'В' }, removed, 'https://example.test'), /STATUS:CANCELLED/);
});
test('UTF-8 folding and escaping protect calendar records from text injection', () => {
  const result = reconcilePublications([{ ...sample, team1: 'Я'.repeat(200) + '\nBEGIN:VEVENT' }], empty, now);
  const feed = teamCalendar({ id: 'a', name: 'А' }, result, 'https://example.test');
  for (const line of feed.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(feed.split('\r\n').filter((line) => line === 'BEGIN:VEVENT').length, 1);
  assert.ok(feed.replace(/\r\n /g, '').includes('\\nBEGIN:VEVENT'));
  assert.ok(!feed.includes('ATTENDEE:')); assert.ok(!feed.includes('ORGANIZER:'));
});
test('calendar GET/HEAD returns a calendar and missing feeds never return HTML', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(new Request('https://example.test/calendars/teams/a.ics', { method, headers: { accept: 'text/html' } }), { ASSETS: { fetch: async () => new Response(method === 'HEAD' ? null : 'BEGIN:VCALENDAR\r\nEND:VCALENDAR') } });
    assert.match(response.headers.get('content-type'), /text\/calendar/);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
  }
  let calls = 0;
  const response = await worker.fetch(new Request('https://example.test/calendars/teams/missing.ics', { headers: { accept: 'text/html' } }), { ASSETS: { fetch: async () => { calls++; return new Response('missing', { status: 404 }); } } });
  assert.equal(response.status, 404); assert.equal(calls, 1);
});
test('Telegram chat remains unset and registration URL is unchanged', () => {
  assert.equal(read('src/data/community-config.json').teamSearchChatUrl, null);
  assert.equal(tournaments.find((t) => t.id === 'dota2-autumn-2026').primaryAction.target, 'https://forms.yandex.ru/u/6a84359e6d2d7373b491e1e4');
  const registryText = JSON.stringify(registry);
  assert.doesNotMatch(registryText, /"(?:email|phone|captain|players|roster|telegramId|steamId|faceitId)"/i);
});
