import source from "./tournaments/dota2-autumn-2026.json" with { type: "json" };

export let currentDotaTournament = source;
export function setCurrentDotaTournament(tournament) { currentDotaTournament = tournament; }
