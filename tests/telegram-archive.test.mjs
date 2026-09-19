import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadMiniAppModel, loadArchivedModels } from "../src/telegram/data/load.js";
import { homeRoute, tournamentRoute, serializeMiniAppRoute, resolveMiniAppLocation, validateMiniAppModel } from "../src/telegram/contracts.js";
import { createMiniAppRouter } from "../src/telegram/router.js";

const current = loadMiniAppModel();
const archives = loadArchivedModels();
const models = new Map([current, ...archives].map((model) => [model.tournament.slug, model]));
const tournamentSlugs = [...models.keys()];
const availableSections = (slug) => models.get(slug).sections.map((section) => section.id);
const resolve = (search) => resolveMiniAppLocation({ pathname: "/tg/tournament", search, availableSections, tournamentSlugs });

test("archive catalog contains only the four published completed tournaments; current stays isolated", () => {
  assert.deepEqual(archives.map((model) => model.tournament.slug), ["cs2-august-2026", "dota2-main-2026", "cs2-february-2026", "dota2-qual-2026"]);
  assert.deepEqual(archives.map((model) => model.matches.length), [45, 29, 33, 13]);
  assert.equal(current.matches.length, 0);
  assert.equal(current.participants.length, 16);
  assert.equal(current.results, null);
  for (const model of models.values()) {
    assert.deepEqual(validateMiniAppModel(model), []);
    assert.ok(model.matches.every((match) => match.tournamentId === model.tournament.id));
    for (const action of model.actions.filter((action) => action.kind === "internal")) {
      assert.equal(action.route.tournamentSlug || current.tournament.slug, model.tournament.slug);
    }
  }
  const mixed = structuredClone(current); mixed.matches.push(archives[0].matches[0]);
  assert.ok(validateMiniAppModel(mixed).some((error) => error.includes("another tournament")));
  assert.throws(() => loadMiniAppModel("unpublished"), /Unknown/);
});

test("archive direct links, explicit overview and each available section retain tournament identity", () => {
  for (const model of archives) {
    const slug = model.tournament.slug;
    assert.equal(resolve(`?tournament=${slug}`).route.section, model.results ? "results" : "standings");
    for (const section of model.sections) {
      const route = tournamentRoute(section.id, slug);
      const url = new URL(serializeMiniAppRoute(route), "https://test.invalid");
      assert.deepEqual(resolve(url.search).route, route);
    }
  }
  assert.deepEqual(resolve("?tournament=unknown&section=results").route, tournamentRoute());
  assert.deepEqual(resolve("?tournament=dota2-qual-2026&section=playoffs").route, tournamentRoute("overview", "dota2-qual-2026"));
});

test("archive router keeps selection through sections, history and remount; back opens current home", () => {
  const events = new Map();
  const win = { location: {}, history: {}, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: (name) => events.delete(name) };
  const address = (url) => { const parsed = new URL(url, "https://test.invalid"); Object.assign(win.location, { pathname: parsed.pathname, search: parsed.search }); };
  address("/tg");
  for (const method of ["pushState", "replaceState"]) win.history[method] = (state, _, url) => { win.history.state = state; address(url); };
  const port = { readLaunchTarget: () => null };
  let router = createMiniAppRouter(win, port, availableSections, tournamentSlugs);
  router.navigate(tournamentRoute("results", "cs2-august-2026"));
  router.navigate(tournamentRoute("matches", "cs2-august-2026"));
  assert.equal(win.location.search, "?tournament=cs2-august-2026&section=matches");
  router.dispose(); router = createMiniAppRouter(win, port, availableSections, tournamentSlugs);
  assert.deepEqual(router.getSnapshot().route, tournamentRoute("matches", "cs2-august-2026"));
  address("/tg/tournament?tournament=dota2-main-2026&section=playoffs"); events.get("popstate")();
  assert.deepEqual(router.getSnapshot().route, tournamentRoute("playoffs", "dota2-main-2026"));
  router.navigate(homeRoute()); assert.equal(win.location.pathname, "/tg"); assert.equal(win.location.search, "");
  router.dispose();
});

const bundle = await build({ entryPoints: ["src/telegram/MiniApp.jsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const module = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { HomeScreen, TournamentScreen, ArchiveList } = module.exports;
const render = (model, section) => renderToStaticMarkup(React.createElement(TournamentScreen, { model, route: tournamentRoute(section, model.tournament.slug), navigate() {} }));

test("archive cards invoke their own destination and real screen headings distinguish seasons", () => {
  const clicked = [];
  const element = ArchiveList({ archives, navigate: (route) => clicked.push(route) });
  element.props.children[1].props.children.forEach((item) => item.props.children.props.onClick());
  assert.deepEqual(clicked.map((route) => route.tournamentSlug), archives.map((model) => model.tournament.slug));
  const home = renderToStaticMarkup(React.createElement(HomeScreen, { model: current, archives, navigate() {} }));
  assert.match(home, /Прошедшие турниры/); assert.match(home, /16 \/ 16/);
  for (const model of archives) {
    const screen = TournamentScreen({ model, route: tournamentRoute("overview", model.tournament.slug), navigate: (route) => clicked.push(route) });
    screen.props.children[1].props.children.forEach((button) => button.props.onClick());
    assert.ok(clicked.slice(-model.sections.length).every((route) => route.tournamentSlug === model.tournament.slug));
    assert.match(render(model, "participants"), /Участник турнира/);
    assert.match(render(model, "participants"), /Записей команд/);
    assert.match(render(model, "participants"), /Список может быть неполным/);
    assert.doesNotMatch(render(model, "participants"), /Регистрация|Текущий турнир/);
  }
});

test("real archive tables, partial playoffs, unknown year and confirmed final preserve source meaning", () => {
  const [cs2, main, february, qual] = archives;
  assert.match(render(cs2, "results"), /PIVNAYA KEGA/);
  const final = cs2.matches.find((match) => match.id === cs2.results.finalMatchId);
  assert.deepEqual(final.result.score, [2, 3]); assert.equal(final.result.maps.length, 0);
  assert.equal(main.stages.find((stage) => stage.id === "playoffs").edges.length, 0);
  assert.match(render(main, "playoffs"), /Исходная сетка не сохранена целиком/);
  assert.deepEqual(main.stages.find((stage) => stage.id === "groups").tables.map((table) => table.rows.length), [4, 4, 4, 4]);
  assert.equal(february.results, null);
  assert.equal(qual.tournament.dates.start, null); assert.equal(qual.tournament.dates.end, null);
  assert.match(render(qual, "schedule"), /год в карточках не указан/);
  assert.equal(qual.stages[0].tables[0].rows.length, 22);
  assert.match(render(qual, "standings"), /<td>-6<\/td>/);
  assert.ok(!qual.sections.some((section) => section.id === "playoffs"));
});
