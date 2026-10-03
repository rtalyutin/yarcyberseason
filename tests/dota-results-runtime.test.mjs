import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startResultsWorker } from "../backend/dota-results-worker.mjs";
import { startResultsBackend } from "../backend/server.mjs";
import { run } from "../scripts/dota-results-import.mjs";
import { startApp, createAssetBinding } from "../scripts/server.mjs";

const kickoff = new Date("2026-10-09T20:30:00+03:00");
const quiet = { error() {}, log() {} };
const settled = () => new Promise((resolve) => setImmediate(resolve));

test("server worker waits until kickoff, serializes slow imports and aborts on stop", async () => {
  let at = new Date("2026-09-30T12:00:00+03:00");
  let callback;
  let calls = 0;
  let finish;
  let signal;
  const worker = startResultsWorker({ now: () => at,
    setTimer(fn, delay) { assert.equal(delay, 300_000); callback = fn; return 1; },
    clearTimer() { callback = undefined; }, logger: quiet,
    runOnce(options) { calls++; signal = options.signal; return new Promise((resolve) => { finish = resolve; }); } });
  assert.equal(calls, 0);
  at = kickoff;
  const check = callback;
  callback = undefined;
  check();
  await settled();
  assert.equal(calls, 1);
  assert.equal(callback, undefined, "no second timer while import is still running");
  finish();
  await settled();
  assert.equal(worker.state.lastSuccessAt, kickoff.toISOString());
  callback();
  await settled();
  assert.equal(calls, 2);
  const stopping = worker.stop();
  assert.equal(signal.aborted, true);
  finish();
  await stopping;
  assert.equal(callback, undefined);
});

test("worker survives an API failure and stops discovery after the tournament period", async () => {
  let callback;
  let at = kickoff;
  let calls = 0;
  const errors = [];
  const worker = startResultsWorker({ now: () => at,
    setTimer(fn) { callback = fn; return 1; }, clearTimer() {},
    logger: { error(message) { errors.push(message); } },
    async runOnce() { calls++; if (calls === 1) throw new Error("API unavailable"); } });
  await settled();
  assert.equal(worker.state.status, "error");
  assert.match(errors[0], /API unavailable/);
  callback();
  await settled();
  assert.equal(calls, 2);
  assert.equal(worker.state.status, "waiting");
  at = new Date("2026-10-26T00:00:00+03:00");
  callback();
  await settled();
  assert.equal(calls, 2);
  await worker.stop();
  let timers = 0;
  const disabled = startResultsWorker({ env: { YCS_DOTA_RESULTS_IMPORT_ENABLED: "false" },
    now: () => kickoff, runOnce() { assert.fail("disabled import"); }, setTimer() { timers++; }, clearTimer() {} });
  assert.equal(timers, 0);
  await disabled.stop();
});

test("importer makes no external calls before kickoff and persists completed results only once", async () => {
  let object = null;
  const objects = new Map();
  let writes = 0;
  let destroyed = 0;
  const map = { match_id: 900000001, leagueid: 20164, start_time: kickoff.getTime() / 1000,
    radiant_name: "ARB Esports", dire_name: "Team Borisogleb", radiant_win: true,
    radiant_score: 18, dire_score: 32, duration: 2400, series_id: 0 };
  const options = { env: { AWS_ACCESS_KEY_ID: "test", AWS_SECRET_ACCESS_KEY: "test" },
    async fetchJson(url) {
      if (url.endsWith("/matchIds")) return [map.match_id];
      if (url.endsWith("/heroes")) return [{ id: 1, name: "npc_dota_hero_test" }];
      return map;
    },
    createS3(config) {
      assert.equal(config.credentials.secretAccessKey, "test");
      return { async send(command) {
        assert.ok(["results/dota2-autumn-2026.json", "results/dota2-autumn-2026-mvp.json", "results/dota2-autumn-2026-mvp-cache.json"].includes(command.input.Key));
        if (command.constructor.name === "PutObjectCommand") {
          const value = JSON.parse(command.input.Body); objects.set(command.input.Key, value);
          if (command.input.Key === "results/dota2-autumn-2026.json") { object = value; writes++; }
          return {};
        }
        if (!objects.has(command.input.Key)) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
        return { Body: { transformToString: async () => JSON.stringify(objects.get(command.input.Key)) } };
      }, destroy() { destroyed++; } };
    } };
  await run({ now: new Date("2026-10-09T20:29:59+03:00"),
    createS3() { assert.fail("early S3 access"); }, fetchJson() { assert.fail("early API access"); } });
  await run({ ...options, now: new Date("2026-10-09T22:00:00+03:00") });
  assert.equal(writes, 1);
  assert.equal(object.matches["dota-autumn-swiss-r1-04"].winnerTeamId, "dota2-qual-2026-arb-esports");
  await run({ ...options, now: new Date("2026-10-09T22:05:00+03:00") });
  assert.equal(writes, 1);
  assert.equal(destroyed, 2);
  await assert.rejects(run({ now: kickoff, env: {} }), /credentials/);
});

