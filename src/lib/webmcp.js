import { matchKey, matchPath, teamPath, teamSummary } from './community.js';

const normalize = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru-RU');
const includes = (values, query) => !query || values.some((value) => normalize(value).includes(normalize(query)));
const copy = (value) => JSON.parse(JSON.stringify(value));
const pick = (value, keys) => Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
const string = (description) => ({ type: 'string', minLength: 1, maxLength: 200, description });
const discipline = { type: 'string', enum: ['Dota 2', 'Counter-Strike 2'], description: 'Дисциплина, в точном написании.' };
const pagination = {
  offset: { type: 'integer', minimum: 0, description: 'Смещение; по умолчанию 0. Используйте nextOffset из предыдущего ответа.' },
  limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Размер страницы; по умолчанию 50, максимум 100.' },
};
class QueryError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function validate(input, schema) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new QueryError('INVALID_ARGUMENT', 'Ожидается объект параметров.');
  for (const key of Object.keys(input)) {
    const rule = schema.properties[key], value = input[key];
    if (!Object.hasOwn(schema.properties, key)) throw new QueryError('INVALID_ARGUMENT', `Неизвестный параметр: ${key}`);
    if (rule.type === 'string' && (typeof value !== 'string' || !value.trim() || value.length > rule.maxLength)) throw new QueryError('INVALID_ARGUMENT', `Некорректная строка: ${key}`);
    if (rule.type === 'integer' && (!Number.isSafeInteger(value) || value < rule.minimum || (rule.maximum !== undefined && value > rule.maximum))) throw new QueryError('INVALID_ARGUMENT', `Некорректное целое число: ${key}`);
    if (rule.enum && !rule.enum.includes(value)) throw new QueryError('INVALID_ARGUMENT', `Недопустимое значение: ${key}`);
  }
  for (const key of schema.required) if (!Object.hasOwn(input, key)) throw new QueryError('INVALID_ARGUMENT', `Обязательный параметр: ${key}`);
}

/** Read the SAME in-memory public data model as the site's community pages.
 * No fetch, storage, navigation or mutations. Every result is a detached copy.
 */
