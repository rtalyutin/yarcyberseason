import assert from "node:assert/strict";
import test from "node:test";
import { projectContent } from "../src/data/project-content.js";
import { validateCommunity } from "../src/lib/community.js";
import { MINI_APP_CONFIG } from "../src/telegram/config.js";
import { transformAction } from "../src/telegram/data/actions.js";
import { loadMiniAppModel } from "../src/telegram/data/load.js";
import { buildMiniAppModel } from "../src/telegram/data/model.js";
import { createRegistryProjection, validateSelectedSource } from "../src/telegram/data/validate.js";
import { createBrowserRuntime } from "../src/telegram/runtime/browser.js";
import { createRuntime } from "../src/telegram/runtime/create-runtime.js";
import { createTelegramRuntime } from "../src/telegram/runtime/telegram.js";
import { realFixture, syntheticFixtures } from "./fixtures/telegram/fixtures.mjs";

function pinnedFixture(source) {
  const tournament = structuredClone(source.tournament);
  const registry = structuredClone(source.registry);
  const previousId = tournament.id;
  tournament.id = MINI_APP_CONFIG.tournamentSlug;
  tournament.slug = MINI_APP_CONFIG.tournamentSlug;
  registry.bindings = registry.bindings.map((binding) => ({
    ...binding,
    tournamentId: binding.tournamentId === previousId ? tournament.id : binding.tournamentId,
  }));
  return { tournament, registry };
}

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, handler) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(handler);
  }
  removeEventListener(name, handler) { this.listeners.get(name)?.delete(handler); }
  emit(name) { for (const handler of this.listeners.get(name) || []) handler(); }
  count(name) { return this.listeners.get(name)?.size || 0; }
}

function fakeWindow(search = "") {
  const document = new FakeTarget();
  document.visibilityState = "visible";
  document.documentElement = { style: { values: new Map(), setProperty(name, value) { this.values.set(name, value); } } };
  return { document, location: { search }, opened: [], open(...args) { this.opened.push(args); } };
}

function fakeTelegram(startParam = "participants") {
  const events = new Map();
  const calls = [];
  const BackButton = {
    handler: null,
    onClick(handler) { calls.push("back:on"); this.handler = handler; },
    offClick(handler) { calls.push("back:off"); if (this.handler === handler) this.handler = null; },
    show() { calls.push("back:show"); },
    hide() { calls.push("back:hide"); },
  };
  return {
    calls, events, BackButton, viewportHeight: 720, safeAreaInset: { top: 8, right: 0, bottom: 12, left: 0 },
    contentSafeAreaInset: { top: 4, right: 0, bottom: 6, left: 0 }, initDataUnsafe: { start_param: startParam },
    expand() { calls.push("expand"); }, ready() { calls.push("ready"); },
    onEvent(name, handler) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(handler); },
    offEvent(name, handler) { events.get(name)?.delete(handler); },
    openLink(url) { calls.push(`open:${url}`); }, openTelegramLink(url) { calls.push(`telegram:${url}`); },
  };
}

test("the real adapter builds the selected tournament without copying source data", () => {
  const tournamentBefore = structuredClone(realFixture.tournament);
  const registryBefore = structuredClone(realFixture.registry);
  const model = buildMiniAppModel(realFixture.tournament, realFixture.registry, projectContent);
  assert.deepEqual(realFixture.tournament, tournamentBefore);
  assert.deepEqual(realFixture.registry, registryBefore);
  assert.equal(model.tournament.slug, "dota2-autumn-2026");
  assert.equal(model.registration.status, "closed");
  assert.equal(model.registration.count, 16);
  assert.equal(model.matches.length, 0);
  assert.equal(model.stages.find((stage) => stage.id === "swiss").availability, "empty");
  assert.equal(model.stages.find((stage) => stage.id === "playoffs").rounds.flatMap((round) => round.slots).length, 7);
  assert.equal(model.stages.find((stage) => stage.id === "playoffs").rounds.flatMap((round) => round.slots).every((slot) => slot.kind === "empty"), true);
  assert.equal(model.sections.some((section) => section.id === "results"), false);
});

test("Swiss rows follow published positions and preserve source order when absent", () => {
  const { tournament, registry } = pinnedFixture(syntheticFixtures.empty);
  tournament.stages = [{
    id: "swiss", type: "swiss", title: "Swiss", groups: [{
      id: "table", title: "Таблица", rows: [
        { position: 2, team: "Beta", played: 1, won: 0, lost: 1 },
        { team: "Beta", played: 0, won: 0, lost: 0 },
        { position: 1, team: "Alpha", played: 1, won: 1, lost: 0 },
        { team: "Alpha", played: 0, won: 0, lost: 0 },
      ],
    }],
  }];
  const rows = buildMiniAppModel(tournament, registry, projectContent).stages[0].tables[0].rows;
  assert.deepEqual(rows.map((row) => row.cells.position), [1, 2, null, null]);
  assert.deepEqual(rows.slice(2).map((row) => row.displayName), ["Beta", "Alpha"]);
});

