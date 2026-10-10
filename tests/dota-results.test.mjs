import test from "node:test";
import assert from "node:assert/strict";
import publishedTournament from "../src/data/tournaments/dota2-autumn-2026.json" with { type: "json" };
import { collectDotaResults, isPollWindow } from "../src/lib/dota-import.js";
import { applyDotaSnapshot, validateDotaSnapshot } from "../src/lib/dota-results.js";
import { buildMiniAppModel } from "../src/telegram/data/model.js";
import registry from "../src/data/teams.json" with { type: "json" };
import { projectContent } from "../src/data/project-content.js";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// League-import scenarios use undecided fixtures, independently of actual
// sports outcomes later confirmed by the organizer in production data.
const tournament = structuredClone(publishedTournament);
for (const match of tournament.stages[0].rounds[0].matches) {
  for (const key of ['resultSource', 'confirmationSource', 'confirmedAt', 'score1', 'score2', 'winner', 'winnerTeamId', 'maps', 'mapLinks', 'resultConfirmed', 'scoreKind']) delete match[key];
  match.status = 'scheduled';
}
tournament.stages[0].groups = [];
tournament.mvpEstimates = [];

const first = { match_id: 900000001, leagueid: 20164, start_time: Date.parse("2026-10-09T20:35:00+03:00") / 1000,
  radiant_name: "ARB Esports", dire_name: "Team Borisogleb", radiant_win: true, radiant_score: 18, dire_score: 32,
  duration: 2400, series_id: 0 };

test("polling follows the complete published tournament period", () => {
  assert.equal(isPollWindow(new Date("2026-10-09T20:29:59+03:00")), false);
  assert.equal(isPollWindow(new Date("2026-10-09T20:30:00+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-10T00:59:59+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-10T19:59:59+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-10T20:00:00+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-25T23:59:59+03:00")), true);
  assert.equal(isPollWindow(new Date("2026-10-26T00:00:00+03:00")), false);
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

test('organizer results publish all three outcomes with no fabricated map or technical MVP', () => {
  const { snapshot, changed } = collectDotaResults(publishedTournament, []);
  assert.equal(changed, true);
  assert.equal(Object.keys(snapshot.matches).length, 3);
  assert.deepEqual([snapshot.matches['dota-autumn-swiss-r1-04'].score1, snapshot.matches['dota-autumn-swiss-r1-04'].score2], [1,0]);
  assert.deepEqual(snapshot.matches['dota-autumn-swiss-r1-04'].maps, []);
  const technical = snapshot.matches['dota-autumn-swiss-r1-05'];
  assert.equal(technical.status, 'walkover');
  assert.deepEqual([technical.score1, technical.score2, technical.maps.length], [0,1,0]);
  assert.deepEqual(snapshot.matches['dota-autumn-swiss-r1-03'].maps.map(m=>[m.matchId,m.kills1,m.kills2,m.durationSeconds]), [['9037645797',34,32,3331]]);
  const updated = applyDotaSnapshot(publishedTournament, snapshot);
  for (const team of ['Team Borisogleb','Aegis Guardians','strela team']) assert.equal(updated.stages[0].groups[0].rows.find(r=>r.team===team).won,1);
  for (const team of ['ARB Esports','Tech Titans','liqa sto']) assert.equal(updated.stages[0].groups[0].rows.find(r=>r.team===team).lost,1);
  assert.equal(updated.stages[0].rounds[0].matches.filter(m=>m.status==='scheduled').length,5);
  assert.equal(collectDotaResults(publishedTournament, [], snapshot).changed, false);
});

test('older API outcomes cannot undo an organizer result or remove screenshot map evidence', () => {
  const stale = collectDotaResults(tournament,[first]).snapshot;
  const updated = applyDotaSnapshot(publishedTournament, stale);
  assert.equal(updated.stages[0].rounds[0].matches[3].winner,'Team Borisogleb');
  const manual = collectDotaResults(publishedTournament,[]).snapshot;
  manual.matches['dota-autumn-swiss-r1-03'].maps=[];
  assert.equal(applyDotaSnapshot(publishedTournament,manual).stages[0].rounds[0].matches[2].maps[0].matchId,'9037645797');
  manual.matches['dota-autumn-swiss-r1-04'].confirmedAt='invalid';
  assert.throws(()=>validateDotaSnapshot(manual,publishedTournament),/source/);
});

test('a conflicting older API map ID or detail never replaces explicit organizer map evidence', () => {
  const previous = collectDotaResults(publishedTournament, []).snapshot;
  const fixtureId='dota-autumn-swiss-r1-03';
  for (const edit of [map=>{map.matchId='12345';map.url='https://www.opendota.com/matches/12345';}, map=>{map.kills1=0;}]) {
    const stale=structuredClone(previous);
    delete stale.matches[fixtureId].source;
    edit(stale.matches[fixtureId].maps[0]);
    const corrected=collectDotaResults(publishedTournament,[],stale);
    assert.equal(corrected.snapshot.matches[fixtureId].maps[0].matchId,'9037645797');
    assert.equal(corrected.snapshot.matches[fixtureId].maps[0].kills1,34);
    assert.match(corrected.warnings.join(' '),/Organizer map evidence/);
    const view=applyDotaSnapshot(publishedTournament,stale);
    assert.equal(view.stages[0].rounds[0].matches[2].maps[0].matchId,'9037645797');
    assert.equal(view.stages[0].rounds[0].matches[2].maps[0].kills1,34);
  }
});
