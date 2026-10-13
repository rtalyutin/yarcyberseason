import { getSwissRecordState, sortSwissRows } from './swiss-presentation.js';

const score = (value) => Number.isSafeInteger(value) && value >= 0;
const confirmed = (match) => match.resultConfirmed === true
  && ['completed', 'walkover'].includes(match.status)
  && score(match.score1) && score(match.score2) && match.score1 !== match.score2;

// Read-only projection. A series (including a technical result) counts once;
// maps, head-to-head and the order of the participant registry are not tiebreaks.
export function getSwissStandings(tournament, stage = tournament.stages?.find((item) => item.type === 'swiss')) {
  if (!stage) return [];
  const draw = new Map();
  for (const match of stage.rounds?.[0]?.matches || []) {
    for (const side of [1, 2]) {
      const seed = match[`seed${side}`];
      if (Number.isSafeInteger(seed) && seed > 0) draw.set(match[`team${side}Id`], seed);
    }
  }
  const rows = (tournament.participants || []).map((participant) => ({
    teamId: participant.teamId, team: participant.displayName,
    played: 0, won: 0, lost: 0, buchholz: 0,
    initialSeed: draw.get(participant.teamId) ?? null, opponents: [],
  }));
  const byId = new Map(rows.map((row) => [row.teamId, row]));
  const seen = new Set();
  for (const match of (stage.rounds || [{ matches: stage.matches }]).flatMap((round) => round.matches || [])) {
    if (!confirmed(match) || seen.has(match.id)) continue;
    const first = byId.get(match.team1Id), second = byId.get(match.team2Id);
    if (!first || !second || first === second) continue;
    seen.add(match.id);
    first.played++; second.played++;
    first.opponents.push(second.teamId); second.opponents.push(first.teamId);
    const [winner, loser] = match.score1 > match.score2 ? [first, second] : [second, first];
    winner.won++; loser.lost++;
  }
  for (const row of rows) {
    row.buchholz = row.opponents.reduce((sum, id) => sum + byId.get(id).won - byId.get(id).lost, 0);
  }
  return sortSwissRows(rows);
}

export const formatBuchholz = (value) => Number.isSafeInteger(value) ? (value > 0 ? `+${value}` : String(value).replace('-', '−')) : '—';

export function getPlayoffSeeding(tournament, stage) {
  const swiss = tournament.stages?.find((item) => item.id === stage.seeding?.sourceStageId);
  const rows = swiss ? getSwissStandings(tournament, swiss) : [];
  const count = stage.seeding?.places || 8;
  const qualifiedCount = rows.filter((row) => row.won === 3 && row.lost < 3).length;
  const complete = rows.length > 0 && qualifiedCount === count
    && rows.every((row) => ['eliminated', 'qualified-3', 'qualified-4', 'qualified-5'].includes(getSwissRecordState(row.won, row.lost).kind))
    && (swiss?.rounds || []).every((round) => (round.matches || []).every(confirmed));
  // Never manufacture a tiebreak from registry/alphabetical order if the draw is missing.
  const seeds = rows.map((row) => row.initialSeed);
  const drawKnown = seeds.every((seed) => Number.isSafeInteger(seed) && seed > 0 && seed <= rows.length)
    && new Set(seeds).size === rows.length;
  const eligible = rows.filter((row) => row.lost < 3 && getSwissRecordState(row.won, row.lost).kind !== 'unknown');
  const entrants = drawKnown ? eligible.slice(0, count).map((row, index) => ({ ...row, seed: index + 1, qualified: row.won === 3 })) : [];
  return { rows, entrants, qualifiedCount, complete, drawKnown, count };
}

// Slot contents are view data only. They never become a scheduled fixture,
// a team history entry, a result, or an organizer assignment.
export function getPlayoffView(tournament, stage) {
  const seeding = getPlayoffSeeding(tournament, stage);
  const matches = (stage.rounds || []).flatMap((round) => round.matches || []);
  const incoming = new Map();
  for (const match of matches) for (const [field, label] of [['winnerTo', 'Победитель'], ['loserTo', 'Проигравший']]) {
    const target = match[field];
    if (!target) continue;
    const slot = { label: `${label} ${match.sourceLabel}`, matchId: match.id };
    // Advance only an actual published pair with a confirmed result, never a
    // hypothetical quarterfinal. Rebuilding this projection drops stale outcomes.
    if (confirmed(match) && match.team1Id && match.team2Id && match.team1 && match.team2) {
      const winner = match.score1 > match.score2 ? 1 : 2;
      const side = field === 'winnerTo' ? winner : 3 - winner;
      Object.assign(slot, { team: match[`team${side}`], teamId: match[`team${side}Id`], advanced: true });
    }
    incoming.set(`${target.matchId}:${target.slot}`, slot);
  }
  return { ...seeding, rounds: (stage.rounds || []).map((round) => ({ ...round, matches: round.matches.map((match) => ({
    ...match,
    slots: [1, 2].map((side) => {
      if (match[`team${side}Id`] && match[`team${side}`]) return { team: match[`team${side}`], teamId: match[`team${side}Id`], published: true, seed: match[`seed${side}`] };
      const seed = match[`seed${side}`];
      if (seed) return { ...seeding.entrants.find((row) => row.seed === seed), seed, label: `Посев ${seed}`, projected: true };
      return incoming.get(`${match.id}:${side}`) || { label: 'Участник уточняется' };
    }),
  })) })) };
}