test("small results backend starts without a site build and exposes health without HTTP import triggers", async () => {
  let imports = 0;
  let cleared = false;
  const backend = await startResultsBackend({ port: 0, host: "127.0.0.1", logger: quiet,
    env: { AWS_ACCESS_KEY_ID: "private-writer", AWS_SECRET_ACCESS_KEY: "private-secret" },
    workerOptions: { now: () => kickoff, setTimer() { return 1; },
      clearTimer() { cleared = true; }, async runOnce() { imports++; } } });
  const base = `http://127.0.0.1:${backend.server.address().port}`;
  try {
    await settled();
    assert.equal(imports, 1);
    assert.equal(backend.worker.state.status, "waiting");
    const health = await fetch(base + "/healthz");
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("cache-control"), "no-store");
    assert.deepEqual(await health.json(), { status: "ok" });
    const head = await fetch(base + "/healthz", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    const post = await fetch(base + "/healthz", { method: "POST" });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get("allow"), "GET, HEAD");
    for (const route of ["/", "/tg", "/assets/app.js", "/api/import", "/.env"]) {
      const response = await fetch(base + route, { method: "POST", body: "start import" });
      assert.equal(response.status, 404, route);
      assert.ok(!(await response.text()).includes("private"));
    }
    assert.equal(imports, 1, "HTTP requests never initiate an import");
  } finally { await backend.stop(); }
  assert.equal(cleared, true);
  assert.equal(backend.server.listening, false);
});

test("standalone frontend preserves site/Mini App routes and never starts an importer", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ycs-runtime-"));
  const directory = path.join(temporary, "public");
  await mkdir(directory);
  await mkdir(path.join(directory, "about"));
  await mkdir(path.join(directory, "calendars"));
  await writeFile(path.join(directory, "index.html"), '<html data-prerender-path="/">Home</html>');
  await writeFile(path.join(directory, "about/index.html"), '<html data-prerender-path="/about">About</html>');
  await writeFile(path.join(directory, "spa-shell.html"), '<html>Mini App</html>');
  await writeFile(path.join(directory, "calendars/all.ics"), 'BEGIN:VCALENDAR\r\nEND:VCALENDAR');
  await writeFile(path.join(temporary, "private.txt"), "secret");
  await symlink(path.join(temporary, "private.txt"), path.join(directory, "leak.txt"));
  const app = await startApp({ directory, logger: quiet, port: 0, host: "127.0.0.1" });
  assert.equal("worker" in app, false);
  const server = app.server;
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ["/", "/about", "/tg", "/tg/tournament", "/healthz"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.ok(await response.text());
    }
    for (const route of ["/unknown", "/api/unknown", "/assets/missing.js", "/leak.txt", "/%2eprivate"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 404, route);
      assert.ok(!(await response.text()).includes("secret"));
    }
    const calendar = await fetch(base + "/calendars/all.ics");
    assert.match(calendar.headers.get("content-type"), /text\/calendar/);
    assert.match(await calendar.text(), /BEGIN:VCALENDAR/);
    const head = await fetch(base + "/about", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.equal((await fetch(base + "/", { method: "POST", body: "untrusted" })).status, 405);
    const assets = createAssetBinding(directory);
    assert.equal((await assets.fetch(new Request(base + "/%2e%2e%2fprivate.txt"))).status, 404);
  } finally {
    await app.stop();
    await rm(temporary, { recursive: true, force: true });
  }
});
