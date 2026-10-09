import { nextTournament, currentTournament, archivedTournaments } from './tournaments/index.js';
import { projectContent } from './project-content.js';
import { buildHomeContent } from '../lib/home-content.js';

// Read on each render so an accepted results overlay reaches both homes.
export function loadHomeContent() {
  return buildHomeContent({ featuredTournament: nextTournament, seasonTournament: currentTournament,
    archives: archivedTournaments,
    project: projectContent });
}
