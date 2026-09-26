import test from 'node:test';
import assert from 'node:assert/strict';
import tournament from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };
import { getHomeBroadcastBoard } from '../src/lib/home-board.js';

const fixture = () => structuredClone(tournament);
const featured = (data) => data.stages[0].rounds[0].matches.find((match) => match.id === data.homeBroadcastMatchIds[0]);

test('the published broadcast pair is scheduled even after its calendar date passes', () => {
  const data = fixture();
  const board = getHomeBroadcastBoard(data);
  assert.equal(board.state, 'scheduled');
  assert.equal(board.match.team1, 'Team Borisogleb');
  assert.equal(board.match.team2, 'ARB Esports');
  assert.equal(board.score, null);
});

test('only an explicit live state can offer the published stream', () => {
  const data = fixture();
  featured(data).status = 'live';
  featured(data).broadcastUrl = 'https://example.com/live';
  const board = getHomeBroadcastBoard(data);
  assert.equal(board.state, 'live');
  assert.equal(board.match.broadcastUrl, 'https://example.com/live');
  assert.equal(board.score, null);
});

test('an unconfirmed completed match cannot publish a score', () => {
  const data = fixture();
  Object.assign(featured(data), { status: 'completed', score1: 1, score2: 0, scoreKind: 'series' });
  assert.equal(getHomeBroadcastBoard(data).state, 'pending');
  featured(data).resultConfirmed = true;
  assert.deepEqual(getHomeBroadcastBoard(data).score, [1, 0]);
});

test('a newly featured fixture appears beside the confirmed previous result', () => {
  const data = fixture();
  Object.assign(featured(data), { status: 'completed', score1: 1, score2: 0, scoreKind: 'series', resultConfirmed: true });
  data.homeBroadcastMatchIds.push('dota-autumn-swiss-r1-05');
  const board = getHomeBroadcastBoard(data);
  assert.equal(board.state, 'scheduled');
  assert.equal(board.match.id, 'dota-autumn-swiss-r1-05');
  assert.deepEqual(board.previous.score, [1, 0]);
  data.homeBroadcastMatchIds = ['missing-id'];
  assert.equal(getHomeBroadcastBoard(data).state, 'unannounced');
});

test('a technical decision is distinguished from a played broadcast', () => {
  const data = fixture();
  Object.assign(featured(data), { status: 'walkover', score1: 1, score2: 0, scoreKind: 'series', resultConfirmed: true });
  const board = getHomeBroadcastBoard(data);
  assert.equal(board.state, 'technical');
  assert.deepEqual(board.score, [1, 0]);
});
