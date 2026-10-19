import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../scripts/server.mjs';

test('verifier PROXY-01: app-server photo forwarding strips other-feature credentials, fixes target and preserves exact private bytes', async (t) => {
  const listen = async (server) => { await new Promise((r) => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${server.address().port}`; };
  const stop = (server) => new Promise((r) => { server.closeAllConnections(); server.close(r); });
  const seen = [], logs = [], image = Buffer.from([255, 216, 0, 13, 10, 127, 128, 254, 255, 217]);
  const upstream = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    seen.push({ url: request.url, method: request.method, headers: request.headers, body: Buffer.concat(chunks) });
    response.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'public,max-age=999999',
      'content-security-policy': "default-src 'none'; sandbox", 'x-internal-header': 'must-not-leak' });
    response.end(image);
  });
  const upstreamOrigin = await listen(upstream);
  const frontend = createAppServer({ directory: fileURLToPath(new URL('../public/', import.meta.url)),
    env: { YCS_PLAYER_UPSTREAM: upstreamOrigin }, logger: { error: (message) => logs.push(message) } });
  const frontendOrigin = await listen(frontend);
  t.after(async () => { await stop(frontend); await stop(upstream); });
  const response = await fetch(`${frontendOrigin}/api/player/v1/photos/asset?literal=%3F%3F`, {
    headers: { authorization: 'Bearer synthetic-organizer-token',
      cookie: 'ycs_captain_session=synthetic-captain; organizer_secret=synthetic-organizer; ycs_player_session=synthetic-player-signature',
      origin: 'https://site.synthetic.invalid', 'x-csrf-token': 'synthetic-player-csrf',
      'x-forwarded-host': 'hostile.synthetic.invalid', 'x-forwarded-proto': 'http', 'x-upstream': 'http://hostile.synthetic.invalid' },
  });
  assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  assert.equal(response.headers.get('content-type'), 'image/jpeg'); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('content-security-policy'), /sandbox/); assert.equal(response.headers.get('x-internal-header'), null);
  assert.equal(seen.length, 1); assert.equal(seen[0].url, '/api/player/v1/photos/asset?literal=%3F%3F');
  assert.equal(seen[0].headers.host, new URL(upstreamOrigin).host);
  assert.equal(seen[0].headers.cookie, 'ycs_player_session=synthetic-player-signature');
  assert.equal(seen[0].headers.origin, 'https://site.synthetic.invalid'); assert.equal(seen[0].headers['x-csrf-token'], 'synthetic-player-csrf');
  for (const key of ['authorization', 'x-forwarded-host', 'x-forwarded-proto', 'x-upstream']) assert.equal(seen[0].headers[key], undefined, key);
  assert.equal((await fetch(`${frontendOrigin}/api/player/v10/photos/asset`)).status, 404);
  assert.equal((await fetch(`${frontendOrigin}/api/captain/v1/photos/asset`)).status, 404);
  assert.equal((await fetch(`${frontendOrigin}/healthz`)).status, 200);
  assert.equal(seen.length, 1); assert.deepEqual(logs, []);
});
