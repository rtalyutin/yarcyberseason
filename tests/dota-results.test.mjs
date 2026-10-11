import test from "node:test";
import assert from "node:assert/strict";
import publishedTournament from "../src/data/tournaments/dota2-autumn-2026.json" with { type: "json" };
import { collectDotaResults, isPollWindow, inFixtureWindow, fixtureFor } from "../src/lib/dota-import.js";
import { validateMvpEstimates } from "../src/lib/dota-mvp.js";
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
tournament.stages[0].rounds = [tournament.stages[0].rounds[0]];
for (const match of tournament.stages[0].rounds[0].matches) {
  for (const key of ['resultSource', 'confirmationSource', 'confirmedAt', 'score1', 'score2', 'winner', 'winnerTeamId', 'maps', 'mapLinks', 'resultConfirmed', 'scoreKind']) delete match[key];
  match.status = 'scheduled';
}
tournament.stages[0].groups = [];
tournament.mvpEstimates = [];

const first = { match_id: 900000001, leagueid: 20164, start_time: Date.parse("2026-10-09T20:35:00+03:00") / 1000,
  radiant_name: "ARB Esports", dire_name: "Team Borisogleb", radiant_win: true, radiant_score: 18, dire_score: 32,
  duration: 2400, series_id: 0 };

test("published round period matches either day without inventing an appointment", () => {
  const fixture = publishedTournament.stages[0].rounds[1].matches.find((match) => match.id === 'dota-autumn-swiss-r2-06');
  const before = structuredClone(fixture);
  assert.deepEqual([fixture.team1, fixture.team2], ['Vnext', 'Easy Gaming']);
  assert.equal(fixture.scheduledAt, undefined);
  const map = { ...first, radiant_name: fixture.team1, dire_name: fixture.team2 };
  for (const date of ["2026-10-11T00:00:00+03:00", "2026-10-12T23:59:59+03:00"]) {
    const source = { ...map, start_time: Date.parse(date) / 1000 };
    assert.equal(fixtureFor(source, publishedTournament)?.id, fixture.id);
  }
  for (const date of ["2026-10-10T23:59:59+03:00", "2026-10-13T00:00:00+03:00"]) {
    assert.equal(inFixtureWindow({ ...map, start_time: Date.parse(date) / 1000 }, fixture), false);
  }
  assert.equal(inFixtureWindow(map, { windowStart: fixture.windowEnd, windowEnd: fixture.windowStart }), false);
  assert.equal(inFixtureWindow(map, { windowStart: fixture.windowStart }), false);
  assert.deepEqual(fixture, before);
});

test("approved R2 result and complete R1 publish once and update Swiss once", () => {
  const collected = collectDotaResults(publishedTournament, []);
  const view = applyDotaSnapshot(publishedTournament, collected.snapshot);
  const rows = view.stages[0].groups[0].rows;
  assert.deepEqual(rows.find((row) => row.team === "Aegis Guardians"), {
    team: "Aegis Guardians", teamId: "dota2-autumn-2026-aegis-guardians", played: 2, won: 2, lost: 0,
  });
  assert.equal(rows.find((row) => row.team === "strela team").lost, 1);
  assert.equal(rows.reduce((sum, row) => sum + row.played, 0), 28);
  assert.deepEqual(collected.snapshot.matches['dota-autumn-swiss-r2-01'].maps.map((map) => [map.matchId, map.kills1, map.kills2, map.durationSeconds]),
    [['9039436432', 37, 21, 2395]]);
  assert.equal(collectDotaResults(publishedTournament, [], collected.snapshot).changed, false);
});

test("confirmed second-round KEGA technical loss changes Swiss without played statistics or MVP", () => {
  const technical = publishedTournament.stages[0].rounds[1].matches.find((match) => match.id === 'dota-autumn-swiss-r2-08');
  assert.deepEqual([technical.team1, technical.team2], ['Tech Titans', 'PIVNAYA KEGA']);
  assert.equal(technical.status, 'walkover');
  assert.equal(technical.resultConfirmed, true);
  assert.deepEqual(technical.maps, []);
  const { snapshot } = collectDotaResults(publishedTournament, []);
  assert.deepEqual(snapshot.matches[technical.id].maps, []);
  const view = applyDotaSnapshot(publishedTournament, snapshot);
  const rows = view.stages[0].groups[0].rows;
  assert.equal(rows.find((row) => row.team === 'Tech Titans').won, 1);
  assert.equal(rows.find((row) => row.team === 'PIVNAYA KEGA').lost, 2);
  // Synthetic attempted injection is test-only, never source tournament data.
  assert.throws(() => validateMvpEstimates([{ matchId: '1', fixtureId: technical.id,
    winnerTeamId: technical.team1Id, confirmed: true, played: true, reason: 'SYNTHETIC attempted technical MVP' }], publishedTournament),
    /Technical victory without a played map cannot receive MVP estimates/);
});

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

