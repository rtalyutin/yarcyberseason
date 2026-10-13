// Presentation only: highlight possible routes without advancing a fixture.
export function getPlayoffRoute(matches, startId, teamId = null) {
  const byId = new Map(matches.map((match) => [match.id, match]));
  const nodes = new Set(), edges = new Set();
  const visit = (id) => {
    const match = byId.get(id);
    if (!match || nodes.has(id)) return;
    let fields = ['winnerTo', 'loserTo'];
    if (teamId && match.team1Id && match.team2Id) {
      const side = match.team1Id === teamId ? 1 : match.team2Id === teamId ? 2 : null;
      if (!side) return;
      const settled = match.resultConfirmed === true && ['completed', 'walkover'].includes(match.status)
        && [match.score1, match.score2].every((score) => Number.isSafeInteger(score) && score >= 0)
        && match.score1 !== match.score2;
      if (settled) fields = [match[`score${side}`] > match[`score${3 - side}`] ? 'winnerTo' : 'loserTo'];
    }
    nodes.add(id);
    for (const field of fields) {
      const target = match[field]?.matchId;
      if (!byId.has(target)) continue;
      const next = byId.get(target);
      if (teamId && next.team1Id && next.team2Id && ![next.team1Id, next.team2Id].includes(teamId)) continue;
      edges.add(`${id}-${field}`);
      visit(target);
    }
  };
  visit(startId);
  return { nodes, edges };
}
