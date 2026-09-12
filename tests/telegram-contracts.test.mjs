import assert from "node:assert/strict";
import test from "node:test";
import { MINI_APP_CONFIG, SECTION_IDS } from "../src/telegram/config.js";
import {
  assertRuntimePort,
  isMiniAppPath,
  isUiAction,
  resolveMiniAppLocation,
  routeFromStartTarget,
  serializeMiniAppRoute,
  tournamentRoute,
  validateMiniAppModel,
  validateVersionManifest,
} from "../src/telegram/contracts.js";
import { fixtureMatrix, realFixture, syntheticFixtures } from "./fixtures/telegram/fixtures.mjs";

test("L0 configuration pins the two-screen app to the selected Dota tournament", () => {
  assert.deepEqual(MINI_APP_CONFIG, {
    basePath: "/tg",
    tournamentSlug: "dota2-autumn-2026",
    displayTimeZone: "Europe/Moscow",
    botUsername: null,
  });
  assert.equal(Object.isFrozen(MINI_APP_CONFIG), true);
  assert.equal(isMiniAppPath("/tg"), true);
  assert.equal(isMiniAppPath("/tg/tournament"), true);
  assert.equal(isMiniAppPath("/tg-other"), false);
  assert.equal(isMiniAppPath("/tournaments/dota2-autumn-2026"), false);
});

test("the route matrix has only home and one tournament screen", () => {
  const cases = [
    ["/tg", "", { screen: "home" }, "/tg", false],
    ["/tg/", "", { screen: "home" }, "/tg", true],
    ["/tg/tournament", "", { screen: "tournament", section: "overview" }, "/tg/tournament", false],
    ["/tg/tournament", "?section=participants", { screen: "tournament", section: "participants" }, "/tg/tournament?section=participants", false],
    ["/tg/tournament", "?section=unknown", { screen: "tournament", section: "overview" }, "/tg/tournament", true],
    ["/tg/tournament", "?tournament=cs2-august-2026", { screen: "tournament", section: "overview" }, "/tg/tournament", true],
  ];
  for (const [pathname, search, route, canonicalUrl, needsReplace] of cases) {
    const resolved = resolveMiniAppLocation({ pathname, search });
    assert.deepEqual(resolved.route, route);
    assert.equal(resolved.canonicalUrl, canonicalUrl);
    assert.equal(resolved.needsReplace, needsReplace);
  }
  const unavailable = resolveMiniAppLocation({ pathname: "/tg/teams/alpha" });
  assert.deepEqual(unavailable.route, { screen: "home" });
  assert.equal(unavailable.notice, "Этот раздел недоступен в мини-приложении");
  assert.equal(resolveMiniAppLocation({ pathname: "/teams/alpha" }), null);
});

test("sections and startapp stay inside the same selected tournament", () => {
  for (const section of SECTION_IDS) {
    const route = tournamentRoute(section);
    if (section !== "overview") assert.deepEqual(routeFromStartTarget(section), route);
    assert.equal(serializeMiniAppRoute(route), section === "overview" ? "/tg/tournament" : `/tg/tournament?section=${section}`);
  }
  assert.deepEqual(routeFromStartTarget("tournament"), { screen: "tournament", section: "overview" });
  assert.deepEqual(routeFromStartTarget("home"), { screen: "home" });
  assert.equal(routeFromStartTarget("https://example.test"), null);
  assert.deepEqual(routeFromStartTarget("results", SECTION_IDS.filter((id) => id !== "results")), { screen: "tournament", section: "overview" });
});

test("UiAction rejects excluded routes and unsafe external URLs", () => {
  assert.equal(isUiAction({ kind: "internal", label: "Команды", route: { screen: "tournament", section: "participants" } }), true);
  assert.equal(isUiAction({ kind: "internal", label: "Архив", route: { screen: "archive" } }), false);
  assert.equal(isUiAction({ kind: "external", label: "Документ", url: "https://example.test/rules" }), true);
  for (const url of ["javascript:alert(1)", "data:text/plain,x", "https://user:pass@example.test", "mailto:info@ycs.bar"]) {
    assert.equal(isUiAction({ kind: "external", label: "Bad", url }), false, url);
  }
});

