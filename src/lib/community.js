// Public sporting data only. No visitor, player or application records.
export const finishedStatuses = new Set(['completed', 'walkover', 'bye']);
export const matchStates = {
  scheduled: 'Матч назначен', live: 'Идёт матч', completed: 'Матч завершён',
  walkover: 'Техническая победа', bye: 'Проход без игры',
  postponed: 'Матч перенесён', cancelled: 'Матч отменён', unknown: 'Статус уточняется',
};
export const isPlaceholder = (name) => !name || /^(Без соперника|Не заявленная команда|Победитель|Проигравший|Ожидает|Соперник|TBD)(?:\s|$)/i.test(name);
export const matchKey = (tournamentId, id) => `${tournamentId}/${id}`;
export const matchPath = (match) => `/tournaments/${encodeURIComponent(match.tournamentSlug || match.tournamentId)}/matches/${encodeURIComponent(match.id)}`;
export const teamPath = (id) => `/teams/${encodeURIComponent(id)}`;
export const calendarPath = (id) => `/calendars/teams/${encodeURIComponent(id)}.ics`;
export function safeHttps(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function exactStart(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23) return null;
  return value;
}
const pair = (a, b) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 ? [a, b] : null;

export function normalizeResult(match, discipline = '') {
  const raw = pair(match.score1, match.score2);
  const confirmed = match.resultConfirmed === true && finishedStatuses.has(match.status);
  const technical = ['walkover', 'bye'].includes(match.status);
  const kind = match.scoreKind || 'unknown';
  const series = kind === 'series' ? raw : kind === 'rounds' && match.bestOf === 'BO1' && raw && raw[0] !== raw[1] ? [Number(raw[0] > raw[1]), Number(raw[1] > raw[0])] : null;
  let maps = (match.maps || []).map((map, i) => ({
    name: map.name || `Карта ${i + 1}`, score: pair(map.score1, map.score2),
    unit: discipline === 'Counter-Strike 2' ? 'Раунды' : 'Счёт карты',
    outcome: map.outcome || null,
  }));
  if (kind === 'rounds' && raw && !maps.length) maps = [{ name: match.map || 'Карта 1', score: raw, unit: 'Раунды', outcome: null }];
  const known = kind !== 'unknown' && Boolean(raw);
  const score = confirmed && known ? technical ? raw : series : null;
  return {
    confirmed, technical, known, sourceScore: raw, series: confirmed && !technical ? series : null,
    score, maps: confirmed ? maps : [],
    winnerSide: score && score[0] !== score[1] ? (score[0] > score[1] ? 1 : 2) : null,
    draw: Boolean(score && !technical && score[0] === score[1]),
    label: technical ? matchStates[match.status] : 'Счёт серии',
    canDownload: Boolean(confirmed && score),
  };
}

export function flattenMatches(tournaments) {
  return tournaments.flatMap((tournament) => (tournament.stages || []).flatMap((stage) =>
    (stage.rounds || [{ matches: stage.matches || [], label: stage.title }]).flatMap((round) =>
      (round.matches || []).filter((m) => m.published !== false && (m.team1 || m.team2)).map((match) => ({
        ...match, tournamentId: tournament.id, tournamentSlug: tournament.slug,
        tournamentTitle: tournament.title, discipline: tournament.discipline,
        stageId: stage.id, stageTitle: stage.title, roundTitle: round.label || match.stage || stage.title,
      })),
    ),
  ));
}

export function buildCommunityModel(tournaments, registry) {
  const teams = new Map(registry.teams.map((team) => [team.id, { ...team, matches: [], entries: [] }]));
  const teamAliases = new Map((registry.aliases || []).map((alias) => [alias.id, alias.teamId]));
  const getTeam = (id) => teams.get(teamAliases.get(id) || id) || null;
  for (const team of teams.values()) team.legacyIds = [...teamAliases].filter(([, id]) => id === team.id).map(([id]) => id);
  const bindings = new Map(registry.bindings.map((binding) => [matchKey(binding.tournamentId, binding.sourceName), binding.teamId]));
  const resolveTeam = (tournamentId, name) => isPlaceholder(name) ? null : teams.get(bindings.get(matchKey(tournamentId, name))) || null;
  const matches = new Map();
  for (const match of flattenMatches(tournaments)) {
    const key = matchKey(match.tournamentId, match.id);
    if (!match.id || matches.has(key)) throw new Error(`Duplicate or missing match ID: ${key}`);
    const record = { ...match, key, team1Id: resolveTeam(match.tournamentId, match.team1)?.id || null, team2Id: resolveTeam(match.tournamentId, match.team2)?.id || null, result: normalizeResult(match, match.discipline) };
    matches.set(key, record);
    for (const id of new Set([record.team1Id, record.team2Id].filter(Boolean))) teams.get(id).matches.push(record);
  }
  for (const binding of registry.bindings) {
    const team = teams.get(binding.teamId), tournament = tournaments.find((t) => t.id === binding.tournamentId);
    if (!team || !tournament || team.entries.some((entry) => entry.tournament.id === tournament.id)) continue;
    const names = registry.bindings.filter((b) => b.teamId === team.id && b.tournamentId === tournament.id).map((b) => b.sourceName);
    const placement = tournament.results?.placements?.find((p) => names.includes(p.team))?.position || null;
    team.entries.push({ tournament, names, placement });
  }
  return { teams, matches, resolveTeam, getTeam, teamAliases };
}

