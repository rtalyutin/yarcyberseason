import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadMiniAppModel } from "../src/telegram/data/load.js";
import { buildMiniAppModel } from "../src/telegram/data/model.js";
import { projectContent } from "../src/data/project-content.js";
import { syntheticFixtures } from "./fixtures/telegram/fixtures.mjs";

async function components(path) {
  const bundle = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
  const output = { exports: {} };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
  return output.exports;
}
const { SwissSection, PlayoffSection } = await components("src/telegram/StageSections.jsx");
const { TournamentScreen } = await components("src/telegram/MiniApp.jsx");
const real = loadMiniAppModel();
const render = (component, model, extra = {}) => renderToStaticMarkup(React.createElement(component, { model, ...extra }));

function fixture(name = "empty", edit = () => {}) {
  const { tournament, registry } = structuredClone(syntheticFixtures[name]);
  const oldId = tournament.id;
  tournament.id = tournament.slug = real.tournament.slug;
  registry.bindings.forEach((binding) => { if (binding.tournamentId === oldId) binding.tournamentId = tournament.id; });
  edit(tournament);
  return buildMiniAppModel(tournament, registry, projectContent);
}
const playoff = (rounds) => ({ id: "playoffs", type: "double_elimination", title: "Плей-офф", rules: [], rounds });
const round = (id, matches) => ({ id, label: id, matches });
const pair = (overrides = {}) => ({ id: "first", team1: "Alpha", team2: "Beta", status: "scheduled", ...overrides });

test("real Swiss remains empty with published rules; seven playoff slots are not matches", () => {
  const swiss = render(SwissSection, real), bracket = render(PlayoffSection, real);
  assert.match(swiss, /Таблица Swiss ещё не опубликована/);
  assert.match(swiss, /Правила этапа/);
  assert.match(swiss, /3 победы/);
  assert.doesNotMatch(swiss, /<table/);
  assert.equal((bracket.match(/class="tg-empty-slot"/g) || []).length, 7);
  assert.match(bracket, /Верхняя сетка/);
  assert.match(bracket, /Нижняя сетка/);
  assert.match(bracket, /Гранд-финал/);
  assert.match(bracket, /Переходы между парами ещё не опубликованы/);
  assert.doesNotMatch(bracket, /data-match-key=|tg-bracket-transition|0:0/);
  assert.equal(real.matches.length, 0);
});

test("Swiss renders published columns, order, null, zero, seed and locked place", () => {
  const model = fixture("empty", (t) => { t.stages = [{ id: "swiss", type: "swiss", title: "Swiss", groups: [{ id: "a", title: "Группа A", recordColumnLabel: "Карты", finalColumnLabel: "Баллы", rows: [
    { position: 2, team: "Beta", played: 0, won: 0, lost: 0, mapRecord: null, points: 0, seed: 7, placeLocked: true },
    { position: 1, team: "Alpha", played: 1, won: 1, lost: null, mapRecord: "1:0", points: 3 },
  ] }] }]; });
  const html = render(SwissSection, model);
  assert.ok(html.indexOf("Alpha") < html.indexOf("Beta"));
  assert.match(html, /<caption>Группа A<\/caption>/);
  assert.match(html, /scope="col">Карты/);
  assert.match(html, /scope="col">Баллы/);
  assert.match(html, /scope="row"/);
  assert.match(html, /Посев 7/);
  assert.match(html, /Место зафиксировано/);
  assert.ok((html.match(/<td>0<\/td>/g) || []).length >= 4);
  assert.match(html, /<td>—<\/td>/);
  assert.doesNotMatch(html, /href=.*teams|Matchday/);
});

test("Swiss keeps source order without positions and preserves empty groups and rounds", () => {
  const model = fixture("empty", (t) => { t.stages = [{ id: "swiss", type: "swiss", title: "Swiss", groups: [
    { id: "a", title: "Заполненная", rows: [{ team: "Beta", won: 0 }, { team: "Alpha", won: null }] },
    { id: "b", title: "Ожидающая группа", rows: [] },
  ], rounds: [round("Опубликованный будущий раунд", []), round("Swiss", [])] }]; });
  const html = render(SwissSection, model);
  assert.ok(html.indexOf("Beta") < html.indexOf("Alpha"));
  assert.match(html, /Ожидающая группа/);
  assert.match(html, /Опубликованный будущий раунд/);
  assert.match(html, /class="tg-bracket-round" aria-label="Swiss"/);
  assert.match(html, /Пары раунда ещё не опубликованы/);
  assert.doesNotMatch(html, /Посев|Место зафиксировано/);
});

