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

const bundle = await build({ entryPoints: ["src/telegram/MiniApp.jsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const output = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
const { TournamentScreen } = output.exports;
const render = (model, section) => renderToStaticMarkup(React.createElement(TournamentScreen, {
  model, route: { screen: "tournament", section }, navigate() {},
}));
const real = loadMiniAppModel();
function fixture(name, change = () => {}) {
  const { tournament, registry } = structuredClone(syntheticFixtures[name]);
  const oldId = tournament.id;
  tournament.id = tournament.slug = real.tournament.slug;
  for (const binding of registry.bindings) if (binding.tournamentId === oldId) binding.tournamentId = tournament.id;
  change(tournament);
  return buildMiniAppModel(tournament, registry, projectContent);
}

test("step6 rules render all published stage rules and participation conditions", () => {
  const html = render(real, "rules");
  for (const stage of real.stages) {
    assert.ok(html.includes(stage.title));
    if (stage.notice) assert.ok(html.includes(stage.notice));
    for (const rule of stage.rules) assert.ok(html.includes(rule.value));
  }
  for (const rule of real.rewards.referralContest.rules) assert.ok(html.includes(rule));
  assert.ok(html.includes(real.registration.message));
  assert.ok(!html.includes("Этот раздел ещё готовится"));
  assert.ok(!html.includes("forms.yandex"));
});
test("step6 schedule renders completed first two rounds and third-round results with honest partial dates", () => {
  const html = render(real, "schedule");
  for (const item of real.timeline) {
    assert.ok(html.includes(item.label)); assert.ok(html.includes(item.date));
  }
  assert.equal((html.match(/data-match-key=/g) || []).length, 24);
  assert.equal((html.match(/data-match-key="dota2-autumn-2026\/dota-autumn-swiss-r1-/g) || []).length, 8);
  assert.equal((html.match(/data-match-key="dota2-autumn-2026\/dota-autumn-swiss-r2-/g) || []).length, 8);
  assert.equal((html.match(/data-match-key="dota2-autumn-2026\/dota-autumn-swiss-r3-/g) || []).length, 8);
  assert.match(html, /11–12 октября/);
  const secondRound = real.matches.filter((match) => match.id.startsWith("dota-autumn-swiss-r2-"));
  assert.ok(secondRound.every((match) => match.result.confirmed));
  const partialDates = secondRound.filter((match) => match.scheduledAt === null);
  assert.deepEqual(partialDates.map((match) => match.id), ["dota-autumn-swiss-r2-06", "dota-autumn-swiss-r2-07", "dota-autumn-swiss-r2-08"]);
  assert.ok(partialDates.every((match) => match.dateDisplay === "11–12 октября" && match.result.score !== null));
  const psb = secondRound.find((match) => match.id === "dota-autumn-swiss-r2-05");
  assert.equal(psb.scheduledAt, "2026-10-11T15:00:00+03:00");
  assert.deepEqual(psb.result.score, [0, 1]);
  const pendingThirdRound = real.matches.filter((match) => match.id.startsWith("dota-autumn-swiss-r3-") && match.status === "scheduled");
  assert.deepEqual(pendingThirdRound.map((match) => match.id), ["dota-autumn-swiss-r3-03", "dota-autumn-swiss-r3-04", "dota-autumn-swiss-r3-06", "dota-autumn-swiss-r3-08"]);
  assert.ok(pendingThirdRound.every((match) => match.scheduledAt === null && match.dateDisplay === "12 октября 2026 г." && match.result.score === null));
  assert.match(html, /15:00 МСК/);
  assert.match(html, /22:00 МСК/);
  assert.match(html, /18:00 МСК/);
  assert.match(html, /19:00 МСК/);
  assert.equal(real.matches.filter((match) => match.result.confirmed).length, 20);
  const technicalDecider = real.matches.find((match) => match.id === "dota-autumn-swiss-r3-02");
  assert.deepEqual(technicalDecider.result.score, [2, 1]);
  assert.deepEqual(technicalDecider.result.maps.map((map) => map.id), ["9041929139", "9042061641"]);
  assert.match(html, /Третья карта не игралась/);
  assert.match(html, /Team Borisogleb.*ARB Esports/);
  assert.match(html, /Завершён/);
  assert.match(html, /Техническая победа/);
  assert.doesNotMatch(html, /Запланирована трансляция матча/);
  assert.match(html, /20:30 МСК/);
  assert.ok(!/>0\s*:\s*0</.test(html));
  assert.ok(!html.includes("в 00:00"));
});
test("step6 implemented sections use their distinct empty states", () => {
  const model = fixture("empty");
  assert.match(render(model, "rules"), /Регламент ещё не опубликован/);
  assert.match(render(model, "schedule"), /Расписание ещё не опубликовано/);
  assert.match(render(model, "swiss"), /Таблица Swiss ещё не опубликована/);
});
test("step6 exact offset timestamp uses L2 Moscow label and keeps source status", () => {
  const model = fixture("scheduledMatch", (t) => { t.stages[0].matches[0].scheduledAt = "2020-01-01T23:30:00Z"; });
  const html = render(model, "schedule");
  assert.match(html, /2 января 2020 г\..*02:30 МСК/);
  assert.match(html, /Запланирован/);
  assert.ok(!html.includes("Идёт"));
});
test("step6 date-only and unknown-zone text never acquire fabricated time or Moscow label", () => {
  const dateOnly = fixture("scheduledMatch", (t) => {
    delete t.stages[0].matches[0].scheduledAt;
    t.stages[0].matches[0].date = "2026-10-11";
  });
  const html = render(dateOnly, "schedule");
  assert.match(html, /11 октября 2026 г./);
  assert.ok(!html.includes("МСК") && !html.includes("в 00:00"));
  const uncertain = fixture("scheduledMatch", (t) => {
    delete t.stages[0].matches[0].scheduledAt;
    t.stages[0].matches[0].dateDisplay = "11 октября 18:00";
  });
  assert.match(render(uncertain, "schedule"), /11 октября 18:00 · часовой пояс не указан/);
});
test("step6 partial pair and undated match remain visible without invented opponent", () => {
  const model = fixture("scheduledMatch", (t) => {
    delete t.stages[0].matches[0].scheduledAt;
    delete t.stages[0].matches[0].team2;
  });
  const html = render(model, "schedule");
  assert.match(html, /Соперник ещё не определён/);
  assert.match(html, /Дата уточняется/);
  assert.equal((html.match(/data-match-key=/g) || []).length, 1);
});
test("step6 hidden match and ID-only slot do not leak into schedule", () => {
  assert.ok(!render(fixture("hiddenBracketMatch"), "schedule").includes("data-match-key"));
  const html = render(fixture("assignedToEmptySlot"), "schedule");
  assert.equal((html.match(/data-match-key=/g) || []).length, 1);
  assert.ok(!html.includes("/m2"));
});
test("step6 unconfirmed completion is labelled pending, no raw score is displayed", () => {
  const html = render(fixture("unconfirmedResult"), "schedule");
  assert.match(html, /Результат ожидает подтверждения/);
  assert.ok(!html.includes("1:0"));
});
test("step6 unconfirmed technical outcomes also await confirmation", () => {
  for (const status of ["walkover", "bye"]) {
    const html = render(fixture("technicalVictory", (t) => {
      t.stages[0].matches[0].status = status;
      t.stages[0].matches[0].resultConfirmed = false;
    }), "schedule");
    assert.match(html, /Результат ожидает подтверждения/);
    assert.ok(!html.includes("Техническая победа") && !html.includes("Проход без игры"));
  }
});
test("step6 published cancellation or postponement is not called missing status", () => {
  for (const [status, label] of [["cancelled", "Отменён"], ["postponed", "Перенесён"]]) {
    const html = render(fixture("scheduledMatch", (t) => { t.stages[0].matches[0].status = status; }), "schedule");
    assert.ok(html.includes(label));
    assert.ok(!html.includes("Статус не опубликован"));
  }
});
test("step6 navigation exposes only implemented sections and rendering is read-only", () => {
  const before = structuredClone(real);
  const html = render(real, "rules");
  const nav = html.match(/<nav.*?<\/nav>/s)[0];
  assert.equal((nav.match(/<button/g) || []).length, 7);
  assert.match(nav, /aria-current="page"[^>]*>Формат/);
  assert.ok(nav.includes("Swiss") && nav.includes("Плей-офф") && !nav.includes("Итоги"));
  render(real, "schedule");
  assert.deepEqual(real, before);
});
test("step6 matches is wired into the existing tournament screen and section menu", () => {
  const html = render(real, "matches");
  assert.match(html, /aria-current="page"[^>]*>Матчи/);
  assert.match(html, /<h2 id="matches-title">Матчи/);
  assert.match(html, /Team Borisogleb.*ARB Esports/);
  assert.doesNotMatch(html, /Этот раздел ещё готовится/);
});
