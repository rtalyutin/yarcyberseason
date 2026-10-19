import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Reconstruct the declared runtime package, rather than importing modules from
// the checkout (which would hide a missing Docker COPY). npm's installed backend
// dependencies are reused; no Docker availability or image-build claim implied.
async function assembleDockerCopies(directory) {
  const dockerfile = await readFile(path.join(root, 'Dockerfile'), 'utf8');
  const copied = new Set();
  for (const line of dockerfile.split('\n')) {
    if (!line.startsWith('COPY ')) continue;
    const parts = line.trim().split(/\s+/).slice(1).filter((part) => !part.startsWith('--'));
    const destination = parts.pop();
    assert.ok(destination?.startsWith('./'), `Unsupported runtime COPY destination: ${line}`);
    for (const source of parts) {
      const sources = source.includes('*')
        ? (await readdir(path.join(root, path.dirname(source)))).filter((name) => {
          const pattern = path.basename(source).split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
          return new RegExp(`^${pattern}$`).test(name);
        }).map((name) => path.join(path.dirname(source), name))
        : [source];
      assert.ok(sources.length, `Empty COPY source: ${source}`);
      for (const file of sources) {
        const target = destination.endsWith('/') ? path.join(directory, destination, path.basename(file)) : path.join(directory, destination);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(path.join(root, file), target);
        copied.add(path.relative(directory, target));
      }
    }
  }
  await symlink(path.join(root, 'backend/node_modules'), path.join(directory, 'backend/node_modules'), 'dir');
  return copied;
}

test('declared Docker runtime copies boot the actual backend with profiles disabled', { timeout: 30_000 }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ycs-runtime-package-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const copied = await assembleDockerCopies(directory);
  for (const file of ['backend/player-profile-api.mjs', 'backend/player-profile-auth.mjs', 'backend/player-profile-config.mjs',
    'backend/player-profile-service.mjs', 'backend/player-profile-store.mjs', 'src/lib/player-profile-catalog.js']) {
    assert.ok(copied.has(file), `Runtime package must COPY ${file}`);
    await access(path.join(directory, file));
  }
  const child = spawn(process.execPath, ['backend/server.mjs'], { cwd: directory,
    env: { PATH: process.env.PATH || '', NODE_ENV: 'test', PORT: '0', YCS_PLAYER_ENABLED: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit'); child.kill('SIGTERM');
    const killTimer = setTimeout(() => child.kill('SIGKILL'), 1000); killTimer.unref();
    await exited; clearTimeout(killTimer);
  });
  const port = await new Promise((resolve, reject) => {
    let stdout = '';
    const timeout = setTimeout(() => reject(Error(`Runtime package did not become ready: ${stderr}`)), 8000); timeout.unref();
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('exit', (code) => { clearTimeout(timeout); reject(Error(`Runtime package exited ${code}: ${stderr}`)); });
    child.stdout.on('data', (chunk) => {
      stdout = (stdout + chunk).slice(-4000); const match = stdout.match(/YCS results backend listening on [^\s]+:(\d+);/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
  });
  const response = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'ok' });
  const context = await fetch(`http://127.0.0.1:${port}/api/player/v1/context?Dis=cs`);
  assert.equal(context.status, 200); assert.equal((await context.json()).available, false);
  const session = await fetch(`http://127.0.0.1:${port}/api/player/v1/session`);
  assert.equal(session.status, 503); assert.deepEqual(await session.json(), { error: 'player_not_configured' });
  assert.equal(stderr, '');
});
