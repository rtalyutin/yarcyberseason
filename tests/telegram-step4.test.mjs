import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { createMiniAppRouter } from "../src/telegram/router.js";
import { homeRoute, tournamentRoute } from "../src/telegram/contracts.js";
import { loadMiniAppModel } from "../src/telegram/data/load.js";
import { THEMES, LANGUAGES, PREFERENCE_KEY, readPreferences, savePreferences, normalizePreferences, getMessages } from "../src/telegram/preferences.js";

function windowFixture(path = "/tg") {
  const calls = [];
  const events = new Map();
  const win = { location: {}, history: {}, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: (key) => events.delete(key) };
  const address = (url) => Object.assign(win.location, { pathname: new URL(url, "https://test.invalid").pathname, search: new URL(url, "https://test.invalid").search });
  address(path);
  for (const method of ["replaceState", "pushState"]) win.history[method] = (state, _, url) => { calls.push({ method, state, url }); win.history.state = state; address(url); };
  return { win, calls, events, address };
}
const sections = loadMiniAppModel().sections.map((section) => section.id);
const port = (launch = null) => ({ readLaunchTarget: () => launch });

test("step4 home → tournament pushes once, sections and explicit back replace", () => {
  const f = windowFixture();
  const router = createMiniAppRouter(f.win, port(), sections);
  let updates = 0;
  router.subscribe(() => updates++);
  router.navigate(tournamentRoute());
  router.navigate(tournamentRoute("participants"));
  router.navigate(tournamentRoute("overview"));
  router.navigate(homeRoute());
  assert.deepEqual(f.calls.map((item) => item.method), ["replaceState", "pushState", "replaceState", "replaceState", "replaceState"]);
  assert.equal(f.win.location.pathname, "/tg");
  assert.equal(updates, 4);
  router.dispose();
  assert.equal(f.events.size, 0);
  router.navigate(tournamentRoute());
  assert.equal(updates, 4);
});
test("step4 direct entry back never uses browser history.back", () => {
  const f = windowFixture("/tg/tournament?section=participants");
  const router = createMiniAppRouter(f.win, port(), sections);
  router.navigate(homeRoute());
  assert.equal(f.calls.at(-1).url, "/tg");
  assert.equal(f.calls.at(-1).method, "replaceState");
});
test("step4 launch wins once; popstate and later transitions never replay it", () => {
  const f = windowFixture("/tg?startapp=participants&private=not-to-store");
  let reads = 0;
  const router = createMiniAppRouter(f.win, { readLaunchTarget: () => { reads++; return tournamentRoute("participants"); } }, sections);
  assert.deepEqual(router.getSnapshot().route, tournamentRoute("participants"));
  router.navigate(homeRoute());
  f.address("/tg/tournament");
  f.events.get("popstate")();
  assert.deepEqual(router.getSnapshot().route, tournamentRoute());
  assert.equal(reads, 1);
  assert.ok(!JSON.stringify(f.calls).includes("private"));
  assert.ok(!JSON.stringify(f.calls).includes("startapp"));
});
test("step4 unsupported paths/sections normalize; unavailable results fall back", () => {
  const f = windowFixture("/tg/teams");
  const router = createMiniAppRouter(f.win, port(), sections);
  assert.ok(router.getSnapshot().notice);
  assert.deepEqual(router.getSnapshot().route, homeRoute());
  router.navigate(tournamentRoute("results"));
  assert.deepEqual(router.getSnapshot().route, tournamentRoute());
  f.address("/tg/tournament?section=evil&slug=cs2"); f.events.get("popstate")();
  assert.equal(f.calls.at(-1).url, "/tg/tournament");
});
test("step4 SDK launch is not replayed after retry/remount on the same page", () => {
  const f = windowFixture("/tg");
  const runtime = port(tournamentRoute("participants"));
  const first = createMiniAppRouter(f.win, runtime, sections);
  first.navigate(homeRoute()); first.dispose();
  const second = createMiniAppRouter(f.win, runtime, sections);
  assert.deepEqual(second.getSnapshot().route, homeRoute());
  second.dispose();
  const reloaded = windowFixture("/tg");
  reloaded.win.history.state = f.win.history.state;
  const afterReload = createMiniAppRouter(reloaded.win, runtime, sections);
  assert.deepEqual(afterReload.getSnapshot().route, homeRoute());
  afterReload.dispose();
});
test("step4 preference persistence is separate, bounded and tolerant of denial/corruption", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(THEMES.map((item) => item.id), ["rift"]);
  assert.deepEqual(LANGUAGES.map((item) => item.id), ["ru"]);
  savePreferences(storage, { theme: "rift", language: "ru", user: "must-not-persist" });
  assert.deepEqual(readPreferences(storage), { theme: "rift", language: "ru" });
  assert.equal(values.size, 1); assert.equal(values.get(PREFERENCE_KEY), '{"theme":"rift","language":"ru"}');
  values.set(PREFERENCE_KEY, "broken"); assert.deepEqual(readPreferences(storage), { theme: "rift", language: "ru" });
  assert.deepEqual(savePreferences({ setItem() { throw new Error("denied"); } }, { theme: "grid", language: "en" }), { theme: "rift", language: "ru" });
  assert.deepEqual(normalizePreferences({ theme: "future", language: "en" }, [...THEMES, { id: "future" }], [...LANGUAGES, { id: "en" }]), { theme: "future", language: "en" });
});

