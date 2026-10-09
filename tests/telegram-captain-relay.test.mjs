import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaptainRelay } from '../serverless/tgcloud/lib/captain-relay.js';

class EndpointError extends Error {
  constructor(message, parameters) { super(message); this.parameters = parameters; }
}
const input = { action: 'access', initData: new URLSearchParams({ user: JSON.stringify({ id: 42 }) }).toString() };
const ctx = { initData: { user: { id: 42 } } };
const make = (fetcher, serviceUrl = 'https://service.example/api/captain') =>
  createCaptainRelay({ fetcher, EndpointError, serviceUrl });

test('relay requires matching platform identity before outbound call', async () => {
  let called = false;
  const relay = make(async () => { called = true; });
  await assert.rejects(relay(input, { initData: { user: { id: 43 } } }), e => e.parameters.code === 'unauthorized');
  assert.equal(called, false);
});

test('relay forwards signed init data but strips forged server context and unexpected keys', async () => {
  const relay = make(async (url, options) => {
    assert.equal(url, 'https://service.example/api/captain');
    assert.deepEqual(JSON.parse(options.body), input);
    return { ok: true, json: async () => ({ authorized: false, team: null, matches: [] }) };
  });
  assert.equal((await relay({ ...input, userId: 7, isAdmin: true, endpoint: 'https://attacker.invalid' }, ctx)).authorized, false);
});

test('relay fails closed on unconfigured or insecure target and sanitizes transport errors', async () => {
  for (const url of ['', 'http://service.example/api/captain', 'https://secret@example.com/api/captain']) {
    await assert.rejects(make(() => assert.fail('must not fetch'), url)(input, ctx), e => e.parameters.code === 'captain_not_configured');
  }
  await assert.rejects(make(async () => { throw new Error('secret transport details'); })(input, ctx), e =>
    e.parameters.code === 'storage_unavailable' && !e.message.includes('secret'));
});

test('relay preserves a known conflict code and hides arbitrary upstream errors', async () => {
  for (const [upstream, expected] of [['conflict', 'conflict'], ['chat_reset', 'chat_reset'], ['database password detail', 'storage_unavailable']]) {
    await assert.rejects(make(async () => ({ ok: false, json: async () => ({ error: upstream }) }))(input, ctx), e => e.parameters.code === expected);
  }
});

test('relay forwards a message epoch without promoting client assertions to trusted context', async () => {
  const command = { ...input, action: 'message', matchId: 'match-1', requestId: 'message-1', text: 'Сообщение', expectedChatEpoch: 'a'.repeat(64) };
  const relay = make(async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), command);
    return { ok: true, json: async () => ({ chatEpoch: command.expectedChatEpoch, messages: [] }) };
  });
  assert.equal((await relay({ ...command, chatEpoch: 'forged', authenticatedUser: 123 }, ctx)).chatEpoch, command.expectedChatEpoch);
});
