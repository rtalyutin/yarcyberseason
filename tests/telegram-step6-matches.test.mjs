import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadMiniAppModel } from "../src/telegram/data/load.js";
import { buildMiniAppModel } from "../src/telegram/data/model.js";
import { validateMiniAppModel } from "../src/telegram/contracts.js";
import { projectContent } from "../src/data/project-content.js";
import { syntheticFixtures } from "./fixtures/telegram/fixtures.mjs";

const bundle = await build({ entryPoints: ["src/telegram/MatchesSection.jsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const output = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
const { MatchesSection, MatchDetails, MatchResult } = output.exports;
const real = loadMiniAppModel();
const render = (model) => renderToStaticMarkup(React.createElement(MatchesSection, { model }));

// Explicit synthetic fixture only; never imported by application source.
function fixture(name, change = () => {}) {
  assert.equal(syntheticFixtures[name].fixture, true);
  const { tournament, registry } = structuredClone(syntheticFixtures[name]);
  const oldId = tournament.id;
  tournament.id = tournament.slug = real.tournament.slug;
  for (const binding of registry.bindings) if (binding.tournamentId === oldId) binding.tournamentId = tournament.id;
  change(tournament);
  return buildMiniAppModel(tournament, registry, projectContent);
}
const editMatch = (edit) => (t) => edit(t.stages[0].matches[0]);

test("matches real tournament shows eight planned first-round pairs without invented times or scores", () => {
  assert.equal(real.matches.length, 8);
  const html = render(real);
  assert.equal((html.match(/<details class="tg-match-row"/g) || []).length, 8);
  assert.match(html, /Team Borisogleb.*ARB Esports/);
  assert.match(html, /Запланирована трансляция матча/);
  assert.doesNotMatch(html, /00:00|18:00|0:0|Alpha|bobr1ki|Этот раздел ещё готовится/);
});
test("matches use inline native disclosure with published pair, round, format and Moscow date", () => {
  const model = fixture("scheduledMatch");
  const html = render(model);
  assert.match(html, /<details[^>]+data-match-key="dota2-autumn-2026\/m1"><summary>/);
  for (const value of ["Alpha", "Beta", "Swiss", "BO1", "10 октября 2026 г.", "18:00 МСК", "Запланирован", "Подробнее", "Подтверждённого счёта пока нет"]) assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /href=|aria-expanded=|0:0|<details[^>]*open=/);
  assert.deepEqual(model, fixture("scheduledMatch"));
});
test("matches hide unpublished records and empty announced slots", () => {
  assert.doesNotMatch(render(fixture("hiddenBracketMatch")), /<details/);
  const html = render(fixture("assignedToEmptySlot"));
  assert.equal((html.match(/<details/g) || []).length, 1);
  assert.doesNotMatch(html, /data-match-key="[^"]*\/m2"/);
});
test("confirmed series and Dota map statistics remain separate", () => {
  const model = fixture("confirmedResult", editMatch((m) => {
    m.bestOf = "BO3"; m.score1 = 2; m.score2 = 1;
    m.maps = [{ id: "one", name: "Карта 1", score1: 31, score2: 22 }, { name: "Карта 2", outcome: "Сведения неполные" }];
  }));
  const html = render(model);
  assert.match(html, /Счёт серии<\/span><strong>2:1/);
  assert.match(html, /Счёт карты: <b>31:22/);
  assert.match(html, /Счёт карты не опубликован/);
  assert.match(html, /Сведения неполные/);
  assert.equal(model.matches[0].result.score.join(":"), "2:1");
});
test("confirmed match without maps never fabricates map results", () => {
  const html = render(fixture("confirmedResult"));
  assert.match(html, /Счёт серии<\/span><strong>1:0/);
  assert.match(html, /Сведения о картах ещё не опубликованы/);
  assert.doesNotMatch(html, /tg-map-results/);
});
test("unconfirmed final and technical outcomes do not expose raw scores or maps", () => {
  for (const status of ["completed", "walkover", "bye"]) {
    const name = status === "completed" ? "unconfirmedResult" : "technicalVictory";
    const model = fixture(name, editMatch((m) => {
      m.status = status; m.resultConfirmed = false;
      m.maps = [{ name: "NOT_PUBLIC_MAP", score1: 31, score2: 22 }];
    }));
    const html = render(model);
    assert.match(html, /Результат ожидает подтверждения/);
    assert.doesNotMatch(html, /1:0|31:22|NOT_PUBLIC_MAP|Техническая победа|Проход без игры/);
  }
});
test("confirmed technical outcomes show technical score and explicitly no played maps", () => {
  for (const [status, label] of [["walkover", "Техническая победа"], ["bye", "Проход без игры"]]) {
    const html = render(fixture("technicalVictory", editMatch((m) => {
      m.status = status; m.maps = [{ name: "DO_NOT_RENDER", score1: 31, score2: 22 }];
    })));
    assert.ok(html.includes(label));
    assert.match(html, /<strong>1:0/);
    assert.match(html, /Технический результат — без сыгранных карт/);
    assert.doesNotMatch(html, /Счёт серии|DO_NOT_RENDER|31:22/);
  }
});
test("missing score cannot fall back to raw sourceScore; normalized draw is labelled", () => {
  const result = structuredClone(fixture("confirmedResult").matches[0].result);
  result.score = null;
  const html = renderToStaticMarkup(React.createElement(MatchResult, { result }));
  assert.match(html, /Счёт не опубликован/);
  assert.doesNotMatch(html, /1:0/);
  result.score = [1, 1]; result.draw = true;
  assert.match(renderToStaticMarkup(React.createElement(MatchResult, { result })), /Ничья/);
});
test("matches preserve cancelled, postponed, unknown status and partial pair/date", () => {
  for (const [status, label] of [["cancelled", "Отменён"], ["postponed", "Перенесён"], ["unknown", "Статус не опубликован"]]) {
    const html = render(fixture("scheduledMatch", editMatch((m) => { m.status = status; delete m.team2; delete m.scheduledAt; })));
    assert.ok(html.includes(label));
    assert.match(html, /Соперник ещё не определён/);
    assert.match(html, /Дата уточняется/);
    assert.doesNotMatch(html, /00:00|МСК/);
  }
});
test("map contract rejects malformed UI payloads before render", () => {
  const model = fixture("confirmedResult");
  for (const map of [{}, { id: null, name: "Карта", score: [1, -1], unit: "Счёт карты", outcome: null }, { id: null, name: "Карта", score: null, unit: "Счёт карты", outcome: {} }]) {
    model.matches[0].result.maps = [map];
    assert.ok(validateMiniAppModel(model).some((e) => e.includes("NormalizedMap")));
  }
});
test("match actions accept published HTTPS aliases, deduplicate and reject unsafe URLs", () => {
  const model = fixture("scheduledMatch", editMatch((m) => {
    m.streamUrl = "https://example.com/live"; m.broadcastUrl = m.streamUrl;
    m.replayUrl = "javascript:alert(1)"; m.documentUrl = "https://user:pass@example.com/private";
  }));
  assert.deepEqual(model.matches[0].links, [{ kind: "external", label: "Трансляция", url: "https://example.com/live" }]);
  const alias = fixture("scheduledMatch", editMatch((m) => { m.broadcastUrl = "https://example.com/live"; }));
  assert.equal(alias.matches[0].links.length, 1);
});
test("external action is dispatched through RuntimePort only after user callback", () => {
  const match = fixture("scheduledMatch", editMatch((m) => { m.replayUrl = "https://example.com/replay"; })).matches[0];
  const calls = [];
  const tree = MatchDetails({ match, runtime: { openExternal: (action) => calls.push(action) } });
  const buttons = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === "button") buttons.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  assert.equal(calls.length, 0);
  assert.equal(buttons.length, 1);
  buttons[0].props.onClick();
  assert.deepEqual(calls, [match.links[0]]);
  assert.match(renderToStaticMarkup(React.createElement(MatchDetails, { match })), /disabled=""/);
});