// Render actual JSX, not a parallel hand-written HTML model. No added dependency.
const bundle = await build({ entryPoints: ["src/telegram/MiniApp.jsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const { createRequire } = await import("node:module");
const result = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), result, result.exports);
const { HomeScreen, TournamentScreen, MiniAppView, MiniAppHeader } = result.exports;
const model = loadMiniAppModel();
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, { model, navigate() {}, ...props }));
test("step4 real home renders chosen Dota data and truthful registration", () => {
  const html = render(HomeScreen);
  assert.match(html, /10 — 25 октября 2026/);
  assert.match(html, /Регистрация закрыта/);
  assert.match(html, /16 \/ 16/);
  assert.match(html, /Открыть турнир/);
  assert.ok(!html.includes("forms.yandex"));
  assert.equal((html.match(/<footer/g) || []).length, 1);
});
test("the shared header offers a distinct exit on both screens and a truthful browser label", () => {
  for (const route of [homeRoute(), tournamentRoute(), tournamentRoute("participants")]) {
    const snapshot = { route, canonicalUrl: "/tg", notice: null };
    const router = { subscribe() { return () => {}; }, getSnapshot: () => snapshot, navigate() {} };
    for (const kind of ["telegram", "browser"]) {
      const html = render(MiniAppView, { router, runtime: { kind, close() {} }, copy: getMessages("ru"), preferences: { theme: "rift", language: "ru" }, onPreferences() {} });
      assert.match(html, kind === "telegram" ? /aria-label="Закрыть приложение"/ : /aria-label="На сайт"/);
      assert.equal((html.match(/class="tg-close"/g) || []).length, 1);
      assert.equal(html.includes('class="tg-back"'), route.screen === "tournament");
      assert.ok(!html.includes("<select"));
    }
  }
  const fallback = render(MiniAppHeader, { model: undefined, runtime: { kind: "telegram", close() {} }, copy: getMessages("ru") });
  assert.match(fallback, /aria-label="Закрыть приложение"/);
  assert.ok(!fallback.includes("disabled="));
});
test("step4 real participant UI contains all source names, no links and no invented scores", () => {
  const html = render(TournamentScreen, { route: tournamentRoute("participants") });
  for (const participant of model.participants) assert.ok(html.includes(participant.displayName));
  assert.equal((html.match(/data-team-id=/g) || []).length, model.participants.length);
  assert.ok(!html.includes("href="));
  assert.ok(!html.includes("0:0"));
  assert.ok(html.includes("psb_bank") && html.includes("РГАТУ"));
});
test("step4 empty participants are explicit; sections not implemented are not claimed empty", () => {
  assert.match(render(TournamentScreen, { model: { ...model, participants: [] }, route: tournamentRoute("participants") }), /Участники пока не опубликованы/);
  assert.match(render(TournamentScreen, { route: tournamentRoute("swiss") }), /Этот раздел ещё готовится/);
});
test("step4 initial entry does not statically import the main site or CSS", async () => {
  const main = await readFile("src/main.jsx", "utf8");
  assert.ok(!/^import .*App\.jsx/m.test(main));
  assert.ok(!/^import .*styles\.css/m.test(main));
  const entry = await readFile("src/telegram/entry.jsx", "utf8");
  assert.ok(entry.includes("await loadTelegramBridge()"));
  assert.ok(!entry.includes("Prototype"));
  assert.equal(getMessages("ru").open, "Открыть турнир");
});
