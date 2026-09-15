import { readFileSync } from "node:fs";

const read = (relativePath) => JSON.parse(readFileSync(new URL(`../../../${relativePath}`, import.meta.url), "utf8"));

export const realFixture = Object.freeze({
  name: "real-dota2-autumn-2026",
  fixture: false,
  tournament: read("src/data/tournaments/dota2-autumn-2026.json"),
  registry: read("src/data/teams.json"),
});

const baseRegistry = () => ({
  schemaVersion: 2,
  teams: [
    { id: "fixture-alpha", name: "Alpha", disciplines: ["Dota 2"] },
    { id: "fixture-beta", name: "Beta", disciplines: ["Dota 2"] },
  ],
  bindings: [
    { tournamentId: "fixture-dota", sourceName: "Alpha", teamId: "fixture-alpha" },
    { tournamentId: "fixture-dota", sourceName: "Beta", teamId: "fixture-beta" },
  ],
  aliases: [],
});

const baseTournament = () => ({
  schemaVersion: 1,
  id: "fixture-dota",
  slug: "fixture-dota",
  title: "Fixture Dota",
  discipline: "Dota 2",
  season: "FIXTURE ONLY",
  status: "upcoming",
  statusLabel: "Тестовые данные",
  dates: { start: "2026-10-10", end: "2026-10-25", display: "10 — 25 октября 2026" },
  summary: "Синтетический пример. Не публиковать как результат турнира.",
  facts: [],
  registration: { status: "open", reason: null, capacity: 2, message: "Fixture" },
  participants: [
    { teamId: "fixture-alpha", displayName: "Alpha", status: "registered" },
    { teamId: "fixture-beta", displayName: "Beta", status: "registered" },
  ],
  timeline: [],
  stages: [],
});

const match = (overrides = {}) => ({
  id: "m1",
  team1: "Alpha",
  team2: "Beta",
  status: "scheduled",
  scheduledAt: "2026-10-10T18:00:00+03:00",
  bestOf: "BO1",
  ...overrides,
});

function syntheticFixture(name, edit) {
  const tournament = baseTournament();
  const registry = baseRegistry();
  edit({ tournament, registry });
  return { name, fixture: true, tournament, registry };
}

export const syntheticFixtures = Object.freeze({
  empty: syntheticFixture("empty", () => {}),
  scheduledMatch: syntheticFixture("scheduled-match", ({ tournament }) => {
    tournament.stages = [{ id: "swiss", type: "swiss", title: "Swiss", rules: [], groups: [], matches: [match()] }];
  }),
  confirmedResult: syntheticFixture("confirmed-result", ({ tournament }) => {
    tournament.stages = [{ id: "swiss", type: "swiss", title: "Swiss", rules: [], groups: [], matches: [match({ status: "completed", resultConfirmed: true, scoreKind: "series", score1: 1, score2: 0 })] }];
  }),
  unconfirmedResult: syntheticFixture("unconfirmed-result", ({ tournament }) => {
    tournament.stages = [{ id: "swiss", type: "swiss", title: "Swiss", rules: [], groups: [], matches: [match({ status: "completed", resultConfirmed: false, scoreKind: "series", score1: 1, score2: 0 })] }];
  }),
  technicalVictory: syntheticFixture("technical-victory", ({ tournament }) => {
    tournament.stages = [{ id: "swiss", type: "swiss", title: "Swiss", rules: [], groups: [], matches: [match({ status: "walkover", resultConfirmed: true, scoreKind: "technical", score1: 1, score2: 0 })] }];
  }),
  invalidTeamReference: syntheticFixture("invalid-team-reference", ({ tournament }) => {
    tournament.participants[1] = { teamId: "fixture-missing", displayName: "Missing", status: "registered" };
  }),
  hiddenBracketMatch: syntheticFixture("hidden-bracket-match", ({ tournament }) => {
    tournament.stages = [{ id: "playoffs", type: "double_elimination", title: "Плей-офф", rules: [], rounds: [{ id: "upper", label: "Верхняя сетка", matches: [match({ published: false })] }] }];
  }),
  assignedToEmptySlot: syntheticFixture("assigned-to-empty-slot", ({ tournament }) => {
    tournament.stages = [{ id: "playoffs", type: "double_elimination", title: "Плей-офф", rules: [], rounds: [{ id: "upper", label: "Верхняя сетка", matches: [match({ winnerTo: { matchId: "m2", slot: 1 } }), { id: "m2" }] }] }];
  }),
});

export const fixtureMatrix = Object.freeze([realFixture, ...Object.values(syntheticFixtures)]);

