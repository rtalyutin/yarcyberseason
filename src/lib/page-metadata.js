import { community } from '../data/community.js';
import { matchPath, matchStates, teamPath } from './community.js';
import { currentTournament, getTournament, nextTournament } from '../data/tournaments/index.js';
import { normalizePublicPath, PUBLIC_ORIGIN } from './public-routes.js';
import { getTournamentOutcome, isArchive } from './tournament.js';

const defaultImage = `${PUBLIC_ORIGIN}/assets/ycs-logo.jpg`;
const homeDescription = 'Киберспортивные турниры Ярославля: расписание, результаты и команды ЯрКиберСезона.';

export function getPageMetadata(pathname) {
  const path = normalizePublicPath(pathname);
  const base = { title: 'ЯрКиберСезон — киберспортивные турниры Ярославля', description: homeDescription, canonicalPath: path, image: defaultImage };

  if (path === '/') {
    const outcome = getTournamentOutcome(currentTournament);
    return isArchive(currentTournament) ? { ...base, canonicalPath: '/',
      title: `${outcome?.champion ? `${outcome.champion} — чемпион` : 'Итоги турнира'} · ${currentTournament.title} — ЯрКиберСезон`,
      description: `${currentTournament.title}, ${currentTournament.dates.display}. Турнир завершён. ${outcome?.final ? `Грандфинал: ${outcome.final.team1} — ${outcome.final.team2}, ${outcome.final.score1}:${outcome.final.score2}.` : 'Результаты матчей и статистика игроков.'}`,
    } : { ...base, canonicalPath: '/' };
  }
  if (path === '/player/profile') return { ...base, title: 'Карточка игрока — Лига цифровой экономики', description: 'Карточка игрока Лиги цифровой экономики: фото, никнейм и необязательное ФИО.', image: `${PUBLIC_ORIGIN}/assets/player-league/league-25.svg`, noindex: true };
  if (path === '/org' || path === '/orgs') return { ...base, canonicalPath: '/org', title: 'Матчи и капитаны · Организаторы — ЯрКиберСезон', description: 'Закрытая рабочая таблица организаторов ЯрКиберСезона.', noindex: true };
  if (path === '/tournaments') return { ...base, title: 'Все турниры — ЯрКиберСезон', description: 'Турниры ЯрКиберСезона по Dota 2 и CS2: прямой доступ к матчам, командам, сетке и итогам каждого сезона.' };
  if (path === '/results') return { ...base, title: 'Архив и результаты турниров — ЯрКиберСезон', description: 'Архив турниров ЯрКиберСезона в Ярославле: подтверждённые результаты и история соревнований.' };
  if (path === '/broadcasts') return { ...base, title: 'Трансляции турниров — ЯрКиберСезон', description: 'Страницы трансляций, расписание эфиров и записи матчей турниров ЯрКиберСезона.' };
  if (path === '/partners') return { ...base, title: 'Партнёры — ЯрКиберСезон', description: 'Организации и компании, поддерживающие турниры ЯрКиберСезона в Ярославле.' };
  if (path === '/about') return { ...base, title: 'Организаторы — ЯрКиберСезон', description: 'Люди, которые организуют турниры, готовят матчи и поддерживают связь с участниками ЯрКиберСезона.' };
  if (path === '/webmcp') return { ...base, title: 'Турниры, матчи и команды · WebMCP — ЯрКиберСезон', description: 'Открытые опубликованные данные ЯрКиберСезона для совместимых ИИ-браузеров: турниры, матчи, команды и результаты.' };
  if (path === '/forMari') return { ...base, title: 'Симулятор Swiss — ЯрКиберСезон', description: 'Внутренний симулятор турниров по швейцарской системе.', noindex: true };
  const matchdayPath = path.match(/^\/tournaments\/([a-z0-9-]+)\/matchday$/);
  const matchdayTournament = matchdayPath && getTournament(matchdayPath[1]);
  if (matchdayTournament?.matchday?.route === path) return { ...base, title: `Matchday · ${matchdayTournament.title} — ЯрКиберСезон`, description: `Расписание и опубликованные результаты матчей турнира ${matchdayTournament.title}.` };

  if (path === '/tournaments/next') {
    const target = nextTournament || currentTournament;
    return tournamentMetadata(target, `/tournaments/${encodeURIComponent(target.slug)}`);
  }
  const tournamentPath = path.match(/^\/tournaments\/([a-z0-9-]+)$/);
  if (tournamentPath) {
    const tournament = getTournament(decodeURIComponent(tournamentPath[1]));
    if (tournament) return tournamentMetadata(tournament, `/tournaments/${encodeURIComponent(tournament.slug)}`);
  }

  const teamPathMatch = path.match(/^\/teams\/([a-z0-9-]+)$/);
  if (teamPathMatch) {
    const team = community.getTeam(decodeURIComponent(teamPathMatch[1]));
    if (team) {
      const rosterText = team.entries.some((entry) => entry.roster) ? 'опубликованные составы, ' : '';
      return { ...base, title: `${team.name} — команда ЯрКиберСезона`, description: `${team.name}: турниры, ${rosterText}матчи и статистика по опубликованным данным ЯрКиберСезона.`, canonicalPath: teamPath(team.id) };
    }
  }

  const matchRoute = path.match(/^\/tournaments\/([a-z0-9-]+)\/matches\/([a-z0-9-]+)$/);
  if (matchRoute) {
    const tournament = getTournament(decodeURIComponent(matchRoute[1]));
    const match = tournament && community.matches.get(`${tournament.id}/${decodeURIComponent(matchRoute[2])}`);
    if (match) {
      const summary = match.result.confirmed && match.result.score
        ? `Подтверждённый счёт серии: ${match.result.score.join(' : ')}.`
        : 'Статус, опубликованные сведения и подтверждённый счёт матча.';
      const date = match.dateDisplay || match.date;
      const status = matchStates[match.status] ? `Статус: ${matchStates[match.status]}.` : '';
      return { ...base, title: `${match.team1 || 'Команда уточняется'} — ${match.team2 || 'команда уточняется'} · ${tournament.title} — ЯрКиберСезон`, description: [tournament.title, date, status, summary].filter(Boolean).join('. '), canonicalPath: matchPath(match) };
    }
  }

  return { ...base, title: 'Страница не найдена — ЯрКиберСезон', description: 'Запрошенная страница не найдена. Откройте список турниров ЯрКиберСезона.', noindex: true };
}

