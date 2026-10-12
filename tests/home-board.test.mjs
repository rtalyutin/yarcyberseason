import test from 'node:test';
import assert from 'node:assert/strict';
import tournament from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };
import { getHomeBroadcastBoard } from '../src/lib/home-board.js';
import { getMatchBroadcastLinks } from '../src/lib/broadcasts.js';

const featured = (data) => data.stages[0].rounds[0].matches.find((match) => match.id === 'dota-autumn-swiss-r1-04');
// Explicitly reset the synthetic state; the real opening is already confirmed.
const fixture = () => {
  const data = structuredClone(tournament);
  for (const stage of data.stages) for (const round of stage.rounds || [{ matches: stage.matches || [] }]) for (const match of round.matches || []) {
    if (match.id !== featured(data).id) delete match.broadcastLinks;
  }
  Object.assign(featured(data), { status: 'scheduled', resultConfirmed: false, score1: null, score2: null });
  return data;
};

test('the assigned scheduled stream is retained when re-reading an elapsed calendar date', () => {
  const data = fixture();
  const board = getHomeBroadcastBoard(data);
  assert.equal(board.state, 'scheduled');
  assert.equal(board.match.team1, 'Team Borisogleb');
  assert.equal(board.match.team2, 'ARB Esports');
  assert.equal(board.score, null);
  assert.deepEqual(getHomeBroadcastBoard(structuredClone(data)), board);
});

test('only an explicit live state produces live; planned canonical links remain available', () => {
  const data = fixture();
  const planned = getHomeBroadcastBoard(data);
  assert.equal(planned.state, 'scheduled');
  assert.equal(getMatchBroadcastLinks(planned.match).length, 2);
  featured(data).status = 'live';
  const board = getHomeBroadcastBoard(data);
  assert.equal(board.state, 'live');
  assert.equal(getMatchBroadcastLinks(board.match)[0].href, 'https://www.twitch.tv/yarcyberseason');
  assert.equal(board.score, null);
});

test('an unconfirmed completion retains the stream without publishing a score; confirmation closes it', () => {
  const data = fixture();
  Object.assign(featured(data), { status: 'completed', resultConfirmed: false, score1: 1, score2: 0, scoreKind: 'series' });
  assert.equal(getHomeBroadcastBoard(data).state, 'pending');
  assert.equal(getHomeBroadcastBoard(data).score, null);
  featured(data).resultConfirmed = true;
  assert.equal(getHomeBroadcastBoard(data).state, 'unannounced');
  assert.equal(getHomeBroadcastBoard(data).match, null);
});

test('a next stream must have canonical links and advances only after confirmed closure', () => {
  const data = fixture();
  const next = data.stages[0].rounds[0].matches.find((match) => match.id === 'dota-autumn-swiss-r1-05');
  Object.assign(next, { status: 'scheduled', resultConfirmed: false, scheduledAt: '2026-10-10T21:00:00+03:00', broadcastLinks: { twitch: 'https://example.com/live' } });
  assert.equal(getHomeBroadcastBoard(data).match.id, featured(data).id);
  Object.assign(featured(data), { status: 'completed', resultConfirmed: true });
  assert.equal(getHomeBroadcastBoard(data).match.id, next.id);
  delete next.broadcastLinks;
  next.broadcastUrl = 'https://example.com/legacy';
  assert.equal(getHomeBroadcastBoard(data).state, 'unannounced');
});

test('confirmed technical decisions close a stream; the current selection uses the undated fourth round', () => {
  const data = fixture();
  Object.assign(featured(data), { status: 'walkover', score1: 1, score2: 0, scoreKind: 'technical', resultConfirmed: true });
  assert.equal(getHomeBroadcastBoard(data).state, 'unannounced');
  assert.equal(getHomeBroadcastBoard(data).score, null);
  const board = getHomeBroadcastBoard(tournament);
  assert.equal(board.match.id, 'dota-autumn-swiss-r4-04');
  assert.equal(board.state, 'scheduled');
  assert.deepEqual([board.match.team1, board.match.team2], ['Vnext', 'strela team']);
  assert.equal(board.match.bestOf, 'BO3');
  assert.equal(board.match.scheduledAt, undefined);
  assert.equal(board.match.date, undefined);
  assert.deepEqual(getMatchBroadcastLinks(board.match), [{ platform: 'twitch', label: 'Смотреть на Twitch', href: 'https://www.twitch.tv/YarCyberSeason' }]);
  assert.equal(featured(tournament).resultConfirmed, true);
  assert.equal(featured(tournament).status, 'completed');
});
