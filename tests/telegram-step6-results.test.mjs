import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMiniAppModel } from "../src/telegram/data/model.js";
import { loadMiniAppModel } from "../src/telegram/data/load.js";
import { resolveMiniAppLocation, routeFromStartTarget } from "../src/telegram/contracts.js";
import { transformAction } from "../src/telegram/data/actions.js";
import { projectContent } from "../src/data/project-content.js";
import { syntheticFixtures } from "./fixtures/telegram/fixtures.mjs";

async function components(path) {
  const bundle = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
  const output = { exports: {} };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
  return output.exports;
}
const { TournamentScreen } = await components("src/telegram/MiniApp.jsx");
const { ResultsSection } = await components("src/telegram/ResultsSection.jsx");
const real = loadMiniAppModel();
const render = (model, section = "results") => renderToStaticMarkup(React.createElement(TournamentScreen, {
  model, route: { screen: "tournament", section }, navigate() {},
}));

// Synthetic only: an explicitly completed version of the selected tournament.
function source(change = () => {}) {
  const { tournament, registry } = structuredClone(syntheticFixtures.confirmedResult);
  tournament.id = tournament.slug = real.tournament.slug;
  registry.bindings.forEach((binding) => { binding.tournamentId = tournament.id; });
  tournament.status = "completed";
  const final = tournament.stages[0].matches[0];
  tournament.stages = [{ id: "playoffs", type: "double_elimination", title: "Плей-офф", rules: [], rounds: [{ id: "final", label: "Финал", matches: [final] }] }];
  tournament.results = { finalMatchId: final.id, placements: [{ position: 2, team: "Beta" }, { position: 1, team: "Alpha" }] };
  change(tournament, registry, final);
  return { tournament, registry };
}
const modelFor = ({ tournament, registry }) => buildMiniAppModel(tournament, registry, projectContent);

test("current tournament hides results and normalizes direct entry to overview", () => {
  const ids = real.sections.map((section) => section.id);
  assert.equal(real.results, null);
  assert.equal(ids.includes("results"), false);
  assert.doesNotMatch(render(real, "overview"), />Итоги<|tg-placements/);
  assert.equal(resolveMiniAppLocation({ pathname: "/tg/tournament", search: "?section=results", availableSections: ids }).route.section, "overview");
  assert.equal(transformAction({ label: "Итоги", target: "#results" }).route.section, "overview");
  assert.equal(routeFromStartTarget("results", ids).section, "overview");
  assert.equal(renderToStaticMarkup(React.createElement(ResultsSection, { model: real })), "");
});

test("published results render ordered places and exactly the referenced final without mutation", () => {
  const input = source();
  const before = structuredClone(input);
  const model = modelFor(input);
  const modelBefore = structuredClone(model);
  const html = render(model);
  assert.match(html, /aria-current="page">Итоги/);
  assert.ok(html.indexOf('data-position="1"') < html.indexOf('data-position="2"'));
  assert.match(html, /Счёт серии<\/span><strong>1:0/);
  assert.equal((html.match(/<details/g) || []).length, 1);
  assert.doesNotMatch(html, /Этот раздел ещё готовится|PIVNAYA KEGA|bobr1ki/);
  assert.deepEqual(input, before);
  assert.deepEqual(model, modelBefore);
  const ids = model.sections.map((section) => section.id);
  assert.equal(resolveMiniAppLocation({ pathname: "/tg/tournament", search: "?section=results", availableSections: ids }).route.section, "results");
  assert.equal(transformAction({ label: "Итоги", target: "#results" }, { hasResults: true }).route.section, "results");
  assert.equal(routeFromStartTarget("results", ids).section, "results");
});

test("a valid final without placements never manufactures podium or awards", () => {
  const model = modelFor(source((t) => { delete t.results.placements; }));
  const html = render(model);
  assert.match(html, /Итоговые места ещё не опубликованы/);
  assert.match(html, /Счёт серии<\/span><strong>1:0/);
  assert.doesNotMatch(html, /data-position|Победитель турнира|₽/);
});

test("partial placements preserve published numbers and long names", () => {
  const model = modelFor(source((t, registry) => {
    const name = "Очень-длинное-название-команды".repeat(6);
    registry.teams.push({ id: "fixture-third", name, disciplines: ["Dota 2"] });
    registry.bindings.push({ tournamentId: t.id, sourceName: name, teamId: "fixture-third" });
    t.results.placements = [{ position: 7, team: name }];
  }));
  const html = render(model);
  assert.match(html, /value="7" data-position="7"/);
  assert.equal((html.match(/data-position=/g) || []).length, 1);
  assert.ok(html.includes(model.results.placements[0].team));
});

test("results share normalized score and final details with matches and playoffs", () => {
  const model = modelFor(source((t, registry, final) => {
    final.bestOf = "BO3"; final.score1 = 2; final.score2 = 1;
    final.maps = [{ name: "Карта 1", score1: 34, score2: 21 }, { name: "Карта 2" }];
  }));
  for (const section of ["results", "matches", "playoffs"]) {
    const html = render(model, section);
    assert.match(html, /Счёт серии<\/span><strong>2:1/);
    assert.match(html, /Счёт карты: <b>34:21/);
    assert.match(html, /Счёт карты не опубликован/);
  }
  model.matches[0].result.label = "NORMALIZED_SENTINEL";
  for (const section of ["results", "matches", "playoffs"]) assert.match(render(model, section), /NORMALIZED_SENTINEL/);
});

test("technical final retains its meaning without fabricated played maps", () => {
  const model = modelFor(source((t, registry, final) => { final.status = "walkover"; final.scoreKind = "technical"; }));
  const html = render(model);
  assert.match(html, /Техническая победа/);
  assert.match(html, /Технический результат — без сыгранных карт/);
  assert.doesNotMatch(html, /Счёт серии|tg-map-results/);
});

test("missing, hidden, unknown, drawn and unconfirmed finals are rejected", () => {
  const changes = [
    (t) => { t.results.finalMatchId = "absent"; },
    (t, r, m) => { m.published = false; },
    (t, r, m) => { m.resultConfirmed = false; },
    (t, r, m) => { delete m.resultConfirmed; },
    (t, r, m) => { m.scoreKind = "unknown"; delete m.score1; delete m.score2; },
    (t, r, m) => { m.score1 = m.score2 = 0; },
  ];
  for (const change of changes) assert.throws(() => modelFor(source(change)));
});

test("inconsistent or foreign placements cannot become a visible podium", () => {
  for (const placements of [
    [{ position: 1, team: "Beta" }], [{ position: 2, team: "Alpha" }],
    [{ position: 3, team: "Alpha" }], [{ position: 3, team: "NOT_IN_TOURNAMENT" }],
    [{ position: 1, team: "Alpha" }, { position: 3, team: "Alpha" }],
    [{ position: 1, team: "Alpha" }, { position: 1, team: "Beta" }],
  ]) assert.throws(() => modelFor(source((t) => { t.results.placements = placements; })));
});