const easyFixture = publishedTournament.stages[0].rounds[0].matches[1];
const easyMap = { ...first, match_id: Number(easyFixture.maps[0].matchId),
  start_time: Date.parse(easyFixture.scheduledAt) / 1000,
  radiant_name: easyFixture.team1, dire_name: easyFixture.team2,
  radiant_team_id: easyFixture.opendotaTeamIds.team1, dire_team_id: easyFixture.opendotaTeamIds.team2,
  radiant_win: false, radiant_score: 18, dire_score: 41, duration: 1544 };
const additionalEasyMap = { ...easyMap, match_id: 9038788632, radiant_score: 0, dire_score: 0, duration: 3061 };

test("complete organizer map set keeps an additional API record from making a confirmed BO1 ambiguous", () => {
  const previous = collectDotaResults(publishedTournament, []).snapshot;
  for (const maps of [[easyMap, additionalEasyMap], [additionalEasyMap]]) {
    const result = collectDotaResults(publishedTournament, maps, previous);
    assert.equal(result.changed, false);
    assert.equal(result.snapshot, previous);
    assert.deepEqual(result.snapshot.matches[easyFixture.id].maps.map((map) => map.matchId), ['9038793515']);
    assert.deepEqual(result.warnings, [`Additional map 9038788632 outside organizer-confirmed map set for ${easyFixture.id}`]);
  }
});

test("additional records remain ambiguous without a complete organizer map set", () => {
  for (const edit of [fixture => { fixture.maps = []; }, fixture => { delete fixture.resultSource; }]) {
    const source = structuredClone(publishedTournament);
    edit(source.stages[0].rounds[0].matches[1]);
    assert.ok(collectDotaResults(source, [easyMap, additionalEasyMap]).warnings.includes(`Ambiguous series ${easyFixture.id}`));
  }
  const partial = structuredClone(publishedTournament);
  const fixture = partial.stages[0].rounds[0].matches[1];
  fixture.bestOf = 'BO3'; fixture.score1 = 1; fixture.score2 = 2;
  const maps = [easyMap, { ...easyMap, match_id: 9038793516, radiant_win: true },
    { ...easyMap, match_id: 9038793517 }, additionalEasyMap].map((map) => ({ ...map, series_id: 777 }));
  assert.ok(collectDotaResults(partial, maps).warnings.includes(`Ambiguous series ${fixture.id}`));
});

test("contradictory official API map still conflicts with the organizer confirmation", () => {
  const previous = collectDotaResults(publishedTournament, []).snapshot;
  for (const edit of [{ radiant_win: true }, { radiant_score: 19 }, { duration: 1545 }]) {
    const result = collectDotaResults(publishedTournament, [{ ...easyMap, ...edit }, additionalEasyMap], previous);
    assert.equal(result.changed, false);
    assert.equal(result.snapshot, previous);
    assert.ok(result.warnings.includes(`Conflict with published result ${easyFixture.id}`));
  }
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

test('organizer results publish confirmed outcomes with no fabricated map or technical MVP', () => {
  const { snapshot, changed } = collectDotaResults(publishedTournament, []);
  assert.equal(changed, true);
  assert.equal(Object.keys(snapshot.matches).length, 9);
  assert.deepEqual([snapshot.matches['dota-autumn-swiss-r1-04'].score1, snapshot.matches['dota-autumn-swiss-r1-04'].score2], [1,0]);
  assert.equal(snapshot.matches['dota-autumn-swiss-r1-04'].maps[0].matchId, '9036860954');
  const technical = snapshot.matches['dota-autumn-swiss-r1-05'];
  assert.equal(technical.status, 'walkover');
  assert.deepEqual([technical.score1, technical.score2, technical.maps.length], [0,1,0]);
  assert.deepEqual(snapshot.matches['dota-autumn-swiss-r1-03'].maps.map(m=>[m.matchId,m.kills1,m.kills2,m.durationSeconds]), [['9037645797',34,32,3331]]);
  const updated = applyDotaSnapshot(publishedTournament, snapshot);
  for (const team of ['Team Borisogleb','strela team']) assert.equal(updated.stages[0].groups[0].rows.find(r=>r.team===team).won,1);
  for (const team of ['ARB Esports','Tech Titans']) assert.equal(updated.stages[0].groups[0].rows.find(r=>r.team===team).lost,1);
  assert.equal(updated.stages[0].groups[0].rows.find(r=>r.team==='liqa sto').lost,2);
  assert.equal(updated.stages[0].rounds[0].matches.filter(m=>m.status==='scheduled').length,0);
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