export function createWebMcpTools({ tournaments, community, dataVersion }) {
  const tournament = (id) => {
    const found = tournaments.find((item) => item.id === id || item.slug === id);
    if (!found) throw new QueryError('NOT_FOUND', `Турнир не найден: ${id}`);
    return found;
  };
  const team = (id) => {
    const found = community.getTeam(id);
    if (!found) throw new QueryError('NOT_FOUND', `Команда не найдена: ${id}`);
    return found;
  };
  const matches = [...community.matches.values()];
  const teamNames = (item) => item ? [item.name, item.id, ...(item.previousNames || []).map((name) => name.name), ...item.entries.flatMap((entry) => entry.names)] : [];
  const tournamentMatches = (id) => matches.filter((match) => match.tournamentId === id);
  const tournamentView = (item) => ({
    ...pick(item, ['id', 'slug', 'title', 'discipline', 'season', 'status', 'statusLabel', 'summary', 'dates', 'sourceNote']),
    url: `/tournaments/${encodeURIComponent(item.slug)}`,
    matchCount: tournamentMatches(item.id).length,
    linkedTeamCount: [...community.teams.values()].filter((entry) => entry.entries.some((e) => e.tournament.id === item.id)).length,
  });
  const matchView = (item) => ({
    ...pick(item, ['key', 'id', 'tournamentId', 'tournamentSlug', 'tournamentTitle', 'discipline', 'stageId', 'stageTitle', 'roundTitle', 'team1', 'team2', 'team1Id', 'team2Id', 'seed1', 'seed2', 'status', 'bestOf', 'date', 'dateDisplay', 'time', 'scheduledAt', 'scoreKind', 'resultConfirmed', 'resultIssue', 'result', 'note', 'roundRecord', 'sourceLabel', 'sourceNote', 'replayUrl', 'broadcastUrl', 'faceitUrl', 'winnerTo', 'loserTo', 'consequenceText']),
    url: matchPath(item),
  });
  const teamView = (item) => ({
    ...pick(item, ['id', 'name', 'disciplines', 'previousNames', 'legacyIds']),
    url: teamPath(item.id),
    tournamentIds: item.entries.map((entry) => entry.tournament.id),
    matchCount: item.matches.length,
  });
  const page = (items, input) => {
    const offset = input.offset ?? 0, limit = input.limit ?? 50;
    return { total: items.length, offset, limit, nextOffset: offset + limit < items.length ? offset + limit : null, items: items.slice(offset, offset + limit) };
  };
  const define = (name, description, properties, required, read) => {
    const inputSchema = { type: 'object', properties, required, additionalProperties: false };
    return {
      name, description, inputSchema, annotations: { readOnlyHint: true },
      execute: async (input = {}) => {
        try {
          validate(input, inputSchema);
          return copy({ ok: true, dataVersion, ...read(input) });
        } catch (error) {
          if (!(error instanceof QueryError)) throw error;
          return { ok: false, dataVersion, error: { code: error.code, message: error.message } };
        }
      },
    };
  };
  const query = string('Поиск по названию без учёта регистра; названия из истории команды также учитываются.');
  const tournamentId = string('ID или slug турнира из ycs_list_tournaments.');
  const teamId = string('ID команды из ycs_list_teams; исторические ID также поддерживаются.');
  return [
    define('ycs_list_tournaments', 'Читать опубликованные турниры ЯКС: статусы, даты, описания и ссылки. linkedTeamCount — число команд, связанных с турниром в реестре, не обязательно полный размер исторического турнира. Пагинация через nextOffset. Все данные относятся к версии сайта dataVersion.',
      { query: string('Поиск по названию, сезону, ID и описанию турнира без учёта регистра.'), discipline, status: string('Точный статус турнира из данных, например completed, upcoming или archive.'), ...pagination }, [],
      (input) => page(tournaments.filter((item) => (!input.discipline || item.discipline === input.discipline) && (!input.status || item.status === input.status) && includes([item.title, item.season, item.id, item.summary], input.query)).map(tournamentView), input)),
    define('ycs_get_tournament', 'Читать содержание турнира: правила, регистрацию, призы, участников, таблицы, этапы и итоги. Список матчей — через ycs_list_matches. Неизвестные и отсутствующие сведения не означают ноль или отсутствие событий.',
      { tournamentId }, ['tournamentId'], (input) => {
        const item = tournament(input.tournamentId);
        const stageView = (stage) => {
          const { matches: omittedMatches, rounds, ...metadata } = stage;
          const records = tournamentMatches(item.id).filter((match) => match.stageId === stage.id);
          return { ...metadata, matchKeys: records.map((match) => match.key), ...(rounds ? { rounds: rounds.map(({ matches: roundMatches, ...round }) => ({ ...round, matchKeys: (roundMatches || []).filter((match) => community.matches.has(matchKey(item.id, match.id))).map((match) => matchKey(item.id, match.id)) })) } : {}) };
        };
        return { tournament: { ...tournamentView(item), ...pick(item, ['schemaVersion', 'facts', 'archiveLabel', 'results', 'registration', 'participants', 'prizeDistribution', 'additionalAwards', 'referralContest', 'timeline', 'support', 'primaryAction', 'secondaryAction', 'matchday']), stages: (item.stages || []).map(stageView) } };
      }),
    define('ycs_list_matches', 'Читать опубликованные матчи с фильтрами по турниру, команде, дисциплине, статусу и названию. Исторические названия сохраняются. result.score — подтверждённый счёт; result.sourceScore может быть неподтверждённым. Не додумывать год, время, карты или победителя. Пагинация через nextOffset.',
      { tournamentId, teamId, discipline, status: string('Точный статус матча: scheduled, live, completed, walkover, bye, postponed, cancelled, unknown.'), query, ...pagination }, [], (input) => {
        const tid = input.tournamentId ? tournament(input.tournamentId).id : null;
        const selectedTeam = input.teamId ? team(input.teamId) : null;
        return page(matches.filter((item) => (!tid || item.tournamentId === tid) && (!selectedTeam || [item.team1Id, item.team2Id].includes(selectedTeam.id)) && (!input.discipline || item.discipline === input.discipline) && (!input.status || item.status === input.status) && includes([item.id, item.team1, item.team2, item.tournamentTitle, item.stageTitle, item.roundTitle, ...teamNames(community.getTeam(item.team1Id)), ...teamNames(community.getTeam(item.team2Id))], input.query)).map(matchView), input);
      }),
    define('ycs_get_match', 'Читать один опубликованный матч, подтверждённый результат, исходный счёт, карты и связи сетки. Идентификатор матча уникален внутри турнира. Пустой список карт означает отсутствие опубликованных карт, а не счёт 0:0.',
      { tournamentId, matchId: string('ID матча из ycs_list_matches, без префикса турнира.') }, ['tournamentId', 'matchId'], (input) => {
        const item = community.matches.get(matchKey(tournament(input.tournamentId).id, input.matchId));
        if (!item) throw new QueryError('NOT_FOUND', `Опубликованный матч не найден: ${input.matchId}`);
        return { match: matchView(item) };
      }),
    define('ycs_list_teams', 'Читать реестр команд ЯКС. Искать по текущим и историческим названиям, фильтровать по турниру и дисциплине. Команды с несколькими дисциплинами возвращаются один раз. Пагинация через nextOffset.',
      { query, tournamentId, discipline, ...pagination }, [], (input) => {
        const tid = input.tournamentId ? tournament(input.tournamentId).id : null;
        return page([...community.teams.values()].filter((item) => (!tid || item.entries.some((entry) => entry.tournament.id === tid)) && (!input.discipline || item.disciplines.includes(input.discipline)) && includes(teamNames(item), input.query)).map(teamView), input);
      }),
    define('ycs_get_team', 'Читать команду, прежние названия, участия, места и статистику отдельно по дисциплинам. Статистика только по опубликованным подтверждённым результатам; технические решения отдельно. Матчи получить через ycs_list_matches с teamId. Составы игроков не опубликованы.',
      { teamId }, ['teamId'], (input) => {
        const item = team(input.teamId);
        return { team: { ...teamView(item), rosterStatus: 'not_published', entries: item.entries.map((entry) => ({ tournament: tournamentView(entry.tournament), names: entry.names, placement: entry.placement, status: entry.status, displayName: entry.displayName })), statistics: item.disciplines.map((value) => {
          const summary = teamSummary(item, value);
          return { discipline: value, ...summary, opponents: summary.opponents.map((opponent) => ({ ...opponent, matches: opponent.matches.map((match) => match.key) })) };
        }) } };
      }),
  ];
}
