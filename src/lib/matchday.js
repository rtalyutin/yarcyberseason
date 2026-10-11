import { isArchive } from "./tournament.js";
import { normalizeResult } from './community.js';
import { getHomeBroadcastBoard } from './home-board.js';

const finishedStatuses = new Set(["completed", "walkover", "bye"]);

const roundTitles = {
  "upper-quarterfinals": "Четвертьфинал верхней сетки",
  "upper-semifinals": "Полуфинал верхней сетки",
  "upper-final": "Финал верхней сетки",
  "lower-round-1": "Первый раунд нижней сетки",
  "lower-round-2": "Четвертьфинал нижней сетки",
  "lower-round-3": "Полуфинал нижней сетки",
  "lower-final": "Финал нижней сетки",
  "grand-final": "Гранд-финал",
};

const isDota = (discipline) => /dota/i.test(discipline || '');
const isIsoDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
export const isFinishedMatch = (match, discipline = match?.discipline) => finishedStatuses.has(match.status) &&
  (isDota(discipline) ? match.resultConfirmed === true : match.resultConfirmed !== false);

export function formatMatchday(date, includeYear = false) {
  if (!isIsoDate(date)) return date && date !== 'undated' ? date : 'Дата уточняется';
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", ...(includeYear ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`)).replace(/\s*г\.$/, "");
}

export function completedDayLabel(count) {
  const noun = count % 10 === 1 && count % 100 !== 11 ? "матч завершён"
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? "матча завершены" : "матчей завершены";
  return `${count} ${noun}`;
}

function stageMatches(stage, discipline) {
  if (!stage) return [];
  const rounds = [...(stage.rounds || []), ...(stage.matches ? [{ id: stage.id, label: stage.title, matches: stage.matches }] : []),
    ...(stage.groups || []).filter((group) => group.matches)];
  return rounds.flatMap((round) => (round.matches || []).map((match) => ({
    ...match, discipline, stageId: stage.id, roundId: round.id, roundTitle: roundTitles[round.id] || round.label || stage.title,
  })));
}

export function getMatchdayModel(tournament) {
  const config = tournament.matchday || {};
  const stages = tournament.stages || [];
  const broadcast = getHomeBroadcastBoard(tournament).match;
  const selectedStages = config.nextStageId || config.previousStageId ? stages.filter((stage) =>
    [config.nextStageId, config.previousStageId].includes(stage.id) || stageMatches(stage).some((match) => match.id === broadcast?.id)) : stages;
  const records = selectedStages.flatMap((stage) => stageMatches(stage, tournament.discipline));
  const matches = [...new Map(records.filter((match) => match.published !== false && match.status).map((match) => [match.id, match])).values()]
    .sort((a, b) => (isIsoDate(a.date) ? a.date : '9999').localeCompare(isIsoDate(b.date) ? b.date : '9999') || (a.time || '').localeCompare(b.time || ''));
  const latestCompletedDate = matches.filter((match) => isIsoDate(match.date) && isFinishedMatch(match)).at(-1)?.date;
  // Completed tournaments retain dated playoff history; live events focus on the latest results and upcoming days.
  const dates = [...new Set(matches.map((match) => isIsoDate(match.date) ? match.date : 'undated'))].filter((date) =>
    date === 'undated' || isArchive(tournament) || isDota(tournament.discipline) || !latestCompletedDate || date >= latestCompletedDate || date === broadcast?.date);
  const days = dates.map((date) => {
    const dayMatches = matches.filter((match) => (isIsoDate(match.date) ? match.date : 'undated') === date);
    const completed = dayMatches.filter((match) => isFinishedMatch(match));
    const scheduled = dayMatches.filter((match) => !isFinishedMatch(match));
    const partialDates = [...new Set(dayMatches.map((match) => match.dateDisplay || match.date || null))];
    const dateLabel = date === 'undated' ? (partialDates.length === 1 && partialDates[0] ? partialDates[0] : 'Дата уточняется') : formatMatchday(date);
    return { date, dateLabel, matches: dayMatches, completed, scheduled,
      label: scheduled.length ? [...new Set(scheduled.map((match) => match.roundTitle))].join(" · ") : completedDayLabel(completed.length) };
  });
  const broadcastDay = broadcast && days.find((day) => day.matches.some((match) => match.id === broadcast.id));
  return { matches, days, defaultDate: broadcastDay?.date || days.find((day) => day.scheduled.length)?.date || days.at(-1)?.date || null };
}

export function getPreviousMatchday(model, selectedDate) {
  if (!isIsoDate(selectedDate)) return null;
  const completed = model.matches.filter((match) => isIsoDate(match.date) && match.date < selectedDate && isFinishedMatch(match));
  const date = completed.at(-1)?.date;
  return date ? { date, completed: completed.filter((match) => match.date === date) } : null;
}

export function getDisplayedResult(match, { winnerFirst = true, discipline = match.discipline || 'Counter-Strike 2' } = {}) {
  if (isDota(discipline) && !isFinishedMatch(match, discipline)) {
    return { first: match.team1, second: match.team2, score1: null, score2: null, winner: null, maps: [] };
  }
  if (match.scoreKind) {
    const result = normalizeResult(match, discipline);
    const swap = winnerFirst && result.winnerSide === 2;
    return {
      first: swap ? match.team2 : match.team1, second: swap ? match.team1 : match.team2,
      score1: result.score ? result.score[swap ? 1 : 0] : null,
      score2: result.score ? result.score[swap ? 0 : 1] : null,
      winner: result.winnerSide ? match[`team${result.winnerSide}`] : null,
      maps: result.maps.filter((m) => m.score).map((m) => ({ name: m.name, score1: m.score[swap ? 1 : 0], score2: m.score[swap ? 0 : 1] })),
    };
  }
  const scored = Number.isFinite(match.score1) && Number.isFinite(match.score2);
  const swap = winnerFirst && (scored ? match.score2 > match.score1 : match.winner === match.team2);
  return {
    first: swap ? match.team2 : match.team1,
    second: swap ? match.team1 : match.team2,
    score1: scored ? (swap ? match.score2 : match.score1) : null,
    score2: scored ? (swap ? match.score1 : match.score2) : null,
    winner: scored && match.score1 !== match.score2 ? (match.score1 > match.score2 ? match.team1 : match.team2) : match.winner || null,
    maps: (match.maps || []).filter((map) => Number.isFinite(map.score1) && Number.isFinite(map.score2)).map((map) => ({
      ...map, score1: swap ? map.score2 : map.score1, score2: swap ? map.score1 : map.score2,
    })),
  };
}

export function getMatchConsequence(match, matches) {
  if (isFinishedMatch(match)) {
    const winner = getDisplayedResult(match).winner;
    if (!winner) return null;
    if (["upper-final", "lower-final"].includes(match.roundId)) return `${winner} — в гранд-финале`;
    if (match.roundId === "lower-round-3") return `${winner} — в финале нижней сетки`;
    if (match.roundId === "grand-final") return `${winner} — победитель турнира`;
    return null;
  }
  if (match.roundId === "lower-final") {
    const final = matches.find((candidate) => candidate.roundId === "grand-final");
    const opponent = [final?.team1, final?.team2].find((team) => team && !/^(Победитель|Проигравший|Ожидает)/i.test(team));
    if (final && opponent) return `Победитель сыграет с ${opponent} в гранд-финале ${formatMatchday(final.date)}.`;
  }
  return null;
}
