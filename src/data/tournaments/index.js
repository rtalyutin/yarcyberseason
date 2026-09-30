import currentCs2 from "./current-cs2-2026.json";
import { currentDotaTournament, setCurrentDotaTournament } from "../dota-tournament.js";
import dota2Main from "./dota2-main-2026.json";
import cs2February from "./cs2-february-2026.json";
import dota2Qual from "./dota2-qual-2026.json";

export const tournaments = [currentCs2, currentDotaTournament, dota2Main, cs2February, dota2Qual];

export const tournamentBySlug = Object.fromEntries(
  tournaments.map((tournament) => [tournament.slug, tournament]),
);

export const currentTournament = currentCs2;
export let nextTournament = currentDotaTournament;
export const archivedTournaments = tournaments.filter((tournament) => ["archive", "completed"].includes(tournament.status));

export function getTournament(slug) {
  return tournamentBySlug[slug];
}

export function updateDotaTournament(tournament) {
  if (tournament.id !== currentDotaTournament.id) throw new Error("Wrong tournament overlay");
  setCurrentDotaTournament(tournament);
  nextTournament = tournament;
  tournaments[tournaments.indexOf(tournamentBySlug[tournament.slug])] = tournament;
  tournamentBySlug[tournament.slug] = tournament;
}
