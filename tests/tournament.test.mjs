import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { filterTournamentMatches, getTournamentModel, hasScore, isFinished, matchDateParts, resolveTournamentView } from "../src/lib/tournament.js";

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../src/data/tournaments/${file}.json`, import.meta.url)));
const archive = read("cs2-february-2026");
const current = read("current-cs2-2026");

test("February archive shows all 33 published matches and the correct five latest playoff results", () => {
  const model = getTournamentModel(archive);
  assert.equal(model.matches.length, 33);
  assert.equal(model.finishedCount, 33);
  assert.equal(model.filters.find((filter) => filter.id === "before-playoffs").count, 20);
  assert.equal(model.filters.find((filter) => filter.id === "playoffs").count, 13);
  assert.deepEqual(filterTournamentMatches(model.matches, "playoffs").slice(0, 5).map((match) => [match.team1, match.score1, match.score2, match.team2]), [
    ["LigaChad", 2, 0, "Vpopengagen wolves"],
    ["Resistance", 2, 0, "Vpopengagen wolves"],
    ["LigaChad", 2, 0, "Saint Worms"],
    ["Slabeyshie", 0, 2, "LigaChad"],
    ["Saint Worms", 2, 0, "FIST&BEER"],
  ]);
  assert.ok(!model.matches.some((match) => /grand-final/.test(match.id)));
});

test("Search covers both opponents, respects the phase and handles missing results", () => {
  const model = getTournamentModel(archive);
  const matches = filterTournamentMatches(model.matches, "playoffs", "  RESISTANCE  ");
  assert.equal(matches.length, 3);
  assert.ok(matches.some((match) => match.team2 === "Resistance"));
  assert.equal(filterTournamentMatches(model.matches, "all", "Несуществующая команда").length, 0);
});

test("Current matches preserve the pending finals, corrected PSB result and technical 1:0", () => {
  const snapshot = JSON.stringify(current);
  const model = getTournamentModel(current);
  const upcoming = model.matches.filter((match) => !isFinished(match));
  assert.equal(upcoming.length, 2);
  assert.equal(upcoming[0].date, "2026-09-05");
  assert.equal(upcoming[1].date, "2026-09-06");
  assert.ok(upcoming.every((match) => !hasScore(match)));
  const psb = model.matches.find((match) => match.phase === "playoffs" && [match.team1, match.team2].includes("GoonGang") && [match.team1, match.team2].includes("PSB_Bank"));
  assert.deepEqual([psb.score1, psb.score2], [1, 2]);
  assert.ok(model.matches.filter((match) => match.status === "walkover").every((match) => Math.max(match.score1, match.score2) === 1));
  assert.equal(JSON.stringify(current), snapshot, "Presentation must not mutate tournament data or frozen seeds");
});

test("Registration-only event exposes its rules and information, never counts empty bracket slots", () => {
  const model = getTournamentModel(read("dota2-autumn-2026"));
  assert.equal(model.matches.length, 0);
  assert.equal(model.defaultSection, "info");
  assert.deepEqual(model.sections.map((section) => section.id), ["swiss", "playoffs", "info"]);
});

test("Legacy archives keep partial stages, stable unique match keys and yearless dates", () => {
  const main = getTournamentModel(read("dota2-main-2026"));
  assert.equal(main.sections.find((section) => section.id === "playoffs").stage.type, "historical_matches");
  assert.equal(new Set(main.matches.map((match) => match.key)).size, main.matches.length);
  const qual = getTournamentModel(read("dota2-qual-2026"));
  assert.ok(!qual.sections.some((section) => section.id === "playoffs"));
  assert.equal(matchDateParts(qual.matches[0]).year, null);
  assert.equal(matchDateParts({ dateDisplay: "5 фев · 19:00" }).month, 2);
});

test("Deep links and browser history resolve sections and filters without inventing a section", () => {
  const model = getTournamentModel(current);
  assert.equal(resolveTournamentView(model, "", "#playoffs").section, "playoffs");
  assert.equal(resolveTournamentView(model, "", "#round-robin").section, "round-robin");
  assert.equal(resolveTournamentView(model, "", "#round-5").phase, "round-5");
  assert.deepEqual(resolveTournamentView(model, "?section=matches&phase=all&q=Resistance"), { section: "matches", phase: "all", query: "Resistance" });
  assert.equal(resolveTournamentView(model, "?section=invalid&phase=invalid").section, "matches");
  assert.doesNotThrow(() => resolveTournamentView(model, "", "#%broken"));
  assert.equal(resolveTournamentView(getTournamentModel(read("dota2-autumn-2026")), "", "#format").section, "info");
});
