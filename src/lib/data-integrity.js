import { isPlaceholder, safeHttps, matchKey, matchStates, exactStart } from './community.js';

// Includes unpublished slots: hiding a record must not bypass integrity checks.
export const declaredMatches = (tournament) => (tournament.stages || []).flatMap((stage) => [
  ...(stage.matches || []), ...(stage.rounds || []).flatMap((round) => round.matches || []),
]);

export function validateDataIntegrity(tournaments, registry, rosters, provenance) {
  const errors = [];
  const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  const fields = (obj, allowed, path) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { errors.push(`Invalid object: ${path}`); return false; }
    for (const key of Object.keys(obj)) if (!allowed.includes(key)) errors.push(`Unsupported field: ${path}.${key}`);
    return true;
  };
  const unique = (values, label) => {
    if (new Set(values).size !== values.length) errors.push(`Duplicate ${label}`);
  };
  unique(tournaments.map((t) => t.id), 'tournament ID');
  unique(tournaments.map((t) => t.slug), 'tournament slug');
  const teams = new Map(registry.teams.map((team) => [team.id, team]));
  const binding = new Map(registry.bindings.map((b) => [matchKey(b.tournamentId, b.sourceName), b.teamId]));
  const mapIds = new Set(), externalIds = new Set();
  for (const t of tournaments) {
    if (t.rosterCollection) {
      const c = t.rosterCollection;
      if (!fields(c, ['expectedBy', 'status', 'source'], `${t.id}/rosterCollection`) || !date(c.expectedBy) || !['awaiting', 'collecting', 'received'].includes(c.status) || typeof c.source !== 'string' || !/^organizer-confirmation-\d{4}-\d{2}-\d{2}$/.test(c.source) || !date(c.source.slice(-10))) errors.push(`Invalid roster collection: ${t.id}`);
      if (c.status === 'received' && (t.participants || []).some((p) => !rosters.records.some((r) => r.tournamentId === t.id && r.teamId === p.teamId))) errors.push(`Incomplete roster collection: ${t.id}`);
    }
    const all = declaredMatches(t), matches = new Map(all.map((m) => [m.id, m]));
    unique(all.map((m) => m.id), `match ID in ${t.id}`);
    const resolve = (name) => binding.get(matchKey(t.id, name));
    const checkTeam = (name, id, path) => {
      if (isPlaceholder(name)) {
        if (id != null) errors.push(`Placeholder has team ID: ${path}`);
      } else if (!resolve(name) || id !== resolve(name) || !teams.has(id)) errors.push(`Unresolved team reference: ${path}`);
    };
    for (const m of all) {
      const key = matchKey(t.id, m.id);
      for (const side of [1, 2]) checkTeam(m[`team${side}`], m[`team${side}Id`], `${key}/${side}`);
      if ((m.team1 || m.team2) && !(m.status in matchStates)) errors.push(`Invalid match status: ${key}`);
      if (m.scheduledAt != null && !exactStart(m.scheduledAt)) errors.push(`Invalid schedule: ${key}`);
      if (m.team1Id && m.team1Id === m.team2Id) errors.push(`Team plays itself: ${key}`);
      if (m.resultConfirmed != null && typeof m.resultConfirmed !== 'boolean') errors.push(`Invalid confirmation: ${key}`);
      if (['scheduled', 'postponed', 'cancelled'].includes(m.status) && (m.score1 != null || m.score2 != null || m.resultConfirmed === true)) errors.push(`Unplayed match has result: ${key}`);
      if (m.provenance && (!fields(m.provenance, ['sourceUrl', 'status', 'observedAt'], key) || !safeHttps(m.provenance.sourceUrl) || !date(m.provenance.observedAt) || !['recorded', 'confirmed', 'disputed'].includes(m.provenance.status))) errors.push(`Invalid result provenance: ${key}`);
      if (m.scoreKind === 'rounds' && !m.maps?.length && !m.mapId) errors.push(`Missing BO1 map ID: ${key}`);
      if (m.mapId && m.maps?.length) errors.push(`Duplicate map representation: ${key}`);
      for (const map of [...(m.maps || []), ...(m.mapLinks || []), ...(m.mapId ? [{ id: m.mapId }] : [])]) {
        if (typeof map.id !== 'string' || !/^[a-z0-9-]+$/.test(map.id) || mapIds.has(`${t.id}/${map.id}`)) errors.push(`Duplicate or missing map ID: ${key}`);
        mapIds.add(`${t.id}/${map.id}`);
      }
      for (const map of m.maps || []) {
        if (![map.score1, map.score2].every((v) => Number.isInteger(v) && v >= 0)) errors.push(`Invalid map score: ${key}/${map.id}`);
      }
      for (const link of m.mapLinks || []) {
        const external = `${t.discipline}/${link.matchId}`;
        if (typeof link.matchId !== 'string' || !/^\d+$/.test(link.matchId) || externalIds.has(external) || !safeHttps(link.url)) errors.push(`Invalid or repeated external map: ${key}`);
        externalIds.add(external);
      }
      for (const field of ['winnerTo', 'loserTo']) if (m[field]) {
        const target = m[field];
        if (target.slot != null && ![1, 2].includes(target.slot)) errors.push(`Invalid bracket slot: ${key}/${field}`);
        const targetTournament = tournaments.find((item) => item.id === (target.tournamentId || t.id));
        if (!targetTournament || !declaredMatches(targetTournament).some((item) => item.id === target.matchId)) errors.push(`Missing bracket reference: ${key}/${field}`);
      }
    }
    if (t.results?.finalMatchId && !matches.has(t.results.finalMatchId)) errors.push(`Missing final: ${t.id}`);
    for (const placement of t.results?.placements || []) if (!resolve(placement.team)) errors.push(`Unknown placement team: ${t.id}/${placement.team}`);
    for (const s of t.stages || []) for (const group of s.groups || []) for (const row of group.rows || []) {
      if (row.team && !isPlaceholder(row.team) && !resolve(row.team)) errors.push(`Unknown standings team: ${t.id}/${row.team}`);
    }
  }
  const graph = new Map(tournaments.flatMap((t) => declaredMatches(t).map((m) => [matchKey(t.id, m.id), { ...m, tournamentId: t.id }])));
  const active = new Set(), complete = new Set();
  const visit = (key) => {
    if (active.has(key)) { errors.push(`Bracket cycle: ${key}`); return; }
    if (complete.has(key)) return;
    active.add(key);
    const m = graph.get(key);
    for (const field of ['winnerTo', 'loserTo']) if (m?.[field]) visit(matchKey(m[field].tournamentId || m.tournamentId, m[field].matchId));
    active.delete(key); complete.add(key);
  };
  for (const key of graph.keys()) visit(key);
  // Exact repeated public names are review candidates, not proof of a shared identity.
  // Cross-team player conflicts require a verified public player ID, not fuzzy matching.
  if (!provenance || provenance.schemaVersion !== 1 || !Array.isArray(provenance.files)) return [...errors, 'Missing data source manifest'];
  fields(provenance, ['schemaVersion', 'repository', 'files', 'confirmationPolicy'], 'data-sources');
  unique(provenance.files.map((f) => f.path), 'source path');
  for (const file of provenance.files) {
    if (!fields(file, ['path', 'sourceUrl', 'status', 'observedAt'], 'data-source') || !/^src\/data\/(?:tournaments\/)?[a-z0-9-]+\.json$/.test(file.path) || !safeHttps(file.sourceUrl) || !['recorded', 'confirmed', 'disputed'].includes(file.status) || !date(file.observedAt)) errors.push(`Invalid data provenance: ${file.path}`);
  }
  for (const path of ['src/data/teams.json', 'src/data/team-rosters.json']) if (!provenance.files.some((f) => f.path === path)) errors.push(`Missing source: ${path}`);
  return errors;
}

const canonical = (value) => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item;
});

// No silent replacement: corrections need an explicit reviewed edit, retained by git.
export function mergeExactRecords(existing, incoming, keyOf) {
  const merged = new Map();
  for (const record of existing) {
    const key = keyOf(record);
    if (!key || merged.has(key)) throw new Error(`Invalid or duplicate existing ID: ${key}`);
    merged.set(key, structuredClone(record));
  }
  for (const record of incoming) {
    const key = keyOf(record);
    if (!key) throw new Error('Missing import ID');
    if (merged.has(key) && canonical(merged.get(key)) !== canonical(record)) throw new Error(`Import conflict: ${key}`);
    if (!merged.has(key)) merged.set(key, structuredClone(record));
  }
  return [...merged.values()];
}
