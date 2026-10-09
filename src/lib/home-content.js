import { getHomeBroadcastBoard } from './home-board.js';
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
  const streamUrl = state === 'live' ? safeHttps(match?.broadcastUrl) || safeHttps(match?.streamUrl) : null;
  const notes = {
    pending: 'Подтверждённый счёт пока не опубликован.',
    postponed: 'Новая дата будет опубликована после согласования.',
    result: 'Следующий эфир пока не объявлен.',
    technical: `${match?.status === 'bye' ? 'Проход без игры.' : 'Техническая победа.'} Следующий эфир пока не объявлен.`,
    unannounced: 'Пара следующей трансляции пока не опубликована.',
  };
  return {
    ...board,
    label: { scheduled: 'Следующий эфир', live: 'В эфире', result: 'Итог эфира', technical: 'Технический результат',
      pending: 'Итог уточняется', postponed: 'Матч перенесён', unannounced: 'Следующий эфир' }[state],
    date: match ? state === 'postponed' ? 'Дата уточняется' : matchDateLabel(match) : null,
    format: match?.bestOf || 'Формат уточняется',
    note: notes[state] || (state === 'live' && !streamUrl ? 'Ссылка на эфир пока не опубликована.'
      : state === 'scheduled' && !match.scheduledAt && !match.time ? 'Время начала уточняется. Трансляция запланирована.' : null),
    streamUrl,
    actionLabel: ['result', 'technical'].includes(state) ? 'Все матчи' : 'Расписание матчей',
  };
}

export function buildHomeContent({ featuredTournament, seasonTournament, archives, project }) {
  return {
    kicker: 'YAR CYBER SEASON / 2026',
    headline: ['Заявки закрыты.', 'Арена открыта.'],
    featuredTournament,
    facts: [`${participantCount(featuredTournament)} команд`, `Призовой фонд ${featuredTournament.prizeDistribution.total}`],
    broadcast: getHomeBroadcastContent(featuredTournament),
    season: { tournament: seasonTournament, finished: isArchive(seasonTournament),
      match: getHomePlayoffMatch(seasonTournament), outcome: getTournamentOutcome(seasonTournament) },
    archivePreview: archives.slice(0, 3).map((tournament) => ({ tournament, champions: getChampionLabels(tournament) })),
    partners: project.partners,
    contactEmail: project.contactEmail,
  };
}
