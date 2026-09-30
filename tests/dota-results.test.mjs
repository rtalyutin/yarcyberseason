import test from "node:test";
import assert from "node:assert/strict";
import tournament from "../src/data/tournaments/dota2-autumn-2026.json" with { type: "json" };
import { collectDotaResults, isPollWindow } from "../src/lib/dota-import.js";
import { applyDotaSnapshot, validateDotaSnapshot } from "../src/lib/dota-results.js";
import { buildMiniAppModel } from "../src/telegram/data/model.js";
import registry from "../src/data/teams.json" with { type: "json" };
import { projectContent } from "../src/data/project-content.js";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const first = { match_id: 900000001, leagueid: 20164, start_time: Date.parse("2026-10-09T20:35:00+03:00") / 1000,
  radiant_name: "ARB Esports", dire_name: "Team Borisogleb", radiant_win: true, radiant_score: 18, dire_score: 32,
  duration: 2400, series_id: 0 };

test("polling opens at kickoff and closes after the selected evening windows", () => {
  assert.equal(isPollWindow(new Date("2026-10-09T20:29:59+03:00")), false);
  assert.equal(isPollWindow(new Date("2026-10-09T20:30:00+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-10T00:59:59+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-10T19:59:59+03:00")), false);
  assert.equal(isPollWindow(new Date("2026-10-10T20:00:00+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-11T01:00:00+03:00")), false);
});

test("radiant winner is published even when kills are lower; both clients receive details", () => {
  const { snapshot, changed } = collectDotaResults(tournament, [first], null, new Date("2026-10-09T19:00:00Z"));
  assert.equal(changed, true);
  assert.deepEqual([snapshot.matches["dota-autumn-swiss-r1-04"].score1, snapshot.matches["dota-autumn-swiss-r1-04"].score2], [0, 1]);
  assert.deepEqual([snapshot.matches["dota-autumn-swiss-r1-04"].maps[0].kills1,
    snapshot.matches["dota-autumn-swiss-r1-04"].maps[0].kills2], [32, 18]);
  const updated = applyDotaSnapshot(tournament, snapshot);
  const match = updated.stages[0].rounds[0].matches[3];
  assert.equal(match.winner, "ARB Esports");
  assert.equal(updated.stages[0].groups[0].rows.find((row) => row.team === "ARB Esports").won, 1);
  const mini = buildMiniAppModel(updated, registry, projectContent);
  const miniMatch = mini.matches.find((item) => item.id === match.id);
  assert.deepEqual(miniMatch.result.score, [0, 1]);
  assert.deepEqual(miniMatch.result.maps[0].kills, [32, 18]);
  assert.equal(miniMatch.result.maps[0].durationSeconds, 2400);
});

test("unmatched, foreign, duplicate and incomplete data never invent a score", () => {
  for (const candidate of [
    { ...first, leagueid: 19021 }, { ...first, radiant_name: "Unknown" },
    { ...first, radiant_score: null }, { ...first, start_time: Date.parse("2026-10-08T20:35:00+03:00") / 1000 },
  ]) assert.equal(collectDotaResults(tournament, [candidate]).changed, false);
  assert.equal(collectDotaResults(tournament, [first, { ...first, match_id: 900000002 }]).changed, false);
});

test("previous revision is retained, conflicting map is rejected, malformed snapshot fails", () => {
  const previous = collectDotaResults(tournament, [first]).snapshot;
  const result = collectDotaResults(tournament, [{ ...first, radiant_win: false }], previous);
  assert.equal(result.changed, false);
  assert.equal(result.snapshot, previous);
  assert.match(result.warnings.join(" "), /Conflict/);
  const invalid = structuredClone(previous);
  invalid.matches["dota-autumn-swiss-r1-04"].maps[0].url = "https://example.com/wrong";
  assert.throws(() => validateDotaSnapshot(invalid, tournament));
});

test("actual tournament UI renders score, map winner, kills, duration and source", async () => {
  const snapshot = collectDotaResults(tournament, [first]).snapshot;
  const updated = applyDotaSnapshot(tournament, snapshot);
  updated.stages = updated.stages.filter((stage) => stage.type === "swiss");
  updated.stages[0].rounds[0].matches = updated.stages[0].rounds[0].matches.filter((match) => match.id === "dota-autumn-swiss-r1-04");
  const bundle = await build({ entryPoints: ["src/components/TournamentNavigator.jsx"], bundle: true,
    write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react-dom"], loader: { ".css": "empty" } });
  const output = { exports: {} };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
  const html = renderToStaticMarkup(React.createElement(output.exports.TournamentNavigator, { tournament: updated, navigate() {} }));
  for (const expected of ["0 : 1", "Победа", "Убийства 32:18", "40:00", "https://www.opendota.com/matches/900000001"]) {
    assert.ok(html.includes(expected), expected);
  }
});

test("client keeps the last confirmed S3 revision through an outage", async () => {
  const bundle = await build({ entryPoints: ["src/lib/dota-results-client.js"], bundle: true,
    write: false, platform: "node", format: "cjs", external: ["react"] });
  const output = { exports: {} };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
  const snapshot = collectDotaResults(tournament, [first]).snapshot;
  const current = await output.exports.refreshDotaResults(async () => ({ ok: true, status: 200, json: async () => snapshot }));
  assert.deepEqual(current, { revision: 1, availability: "current" });
  const outage = await output.exports.refreshDotaResults(async () => ({ ok: false, status: 503 }));
  assert.deepEqual(outage, { revision: 1, availability: "unavailable" });
});
