import { community } from '../data/community.js';
import { currentTournament, nextTournament, tournaments } from '../data/tournaments/index.js';
import { PUBLIC_ORIGIN } from './public-origin.js';

export { PUBLIC_ORIGIN };

const route = (pathname, includeInSitemap = true) => ({ pathname, includeInSitemap });

export function listPublicRoutes() {
  const routes = [
    route('/'),
    route('/results'),
    route('/broadcasts'),
    route('/partners'),
    route('/about'),
    route('/webmcp'),
    route(currentTournament.matchday.route),
    route('/tournaments/next', false),
    ...tournaments.map((tournament) => route(`/tournaments/${encodeURIComponent(tournament.slug)}`)),
    ...[...community.teams.values()].map((team) => route(`/teams/${encodeURIComponent(team.id)}`)),
    ...[...community.matches.values()].map((match) => route(`/tournaments/${encodeURIComponent(match.tournamentSlug)}/matches/${encodeURIComponent(match.id)}`)),
  ];
  return [...new Map(routes.map((item) => [item.pathname, item])).values()];
}

export function normalizePublicPath(pathname) {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}