function tournamentMetadata(tournament, canonicalPath) {
  const datePart = tournament.dates?.display ? ` Даты: ${tournament.dates.display}.` : '';
  const summary = tournament.summary || 'Статус, правила, опубликованные матчи и итоги турнира.';
  const status = tournament.statusLabel ? ` ${tournament.statusLabel}.` : '';
  return {
    title: `${tournament.title} — ЯрКиберСезон`,
    description: `${summary}${status}${datePart}`,
    canonicalPath,
    image: defaultImage,
  };
}

export function applyPageMetadata(pathname) {
  const metadata = getPageMetadata(pathname);
  document.title = metadata.title;
  setMeta('name', 'description', metadata.description);
  setMeta('property', 'og:title', metadata.title);
  setMeta('property', 'og:description', metadata.description);
  setMeta('property', 'og:url', `${PUBLIC_ORIGIN}${metadata.canonicalPath}`);
  setMeta('property', 'og:image', metadata.image || defaultImage);
  setMeta('property', 'og:type', 'website');
  let canonical = document.querySelector('link[rel="canonical"]');
  if (metadata.noindex) {
    setMeta('name', 'robots', 'noindex,follow');
    canonical?.remove();
  } else {
    document.querySelector('meta[name="robots"]')?.remove();
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = `${PUBLIC_ORIGIN}${metadata.canonicalPath}`;
  }
  return metadata;
}

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}