test("RuntimePort requires one complete browser or Telegram adapter", async () => {
  let resumed = 0;
  const port = {
    kind: "browser",
    async init() {},
    ready() {},
    readLaunchTarget() { return null; },
    setBackHandler() {},
    openExternal() {},
    onResume(handler) { handler(); return () => {}; },
    dispose() {},
  };
  assert.equal(assertRuntimePort(port), port);
  await port.init();
  const unsubscribe = port.onResume(() => { resumed += 1; });
  assert.equal(resumed, 1);
  assert.equal(typeof unsubscribe, "function");
  assert.throws(() => assertRuntimePort({ ...port, kind: "web", dispose: null }), /RuntimePort/);
});

test("the version manifest is exact and cannot select another tournament", () => {
  const manifest = { schemaVersion: 1, buildId: "build-1", sourceCommit: "abc123", tournamentSlug: "dota2-autumn-2026" };
  assert.deepEqual(validateVersionManifest(manifest), []);
  assert.match(validateVersionManifest({ ...manifest, schemaVersion: 2 })[0], /schemaVersion/);
  assert.match(validateVersionManifest({ ...manifest, tournamentSlug: "cs2-august-2026" })[0], /tournamentSlug/);
  assert.match(validateVersionManifest({ ...manifest, buildId: "" })[0], /buildId/);
});

test("MiniAppModel guard enforces a single result object referenced by stage slots", () => {
  const result = { confirmed: false, technical: false, known: false, sourceScore: null, series: null, score: null, maps: [], winnerSide: null, draw: false, label: "Счёт серии", canDownload: false };
  const match = { key: "dota2-autumn-2026/m1", id: "m1", tournamentId: "dota2-autumn-2026", stageId: "playoffs", roundId: "upper", roundTitle: "Верхняя", team1: "Alpha", team2: "Beta", team1Id: "a", team2Id: "b", status: "scheduled", scheduledAt: null, date: null, dateDisplay: null, bestOf: "BO1", note: null, result, links: [] };
  const model = {
    schemaVersion: 1,
    tournament: { id: "dota2-autumn-2026", slug: "dota2-autumn-2026", title: "Dota 2 / YCS", discipline: "Dota 2", season: "YCS'26", status: "upcoming", statusLabel: "Регистрация закрыта", dates: { start: "2026-10-10", end: "2026-10-25", display: "10 — 25 октября 2026" }, summary: "Турнир", facts: [] },
    registration: { status: "closed", message: "Регистрация закрыта", capacity: 16, count: 16 }, participants: [], actions: [], timeline: [],
    stages: [{ id: "playoffs", type: "double_elimination", title: "Плей-офф", notice: null, rules: [], availability: "partial", tables: [], rounds: [{ id: "upper", label: "Верхняя", slots: [{ slotKey: "dota2-autumn-2026/m1", kind: "match", matchKey: match.key }] }], edges: [] }],
    matches: [match], rewards: { prizeDistribution: null, additionalAwards: [], referralContest: null }, results: null, sections: [], project: { brandName: "ЯрКиберСезон", logoUrl: "/assets/ycs-logo.jpg", partners: [], contactEmail: "info@ycs.bar" },
  };
  assert.deepEqual(validateMiniAppModel(model), []);
  assert.match(validateMiniAppModel({ ...model, matches: [] })[0], /reference matches/);
  assert.match(validateMiniAppModel({ ...model, tournament: { ...model.tournament, slug: "other" } }).find((error) => error.includes("tournament.slug")), /tournament.slug/);
  assert.match(validateMiniAppModel({ ...model, sections: [{ id: "archive", label: "Архив", availability: "ready", emptyText: null }] })[0], /sections/);
  assert.match(validateMiniAppModel({ ...model, participants: [{ teamId: "a", displayName: "", logoUrl: null, status: "registered" }] })[0], /participants/);
  assert.match(validateMiniAppModel({ ...model, matches: [match, { ...match }] }).find((error) => error.includes("Duplicate match")), /Duplicate match/);
  assert.match(validateMiniAppModel({ ...model, results: {} }).find((error) => error.includes("results section")), /results section/);
  const badMaps = { ...match, result: { ...result, maps: [null, 42] } };
  assert.match(validateMiniAppModel({ ...model, matches: [badMaps] }).find((error) => error.includes("object array")), /object array/);
  assert.match(validateMiniAppModel({ ...model, rewards: { ...model.rewards, additionalAwards: [null, 42] } }).find((error) => error.includes("rewards")), /rewards/);
  const rawSlot = { ...model.stages[0].rounds[0].slots[0], team1: "Alpha", score1: 1 };
  const rawStage = { ...model.stages[0], rounds: [{ ...model.stages[0].rounds[0], slots: [rawSlot] }] };
  assert.match(validateMiniAppModel({ ...model, stages: [rawStage] }).find((error) => error.includes("outside SlotView")), /outside SlotView/);
  const wrongSlotKey = { ...model.stages[0].rounds[0].slots[0], slotKey: "other/raw-id" };
  const wrongKeyStage = { ...model.stages[0], rounds: [{ ...model.stages[0].rounds[0], slots: [wrongSlotKey] }] };
  assert.match(validateMiniAppModel({ ...model, stages: [wrongKeyStage] }).find((error) => error.includes("tournamentId/rawMatchId")), /tournamentId\/rawMatchId/);
  assert.match(validateMiniAppModel({ ...model, stages: [{ type: "double_elimination", rounds: [] }] }).find((error) => error.includes("StageViewModel")), /StageViewModel/);
  assert.match(validateMiniAppModel({ ...model, matches: [{ key: match.key, id: match.id, tournamentId: match.tournamentId, result, links: [] }] }).find((error) => error.includes("MatchViewModel")), /MatchViewModel/);
});

