import test from "node:test";
import assert from "node:assert/strict";
import { createDotaMvpClient, dotaMvpUrl } from "../src/lib/dota-mvp-client.js";
import { buildMvpSnapshot } from "../src/lib/dota-mvp.js";
import { getTournamentModel, resolveTournamentView } from "../src/lib/tournament.js";

const tournament = { id: "dota2-test-2026", discipline: "Dota 2", leagueId: 123 };
const snapshot = (revision = 1) => buildMvpSnapshot([], { tournamentId: tournament.id, leagueId: tournament.leagueId, revision, updatedAt: "2026-10-03T05:00:00Z" });
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("MVP URL derives the shared S3 results path without accepting an external path", () => {
  assert.equal(new URL(dotaMvpUrl(tournament.id)).pathname, "/results/dota2-test-2026-mvp.json");
  for (const id of ["../private", "https://example.org", "dota?x=1", "", undefined]) assert.throws(() => dotaMvpUrl(id));
});

test("An unpublished snapshot remains pending; no fabricated zero rating is introduced", async () => {
  const client = createDotaMvpClient(tournament);
  assert.deepEqual(await client.refresh(async () => response(null, 404)), { snapshot: null, availability: "pending" });
});

test("Fetch failures and missing/invalid snapshots retain the last validated tournament data", async () => {
  const client = createDotaMvpClient(tournament);
  const good = snapshot();
  assert.equal((await client.refresh(async () => response(good))).snapshot, good);
  for (const fetcher of [async () => { throw new Error("offline"); }, async () => response(null, 404), async () => response({ ...snapshot(2), leagueId: 456 }), async () => response({ ...snapshot(2), tournamentId: "another-tournament" })]) {
    const state = await client.refresh(fetcher);
    assert.equal(state.snapshot, good);
    assert.equal(state.availability, "unavailable");
  }
});

test("An older revision cannot overwrite a newer one, and a newer valid revision restores current status", async () => {
  const client = createDotaMvpClient(tournament);
  const good = snapshot(3);
  await client.refresh(async () => response(good));
  const old = await client.refresh(async () => response(snapshot(2)));
  assert.equal(old.snapshot, good);
  assert.equal(old.availability, "stale");
  const next = snapshot(4);
  const refreshed = await client.refresh(async () => response(next));
  assert.equal(refreshed.snapshot, next);
  assert.equal(refreshed.availability, "current");
});

test("A changed body at the same revision is rejected; unchanged reads recover from a delay", async () => {
  const client = createDotaMvpClient(tournament);
  const good = snapshot(2);
  await client.refresh(async () => response(good));
  const conflict = await client.refresh(async () => response({ ...good, updatedAt: "2026-10-03T05:01:00Z" }));
  assert.equal(conflict.snapshot, good);
  assert.equal(conflict.availability, "unavailable");
  assert.equal((await client.refresh(async () => response(structuredClone(good)))).availability, "current");
});

test("Concurrent readers share one request and subscribers can detach", async () => {
  const client = createDotaMvpClient(tournament);
  let release, calls = 0, emissions = 0;
  const fetcher = () => { calls++; return new Promise((resolve) => { release = resolve; }); };
  const unsubscribe = client.subscribe(() => emissions++);
  const first = client.refresh(fetcher), second = client.refresh(fetcher);
  assert.equal(first, second);
  assert.equal(calls, 1);
  assert.equal(client.getState().availability, "loading");
  release(response(snapshot()));
  await first;
  assert.equal(emissions, 2);
  unsubscribe();
  await client.refresh(async () => response(snapshot(2)));
  assert.equal(emissions, 2);
});

test("A bundled retrospective calculation survives absent S3 publication and failed reads", async () => {
  const initial = { ...snapshot(2), retrospective: true, coverageComplete: false };
  const client = createDotaMvpClient(tournament, { initialSnapshot: initial });
  for (const fetcher of [async () => response(null, 404), async () => { throw new Error("offline"); }, async () => response(snapshot(1)), async () => response({ ...snapshot(2), updatedAt: "2026-10-03T04:59:00Z" })]) {
    const state = await client.refresh(fetcher);
    assert.equal(state.snapshot, initial);
    assert.equal(state.availability, "bundled");
  }
});

test("First valid S3 at the bundled revision becomes authoritative, then guards conflicting remote revisions", async () => {
  const initial = { ...snapshot(2), retrospective: true, coverageComplete: false };
  const client = createDotaMvpClient(tournament, { initialSnapshot: initial });
  const remote = { ...snapshot(2), updatedAt: "2026-10-03T05:01:00Z" };
  const first = await client.refresh(async () => response(remote));
  assert.equal(first.snapshot, remote);
  assert.equal(first.availability, "current");
  const conflict = await client.refresh(async () => response({ ...remote, updatedAt: "2026-10-03T05:02:00Z" }));
  assert.equal(conflict.snapshot, remote);
  assert.equal(conflict.availability, "unavailable");
});

test("Dota archives and current events share the MVP section and deep links; CS2 never acquires it", () => {
  const model = getTournamentModel(tournament);
  assert.equal(model.sections.find((section) => section.id === "mvp").title, "MVP турнира");
  assert.equal(resolveTournamentView(model, "?section=mvp").section, "mvp");
  assert.equal(resolveTournamentView(model, "", "#mvp").section, "mvp");
  assert.equal(getTournamentModel({ ...tournament, discipline: "CS2" }).sections.some((section) => section.id === "mvp"), false);
});
