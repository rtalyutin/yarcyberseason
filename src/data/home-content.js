import { currentTournament, archivedTournaments } from './tournaments/index.js';
import { projectContent } from './project-content.js';
import { buildHomeContent } from '../lib/home-content.js';

// Read on each render so an accepted results overlay reaches both homes.
export function loadHomeContent(now = new Date()) {
  const seasonTournament = archivedTournaments.find((tournament) => tournament.id !== currentTournament.id)
    || currentTournament;
  return buildHomeContent({ featuredTournament: currentTournament, seasonTournament,
    archives: archivedTournaments, project: projectContent, now });
}
