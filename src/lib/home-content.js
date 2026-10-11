import { getHomeBroadcastBoard, getHomeBroadcastTitle } from './home-board.js';
import { getMatchBroadcastLinks } from './broadcasts.js';
import { matchDateLabel, safeHttps } from './community.js';
import { getChampionLabels, getTournamentOutcome, isArchive, participantCount } from './tournament.js';

export function getHomePlayoffMatch(tournament) {
  const outcome = getTournamentOutcome(tournament);
  if (outcome?.final) return { ...outcome.final, roundLabel: 'Гранд-финал' };
  const playoff = tournament.stages?.find((stage) => stage.id === 'playoffs');
  if (!playoff?.rounds) return null;
  const matches = playoff.rounds.flatMap((round) => round.matches.map((match) => ({ ...match, roundLabel: round.label })));
  return matches.find((match) => match.status !== 'completed' && match.id.includes('grand-final'))
    || matches.find((match) => match.status !== 'completed') || matches.at(-1) || null;
}

// One presentation-independent projection for the website and Telegram home.
export function getHomeBroadcastContent(tournament) {
  const board = getHomeBroadcastBoard(tournament);
  const { match, state } = board;
  const notes = {
    pending: 'Подтверждённый счёт пока не опубликован.',
    postponed: 'Новая дата будет опубликована после согласования.',
    unannounced: 'Следующий эфир пока не объявлен.',
    unknown: 'Статус матча уточняется.',
  };
  const casters = (match?.casters || []).flatMap((caster) => {
    const name = typeof caster === 'string' ? caster : caster?.name;
    return typeof name === 'string' && name.trim()
      ? [{ name: name.trim(), url: typeof caster === 'object' ? safeHttps(caster.url) : null }] : [];
  });
  return {
    ...board,
    label: { scheduled: 'Следующий эфир', live: 'В эфире', pending: 'Итог уточняется',
      postponed: 'Матч перенесён', unannounced: 'Следующий эфир', unknown: 'Статус уточняется' }[state],
    date: match ? state === 'postponed' ? 'Дата уточняется' : matchDateLabel(match) : null,
    format: match?.bestOf || 'Формат уточняется',
    note: notes[state] || (state === 'scheduled' && !match.scheduledAt && !match.time ? 'Время начала уточняется. Трансляция запланирована.' : null),
    links: getMatchBroadcastLinks(match),
    casters,
    actionLabel: 'Расписание матчей',
  };
}

export function buildHomeContent({ featuredTournament, seasonTournament, archives, project, now = new Date() }) {
  const title = getHomeBroadcastTitle(featuredTournament, now);
  const total = featuredTournament.prizeDistribution?.total;
  const registry = project.partnerRegistry;
  const scoped = (items, scope) => (items || []).filter((partner) =>
    (registry ? partner.confirmed === true : partner.confirmed !== false) &&
    (!partner.tournamentId || partner.tournamentId === featuredTournament.id) &&
    (partner.scope === scope || (!registry && !partner.scope)));
  return {
    kicker: 'YAR CYBER SEASON / 2026',
    headline: title === 'Сегодня открываем сезон.' ? ['Сегодня открываем', 'сезон.'] : [title, ''],
    featuredTournament,
    facts: [`${participantCount(featuredTournament)} команд`, ...(total ? [`Призовой фонд ${total}`] : [])],
    broadcast: getHomeBroadcastContent(featuredTournament),
    season: { tournament: seasonTournament, finished: isArchive(seasonTournament),
      match: getHomePlayoffMatch(seasonTournament), outcome: getTournamentOutcome(seasonTournament) },
    archivePreview: archives.slice(0, 3).map((tournament) => ({ tournament, champions: getChampionLabels(tournament) })),
    partners: scoped(registry || project.partners, 'tournament'),
    officialSupport: scoped(registry || project.officialSupport, 'official'),
    contactEmail: project.contactEmail,
  };
}