test("results require a published confirmed final", () => {
  const emptyResults = pinnedFixture(syntheticFixtures.empty);
  emptyResults.tournament.results = {};
  assert.match(validateSelectedSource(emptyResults.tournament, emptyResults.registry).join("\n"), /finalMatchId is required/);

  const unconfirmedFinal = pinnedFixture(syntheticFixtures.unconfirmedResult);
  unconfirmedFinal.tournament.results = { finalMatchId: unconfirmedFinal.tournament.stages[0].matches[0].id };
  assert.match(validateSelectedSource(unconfirmedFinal.tournament, unconfirmedFinal.registry).join("\n"), /final match is not confirmed/);

  const confirmedFinal = pinnedFixture(syntheticFixtures.confirmedResult);
  confirmedFinal.tournament.results = { finalMatchId: confirmedFinal.tournament.stages[0].matches[0].id };
  const model = buildMiniAppModel(confirmedFinal.tournament, confirmedFinal.registry, projectContent);
  assert.equal(model.sections.some((item) => item.id === "results" && item.availability === "ready"), true);
});

test("closed registration rejects a registration action outside participants", () => {
  const { tournament, registry } = pinnedFixture(syntheticFixtures.empty);
  tournament.registration = { status: "closed" };
  for (const label of ["Регистрация", "Участвовать", "Заполнить форму", "Стать участником"]) {
    tournament.primaryAction = { label, target: "https://forms.yandex.ru/example" };
    assert.match(validateSelectedSource(tournament, registry).join("\n"), /must lead to participants/);
  }
  tournament.primaryAction = { label: "Участвовать", target: `https://evil.test/tournaments/${tournament.slug}?section=participants` };
  assert.match(validateSelectedSource(tournament, registry).join("\n"), /must lead to participants/);
  tournament.primaryAction.target = `//evil.test/tournaments/${tournament.slug}?section=participants`;
  assert.match(validateSelectedSource(tournament, registry).join("\n"), /must lead to participants/);
  tournament.primaryAction = { label: "Заявленные команды", target: `/tournaments/${tournament.slug}?section=participants` };
  assert.deepEqual(validateSelectedSource(tournament, registry), []);
});

test("the loader is pinned to source JSON and the shared partner module", () => {
  const model = loadMiniAppModel();
  assert.equal(model.project.logoUrl, "/assets/ycs-logo.jpg");
  assert.deepEqual(model.project.partners.map((partner) => partner.name), projectContent.partners.map((partner) => partner.name));
  assert.equal(model.participants.find((participant) => participant.displayName === "Team Borisogleb").logoUrl, "/assets/teams/dota2/borisogleb/logo.jpg");
  assert.equal(model.participants.find((participant) => participant.displayName === "PIVNAYA KEGA").teamId.startsWith("cs2-"), true);
});

test("source actions become only allowed in-screen routes", () => {
  assert.deepEqual(transformAction({ label: "Команды", target: "/tournaments/dota2-autumn-2026?section=participants" }), { kind: "internal", label: "Команды", route: { screen: "tournament", section: "participants" } });
  assert.deepEqual(transformAction({ label: "Регламент", target: "#format" }), { kind: "internal", label: "Регламент", route: { screen: "tournament", section: "rules" } });
  assert.deepEqual(transformAction({ label: "Итоги", target: "#results" }), { kind: "internal", label: "Итоги", route: { screen: "tournament", section: "overview" } });
  for (const target of ["/results", "/teams/a", "/tournaments/other", "javascript:alert(1)", "mailto:info@ycs.bar"]) assert.equal(transformAction({ label: "Нет", target }), null);
});

test("synthetic result states stay distinct in the shared match model", () => {
  const scheduled = buildMiniAppModel(...Object.values(pinnedFixture(syntheticFixtures.scheduledMatch)), projectContent).matches[0];
  const confirmed = buildMiniAppModel(...Object.values(pinnedFixture(syntheticFixtures.confirmedResult)), projectContent).matches[0];
  const unconfirmed = buildMiniAppModel(...Object.values(pinnedFixture(syntheticFixtures.unconfirmedResult)), projectContent).matches[0];
  const technical = buildMiniAppModel(...Object.values(pinnedFixture(syntheticFixtures.technicalVictory)), projectContent).matches[0];
  assert.equal(scheduled.result.confirmed, false);
  assert.deepEqual(confirmed.result.score, [1, 0]);
  assert.equal(unconfirmed.result.score, null);
  assert.equal(technical.result.technical, true);
  assert.equal(technical.result.label, "Техническая победа");
});

