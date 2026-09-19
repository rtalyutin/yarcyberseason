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
test("step6 schedule renders the exact published timeline, not fabricated pairings", () => {
  const html = render(real, "schedule");
  for (const item of real.timeline) {
    assert.ok(html.includes(item.label)); assert.ok(html.includes(item.date));
  }
  assert.match(html, /Матчи ещё не опубликованы/);
  assert.ok(!html.includes("data-match-key"));
  assert.ok(!html.includes("0:0"));
  assert.ok(!html.includes("00:00"));
});
test("step6 empty rules and schedule remain distinct from pending implementation", () => {
  const model = fixture("empty");
  assert.match(render(model, "rules"), /Регламент ещё не опубликован/);
  assert.match(render(model, "schedule"), /Расписание ещё не опубликовано/);
  assert.match(render(model, "swiss"), /Этот раздел ещё готовится/);
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
  assert.ok(!html.includes("МСК") && !html.includes("00:00"));
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
  assert.equal((nav.match(/<button/g) || []).length, 5);
  assert.match(nav, /aria-current="page"[^>]*>Формат/);
  assert.ok(!nav.includes("Плей-офф") && !nav.includes("Итоги"));
  render(real, "schedule");
  assert.deepEqual(real, before);
});
test("step6 matches is wired into the existing tournament screen and section menu", () => {
  const html = render(real, "matches");
  assert.match(html, /aria-current="page"[^>]*>Матчи/);
  assert.match(html, /<h2 id="matches-title">Матчи/);
  assert.match(html, /Матчи ещё не опубликованы/);
  assert.doesNotMatch(html, /Этот раздел ещё готовится/);
});
