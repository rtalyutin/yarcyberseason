import { currentTournament, getTournament, nextTournament } from '../data/tournaments/index.js';

export function getNavigationTournament(path) {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/tournaments/next') return nextTournament || currentTournament;
  const slug = normalized.match(/^\/tournaments\/([a-z0-9-]+)(?:\/|$)/)?.[1];
  return slug ? getTournament(slug) || null : null;
}

export function getSiteNavigation(path) {
  const normalized = path.replace(/\/+$/, '') || '/';
  const tournament = getNavigationTournament(normalized) || currentTournament;
  const matchday = tournament.matchday?.route || `/tournaments/${tournament.slug}?section=matches&phase=all`;
  return [
    { label: 'Турниры', href: '/tournaments', active: normalized === '/tournaments' || normalized.startsWith('/tournaments/') && !normalized.endsWith('/matchday') },
    { label: 'Матчи', href: matchday, active: normalized.endsWith('/matchday') },
    { label: 'Архив', href: '/results' },
    { label: 'Трансляции', href: '/broadcasts' },
    { label: 'Партнёрам', href: '/partners' },
    { label: 'О проекте', href: '/about' },
  ];
}

export function filterTournamentDirectory(items, { query = '', discipline = 'all', status = 'all' } = {}) {
  const search = query.trim().normalize('NFKC').toLocaleLowerCase('ru-RU');
  return items.filter((item) => {
    const completed = ['archive', 'completed'].includes(item.status);
    return (discipline === 'all' || item.discipline === discipline)
      && (status === 'all' || (status === 'completed' ? completed : !completed))
      && (!search || [item.title, item.season, item.discipline, item.dates?.display].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase('ru-RU').includes(search));
  }).sort((a, b) => {
    const rank = (item) => ['archive', 'completed'].includes(item.status) ? 1 : 0;
    return rank(a) - rank(b) || (b.dates?.end || b.dates?.start || '').localeCompare(a.dates?.end || a.dates?.start || '');
  });
}
