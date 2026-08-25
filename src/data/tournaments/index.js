import currentCs2 from "./current-cs2-2026.json";
import dota2Autumn from "./dota2-autumn-2026.json";
import dota2Main from "./dota2-main-2026.json";
import cs2February from "./cs2-february-2026.json";
import dota2Qual from "./dota2-qual-2026.json";

export const tournaments = [currentCs2, dota2Autumn, dota2Main, cs2February, dota2Qual];

export const tournamentBySlug = Object.fromEntries(
  tournaments.map((tournament) => [tournament.slug, tournament]),
);

export const currentTournament = currentCs2;
export const nextTournament = dota2Autumn;
export const archivedTournaments = [dota2Main, cs2February, dota2Qual];

export function getTournament(slug) {
  return tournamentBySlug[slug];
}