test("playoffs use explicit winner and loser transitions to empty targets only", () => {
  const model = fixture("empty", (t) => { t.stages = [playoff([
    round("R1", [pair({ winnerTo: { matchId: "final", slot: 1 }, loserTo: { matchId: "lower", slot: 2 } })]),
    round("Lower", [{ id: "lower" }]), round("Final", [{ id: "final" }, { id: "unconnected" }]),
  ])]; });
  const html = render(PlayoffSection, model);
  assert.equal((html.match(/class="tg-bracket-transition/g) || []).length, 2);
  assert.match(html, /Победитель → Final · Пара 1 · участник 1/);
  assert.match(html, /Проигравший → Lower · Пара 1 · участник 2/);
  assert.equal((html.match(/data-match-key=/g) || []).length, 1);
  assert.equal((html.match(/class="tg-empty-slot"/g) || []).length, 3);
  assert.match(html, /aria-controls="tg-slot-/);
});

test("explicit transitions between empty slots survive without creating matches", () => {
  const model = fixture("empty", (t) => { t.stages = [playoff([round("First", [
    { id: "a", winnerTo: { matchId: "b" } }, { id: "b" },
  ])])]; });
  assert.equal(model.matches.length, 0);
  assert.equal(model.stages[0].edges.length, 1);
  const html = render(PlayoffSection, model);
  assert.match(html, /Победитель → First · Пара 2/);
  assert.doesNotMatch(html, /data-match-key=|участник 1|0:0/);
});

test("hidden slots and their incoming/outgoing transitions never leak", () => {
  const model = fixture("empty", (t) => { t.stages = [playoff([round("Public round", [
    pair({ winnerTo: { matchId: "secret-hidden" } }),
    pair({ id: "secret-hidden", published: false, note: "SECRET-NOTE", winnerTo: { matchId: "next" } }),
    { id: "next" },
  ])])]; });
  const html = render(PlayoffSection, model);
  assert.doesNotMatch(html, /SECRET|secret-hidden|tg-bracket-transition/);
  assert.equal(model.stages[0].edges.length, 0);
});

test("partial pair stays unresolved and unconfirmed result/maps stay hidden in playoffs", () => {
  const model = fixture("empty", (t) => { t.stages = [playoff([round("Partial", [pair({
    team2: null, resultConfirmed: false, scoreKind: "series", score1: 99, score2: 88,
    maps: [{ name: "SECRET-MAP", score1: 72, score2: 61 }],
  })])])]; });
  const html = render(PlayoffSection, model);
  assert.match(html, /Alpha/);
  assert.match(html, /Соперник ещё не определён/);
  assert.doesNotMatch(html, /99:88|SECRET-MAP|72:61/);
  assert.equal((html.match(/data-match-key=/g) || []).length, 1);
});

test("playoff cards reuse confirmed series/maps and distinguish technical results", () => {
  const completed = fixture("empty", (t) => { t.stages = [playoff([round("Final", [pair({ status: "completed", resultConfirmed: true, scoreKind: "series", score1: 0, score2: 2, maps: [{ name: "Map A", score1: 40, score2: 30 }] })])])]; });
  const html = render(PlayoffSection, completed);
  assert.match(html, /Счёт серии/); assert.match(html, /0:2/); assert.match(html, /40:30/);
  const technical = fixture("empty", (t) => { t.stages = [playoff([round("Final", [pair({ status: "walkover", resultConfirmed: true, scoreKind: "technical", score1: 1, score2: 0, maps: [{ name: "UNPLAYED", score1: 40, score2: 30 }] })])])]; });
  const techHtml = render(PlayoffSection, technical);
  assert.match(techHtml, /Технический результат/);
  assert.doesNotMatch(techHtml, /UNPLAYED|40:30|Счёт серии/);
});

test("both new sections are reachable within TournamentScreen with existing navigation", () => {
  for (const section of ["swiss", "playoffs"]) {
    const html = render(TournamentScreen, real, { route: { screen: "tournament", section } });
    assert.match(html, new RegExp(`aria-current="page">${section === "swiss" ? "Swiss" : "Плей-офф"}`));
    for (const label of ["О турнире", "Участники", "Формат", "Расписание", "Матчи", "Swiss", "Плей-офф"]) assert.ok(html.includes(`>${label}</button>`));
    assert.doesNotMatch(html, /Раздел готовится|Matchday|href="\/teams/);
  }
});