export function teamSummary(team) {
  const totals = { wins: 0, losses: 0, draws: 0, technical: 0 };
  const opponents = new Map();
  for (const match of team.matches) {
    const result = match.result;
    if (!result.confirmed || !result.known || !result.score) continue;
    const side = match.team1Id === team.id ? 1 : 2;
    const opponentId = side === 1 ? match.team2Id : match.team1Id;
    const field = result.technical ? 'technical' : result.draw ? 'draws' : result.winnerSide === side ? 'wins' : 'losses';
    totals[field]++;
    if (!opponentId) continue;
    if (!opponents.has(opponentId)) opponents.set(opponentId, { id: opponentId, wins: 0, losses: 0, draws: 0, technical: 0, matches: [] });
    const opponent = opponents.get(opponentId);
    opponent[field]++; opponent.matches.push(match);
  }
  return { ...totals, opponents: [...opponents.values()] };
}

export function upcomingMatches(team, now = Date.now()) {
  const rank = (match) => {
    if (match.status === 'live') return [0, 0];
    if (exactStart(match.scheduledAt)) return [Date.parse(match.scheduledAt) >= now ? 1 : 3, Date.parse(match.scheduledAt)];
    return [2, /^\d{4}-\d{2}-\d{2}$/.test(match.date || '') ? Date.parse(match.date) : Infinity];
  };
  // A partially specified scheduled game remains visible even when it cannot
  // yet become a calendar event. Never infer completion from the clock.
  return team.matches.filter((m) => ['scheduled', 'live'].includes(m.status)).sort((a, b) => {
    const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1];
  });
}
export function matchDateLabel(match) {
  if (exactStart(match.scheduledAt)) return `${new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(new Date(match.scheduledAt))} МСК`;
  const raw = /^\d{4}-\d{2}-\d{2}$/.test(match.date || '') ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${match.date}T12:00:00Z`)) : match.dateDisplay || match.date || 'Дата уточняется';
  const time = match.time && !raw.includes(match.time) ? ` · ${match.time}` : '';
  return `${raw}${time}${/\d{1,2}:\d{2}/.test(raw + time) ? ' · часовой пояс не указан' : ''}`;
}
export function matchConsequence(match, model, tournaments) {
  const tournament = tournaments.find((t) => t.id === match.tournamentId);
  if (match.result.confirmed && tournament?.results?.finalMatchId === match.id) {
    const champion = tournament.results.placements?.find((p) => p.position === 1)?.team;
    if (champion) return `${champion} — победитель турнира`;
  }
  if (match.consequenceText) return match.consequenceText;
  return null;
}

export function validateCommunity(tournaments, registry) {
  const errors = [], ids = new Set(), bindings = new Set();
  const forbidden = /^(email|phone|captain|players|roster|telegramId|steamId|faceitId|applicationId|subscriberId)$/i;
  const checkFields = (value, path) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.test(key)) errors.push(`Personal-data field is forbidden: ${path}.${key}`);
      checkFields(child, `${path}.${key}`);
    }
  };
  checkFields(registry, 'registry'); checkFields(tournaments, 'tournaments');
  for (const t of tournaments) if (!/^[a-z0-9-]+$/.test(t.id) || !/^[a-z0-9-]+$/.test(t.slug)) errors.push(`Invalid tournament ID/slug: ${t.id}`);
  for (const team of registry.teams) {
    if (!/^[a-z0-9-]+$/.test(team.id) || ids.has(team.id) || isPlaceholder(team.name) || !team.discipline) errors.push(`Invalid team: ${team.id}`);
    ids.add(team.id);
  }
  const aliasIds = new Set();
  for (const alias of registry.aliases || []) {
    if (!/^[a-z0-9-]+$/.test(alias.id) || ids.has(alias.id) || aliasIds.has(alias.id) || !ids.has(alias.teamId)) errors.push(`Invalid team alias: ${alias.id}`);
    aliasIds.add(alias.id);
  }
  for (const b of registry.bindings) {
    const key = matchKey(b.tournamentId, b.sourceName);
    const tournament = tournaments.find((t) => t.id === b.tournamentId);
    const team = registry.teams.find((t) => t.id === b.teamId);
    if (bindings.has(key) || !tournament || !team || tournament.discipline !== team.discipline || isPlaceholder(b.sourceName)) errors.push(`Invalid binding: ${key}`);
    bindings.add(key);
  }
  const keys = new Set();
  for (const m of flattenMatches(tournaments)) {
    const key = matchKey(m.tournamentId, m.id), result = normalizeResult(m, m.discipline);
    if (!m.id || !/^[a-z0-9-]+$/.test(m.id) || keys.has(key)) errors.push(`Duplicate or invalid match: ${key}`);
    keys.add(key);
    if (m.scheduledAt != null && !exactStart(m.scheduledAt)) errors.push(`Invalid scheduledAt: ${key}`);
    if (!(m.status in matchStates)) errors.push(`Invalid status: ${key}`);
    if (m.resultConfirmed && (!finishedStatuses.has(m.status) || !result.known || !result.score)) errors.push(`Unresolved confirmed score: ${key}`);
    if (result.technical && m.scoreKind !== 'technical') errors.push(`Technical score unit: ${key}`);
    if (m.winner && result.winnerSide && m.winner !== m[`team${result.winnerSide}`]) errors.push(`Winner conflicts with score: ${key}`);
    if (result.confirmed && m.scoreKind === 'rounds' && m.maps?.length && (m.maps.length !== 1 || m.maps[0].score1 !== m.score1 || m.maps[0].score2 !== m.score2)) errors.push(`BO1 round/map conflict: ${key}`);
    if (result.series && m.discipline === 'Counter-Strike 2' && m.scoreKind === 'series' && m.maps?.length) {
      const first = m.maps.filter((map) => pair(map.score1, map.score2) && map.score1 > map.score2).length;
      const second = m.maps.filter((map) => pair(map.score1, map.score2) && map.score2 > map.score1).length;
      if (first > result.series[0] || second > result.series[1] || m.maps.length > result.series[0] + result.series[1]) errors.push(`Map/series conflict: ${key}`);
    }
    if (result.confirmed && result.series && /^BO\d+$/.test(m.bestOf || '')) {
      const maximum = Number(m.bestOf.slice(2)), wins = Math.floor(maximum / 2) + 1;
      if (result.series[0] + result.series[1] > maximum || (maximum % 2 && Math.max(...result.series) !== wins)) errors.push(`Format/series conflict: ${key}`);
    }
  }
  const all = flattenMatches(tournaments);
  const bindingId = (tid, name) => registry.bindings.find((b) => b.tournamentId === tid && b.sourceName === name)?.teamId;
  for (const m of all) {
    const first = bindingId(m.tournamentId, m.team1), second = bindingId(m.tournamentId, m.team2);
    if (first && first === second) errors.push(`Team plays itself: ${m.tournamentId}/${m.id}`);
  }
  for (const m of all) for (const field of ['winnerTo', 'loserTo']) {
    const target = m[field];
    if (target && !keys.has(matchKey(target.tournamentId || m.tournamentId, target.matchId))) errors.push(`Missing ${field}: ${m.id}`);
    const next = target && all.find((n) => n.tournamentId === (target.tournamentId || m.tournamentId) && n.id === target.matchId);
    const result = normalizeResult(m, m.discipline);
    if (next && result.winnerSide) {
      const name = m[`team${field === 'winnerTo' ? result.winnerSide : 3 - result.winnerSide}`];
      const expected = bindingId(m.tournamentId, name);
      const sides = target.slot ? [next[`team${target.slot}`]] : [next.team1, next.team2];
      if (!sides.some((side) => isPlaceholder(side) || (expected ? bindingId(next.tournamentId, side) === expected : side === name))) errors.push(`Participant conflicts with ${field}: ${m.id} -> ${next.id}`);
    }
  }
  for (const tournament of tournaments) {
    const final = flattenMatches([tournament]).find((m) => m.id === tournament.results?.finalMatchId);
    const champion = tournament.results?.placements?.find((p) => p.position === 1)?.team;
    if (final && champion) {
      const result = normalizeResult(final, tournament.discipline);
      if (!result.confirmed || !result.winnerSide || final[`team${result.winnerSide}`] !== champion) errors.push(`Final/placement conflict: ${tournament.id}`);
    }
  }
  return errors;
}