test("the real fixture tracks current source data without copying it", () => {
  const { tournament, registry } = realFixture;
  assert.equal(tournament.slug, "dota2-autumn-2026");
  assert.equal(tournament.registration.status, "closed");
  assert.equal(tournament.registration.reason, "capacity_reached");
  assert.equal(new Set(tournament.participants.map((entry) => entry.teamId)).size, 16);
  const registryIds = new Set(registry.teams.map((team) => team.id));
  assert.equal(tournament.participants.every((entry) => registryIds.has(entry.teamId)), true);
  const logos = new Map(registry.teams.map((team) => [team.id, team.logo || null]));
  for (const id of ["dota2-main-2026-team-borisogleb", "dota2-main-2026-tech-titans", "dota2-main-2026-way-prod"]) {
    assert.match(logos.get(id) || "", /^\/assets\/teams\/dota2\//);
  }
});

test("all required fixtures are explicit and synthetic results cannot be mistaken for real ones", () => {
  assert.deepEqual(Object.keys(syntheticFixtures), [
    "empty", "scheduledMatch", "confirmedResult", "unconfirmedResult", "technicalVictory",
    "invalidTeamReference", "hiddenBracketMatch", "assignedToEmptySlot",
  ]);
  assert.equal(fixtureMatrix.length, 9);
  assert.equal(fixtureMatrix.filter((entry) => entry.fixture === false).length, 1);
  assert.equal(fixtureMatrix.filter((entry) => entry.fixture === true).length, 8);
  assert.equal(syntheticFixtures.hiddenBracketMatch.tournament.stages[0].rounds[0].matches[0].published, false);
  assert.deepEqual(syntheticFixtures.assignedToEmptySlot.tournament.stages[0].rounds[0].matches[1], { id: "m2" });
  assert.equal(syntheticFixtures.unconfirmedResult.tournament.stages[0].matches[0].resultConfirmed, false);
  assert.equal(syntheticFixtures.technicalVictory.tournament.stages[0].matches[0].scoreKind, "technical");
});
