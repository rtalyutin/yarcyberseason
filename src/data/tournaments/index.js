import currentCs2 from "./current-cs2-2026.json" with { type: "json" };
import { currentDotaTournament, setCurrentDotaTournament } from "../dota-tournament.js";
import dota2Main from "./dota2-main-2026.json" with { type: "json" };
import cs2February from "./cs2-february-2026.json" with { type: "json" };
import dota2Qual from "./dota2-qual-2026.json" with { type: "json" };
import { isArchive } from '../../lib/tournament.js';

export const tournaments = [currentCs2, currentDotaTournament, dota2Main, cs2February, dota2Qual];

export const tournamentBySlug = Object.fromEntries(
  tournaments.map((tournament) => [tournament.slug, tournament]),
);

const newestFirst = (a, b) => (b.dates?.end || b.dates?.start || '').localeCompare(a.dates?.end || a.dates?.start || '');
export const archivedTournaments = [];
export let currentTournament;
export let nextTournament;

function refreshCatalog() {
  archivedTournaments.splice(0, archivedTournaments.length, ...tournaments.filter(isArchive).sort(newestFirst));
  const announced = tournaments.filter((tournament) => !isArchive(tournament));
  currentTournament = announced.find((tournament) => tournament.id === currentDotaTournament.id)
    || announced[0] || archivedTournaments[0];
  nextTournament = announced.find((tournament) => ['upcoming', 'registration_open'].includes(tournament.status)) || null;
}
refreshCatalog();

export function getTournament(slug) {
  return tournamentBySlug[slug];
}

export function updateDotaTournament(tournament) {
  if (tournament.id !== currentDotaTournament.id) throw new Error("Wrong tournament overlay");
  setCurrentDotaTournament(tournament);
  tournaments[tournaments.indexOf(tournamentBySlug[tournament.slug])] = tournament;
  tournamentBySlug[tournament.slug] = tournament;
  refreshCatalog();
}
