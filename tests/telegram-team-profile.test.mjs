import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { loadMiniAppModel, loadArchivedModels } from "../src/telegram/data/load.js";
import { resolveMiniAppLocation, serializeMiniAppRoute, teamRoute, tournamentRoute } from "../src/telegram/contracts.js";
import { getMessages } from "../src/telegram/preferences.js";

const current = loadMiniAppModel();
const archives = loadArchivedModels();
const models = new Map([current, ...archives].map((item) => [item.tournament.slug, item]));
const availableTeams = (slug) => models.get(slug).participants.map((item) => item.teamId);
const availableSections = (slug) => models.get(slug).sections.map((section) => section.id);
const resolve = (url) => {
  const parsed = new URL(url, "https://example.test");
  return resolveMiniAppLocation({ pathname: parsed.pathname, search: parsed.search, availableTeams, availableSections, tournamentSlugs: [...models.keys()] });
};

const bundle = await build({ entryPoints: ["src/telegram/TeamProfile.jsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const module = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { TeamProfile } = module.exports;
const render = (model, teamId) => renderToStaticMarkup(React.createElement(TeamProfile,
  { model, teamId, copy: getMessages("ru"), navigate() {} }));

test("team links keep the tournament and reject unknown or unrelated teams", () => {
  const vnext = teamRoute("dota2-autumn-2026-vnext");
  assert.deepEqual(resolve(serializeMiniAppRoute(vnext)).route, vnext);
  assert.deepEqual(resolve("/tg/tournament?section=participants&team=invalid").route, tournamentRoute("participants"));
  const archive = teamRoute("cs2-august-2026-cipher", "cs2-february-2026");
  assert.deepEqual(resolve(serializeMiniAppRoute(archive)).route, archive);
  assert.deepEqual(resolve("/tg/tournament?tournament=cs2-february-2026&section=participants&team=dota2-autumn-2026-vnext").route,
    tournamentRoute("participants", "cs2-february-2026"));
  assert.throws(() => teamRoute("../outside"));
});

test("current team renders published nicknames, exact logo and scheduled match", () => {
  const html = render(current, "dota2-autumn-2026-vnext");
  assert.match(html, /<h1[^>]*>Vnext<\/h1>/);
  assert.match(html, /src="\/assets\/teams\/dota2\/vnext\/logo.png"/);
  for (const nick of ["3pleS-", "Omnipresent authority figure", "fash1on monst3r", "anti_mogg", "T3NZ0"]) assert.ok(html.includes(nick));
  assert.equal((html.match(/class="tg-profile-roster"/g) || []).length, 1);
  assert.match(html, /Mi Ne Pushim!.*Vnext/);
  assert.match(html, /10 октября 2026 г./);
  assert.match(html, /tg-match-row/);
});

test("archived profile draws only its tournament roster and published matches", () => {
  const february = models.get("cs2-february-2026");
  const html = render(february, "cs2-august-2026-cipher");
  assert.match(html, /CipHer/);
  assert.match(html, /tg-match-row/);
  assert.doesNotMatch(html, /Расписание и результаты появятся здесь после публикации/);
});
