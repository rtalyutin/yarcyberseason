import { isArchive } from "./tournament.js";
import { normalizeResult } from './community.js';

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

export const isFinishedMatch = (match) => match.resultConfirmed !== false && finishedStatuses.has(match.status);

export function formatMatchday(date, includeYear = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", ...(includeYear ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`)).replace(/\s*г\.$/, "");
}

export function completedDayLabel(count) {
  const noun = count % 10 === 1 && count % 100 !== 11 ? "матч завершён"
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? "матча завершены" : "матчей завершены";
  return `${count} ${noun}`;
}

function stageMatches(stage) {
  if (!stage) return [];
  const rounds = stage.rounds || [{ id: stage.id, label: stage.title, matches: stage.matches || [] }];
  return rounds.flatMap((round) => (round.matches || []).map((match) => ({
    ...match, roundId: round.id, roundTitle: roundTitles[round.id] || round.label || stage.title,
  })));
}

export function getMatchdayModel(tournament) {
  const config = tournament.matchday || {};
  const active = tournament.stages.find((stage) => stage.id === config.nextStageId);
  const previous = tournament.stages.find((stage) => stage.id === config.previousStageId);
  const records = [...stageMatches(active), ...(active === previous ? [] : stageMatches(previous))];
  const matches = [...new Map(records.filter((match) => /^\d{4}-\d{2}-\d{2}$/.test(match.date || "")).map((match) => [match.id, match])).values()]
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestCompletedDate = matches.filter(isFinishedMatch).at(-1)?.date;
  // Completed tournaments retain dated playoff history; live events focus on the latest results and upcoming days.
  const dates = [...new Set(matches.map((match) => match.date))].filter((date) => isArchive(tournament) || !latestCompletedDate || date >= latestCompletedDate);
  const days = dates.map((date) => {
    const dayMatches = matches.filter((match) => match.date === date);
    const completed = dayMatches.filter(isFinishedMatch);
    const scheduled = dayMatches.filter((match) => !isFinishedMatch(match));
    return { date, matches: dayMatches, completed, scheduled,
      label: scheduled.length ? [...new Set(scheduled.map((match) => match.roundTitle))].join(" · ") : completedDayLabel(completed.length) };
  });
  return { matches, days, defaultDate: days.find((day) => day.scheduled.length)?.date || days.at(-1)?.date || null };
}

export function getDisplayedResult(match) {
  if (match.scoreKind) {
    const result = normalizeResult(match, 'Counter-Strike 2');
    const swap = result.winnerSide === 2;
    return {
      first: swap ? match.team2 : match.team1, second: swap ? match.team1 : match.team2,
      score1: result.score ? result.score[swap ? 1 : 0] : null,
      score2: result.score ? result.score[swap ? 0 : 1] : null,
      winner: result.winnerSide ? match[`team${result.winnerSide}`] : null,
      maps: result.maps.filter((m) => m.score).map((m) => ({ name: m.name, score1: m.score[swap ? 1 : 0], score2: m.score[swap ? 0 : 1] })),
    };
  }
  const scored = Number.isFinite(match.score1) && Number.isFinite(match.score2);
  const swap = scored ? match.score2 > match.score1 : match.winner === match.team2;
  return {
    first: swap ? match.team2 : match.team1,
    second: swap ? match.team1 : match.team2,
    score1: scored ? (swap ? match.score2 : match.score1) : null,
    score2: scored ? (swap ? match.score1 : match.score2) : null,
    winner: scored && match.score1 !== match.score2 ? (swap ? match.team2 : match.team1) : match.winner || null,
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