test("a hidden bracket match cannot leak into matches, slots or edges", () => {
  const { tournament, registry } = pinnedFixture(syntheticFixtures.hiddenBracketMatch);
  const model = buildMiniAppModel(tournament, registry, projectContent);
  assert.equal(model.matches.length, 0);
  assert.equal(model.stages[0].rounds[0].slots.length, 0);
  assert.equal(model.stages[0].edges.length, 0);
});

test("an assigned match may target a declared ID-only slot", () => {
  const { tournament, registry } = pinnedFixture(syntheticFixtures.assignedToEmptySlot);
  const projection = createRegistryProjection(tournament, registry);
  assert.deepEqual(validateCommunity([tournament], projection), []);
  assert.deepEqual(validateSelectedSource(tournament, registry), []);
  const model = buildMiniAppModel(tournament, registry, projectContent);
  assert.equal(model.matches.length, 1);
  assert.deepEqual(model.stages[0].rounds[0].slots.map((slot) => slot.kind), ["match", "empty"]);
  assert.deepEqual(model.stages[0].edges, [{ fromSlotKey: `${tournament.id}/m1`, toSlotKey: `${tournament.id}/m2`, outcome: "winner", targetSide: 1 }]);
});

test("missing teams and missing bracket targets fail with diagnostics", () => {
  const invalidTeam = pinnedFixture(syntheticFixtures.invalidTeamReference);
  assert.match(validateSelectedSource(invalidTeam.tournament, invalidTeam.registry).join("\n"), /Invalid participant/);
  const missingTarget = pinnedFixture(syntheticFixtures.assignedToEmptySlot);
  missingTarget.tournament.stages[0].rounds[0].matches.pop();
  assert.match(validateSelectedSource(missingTarget.tournament, missingTarget.registry).join("\n"), /Missing winnerTo/);
});

test("browser runtime validates launch targets, external links and resume cleanup", async () => {
  const windowObject = fakeWindow("?startapp=participants");
  const port = createBrowserRuntime(windowObject);
  await port.init();
  assert.deepEqual(port.readLaunchTarget(), { screen: "tournament", section: "participants" });
  port.openExternal({ kind: "external", label: "Правила", url: "https://example.test/rules" });
  port.openExternal({ kind: "external", label: "Нет", url: "javascript:alert(1)" });
  assert.equal(windowObject.opened.length, 1);
  let resumed = 0;
  const unsubscribe = port.onResume(() => { resumed += 1; });
  windowObject.document.emit("visibilitychange");
  assert.equal(resumed, 1);
  unsubscribe();
  assert.equal(windowObject.document.count("visibilitychange"), 0);
  port.dispose();
});

test("Telegram runtime owns bridge events and replaces its BackButton handler", async () => {
  const windowObject = fakeWindow();
  const webApp = fakeTelegram();
  const port = createTelegramRuntime(webApp, windowObject);
  await port.init();
  port.ready();
  assert.deepEqual(port.readLaunchTarget(), { screen: "tournament", section: "participants" });
  let back = 0;
  const first = () => { back += 1; };
  const second = () => { back += 10; };
  port.setBackHandler(first);
  port.setBackHandler(second);
  webApp.BackButton.handler();
  assert.equal(back, 10);
  port.openExternal({ kind: "external", label: "Сайт", url: "https://example.test/a" });
  port.openExternal({ kind: "external", label: "Telegram", url: "https://t.me/ycs" });
  assert.equal(webApp.calls.includes("open:https://example.test/a"), true);
  assert.equal(webApp.calls.includes("telegram:https://t.me/ycs"), true);
  assert.equal(windowObject.document.documentElement.style.values.get("--tg-viewport-height"), "720px");
  let resumed = 0;
  port.onResume(() => { resumed += 1; });
  for (const handler of webApp.events.get("activated")) handler();
  windowObject.document.emit("visibilitychange");
  assert.equal(resumed, 2);
  port.dispose();
  assert.equal(webApp.BackButton.handler, null);
  assert.equal(windowObject.document.count("visibilitychange"), 0);
  assert.equal([...webApp.events.values()].every((handlers) => handlers.size === 0), true);
});

test("runtime factory falls back to browser when the bridge is unavailable", () => {
  const browserWindow = fakeWindow();
  assert.equal(createRuntime(browserWindow).kind, "browser");
  const telegramWindow = fakeWindow();
  telegramWindow.Telegram = { WebApp: fakeTelegram("unknown") };
  const port = createRuntime(telegramWindow);
  assert.equal(port.kind, "telegram");
  assert.equal(port.readLaunchTarget(), null);
});
