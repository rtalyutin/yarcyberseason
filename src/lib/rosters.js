// Explicit public roster snapshots. Registration/contact records remain unsupported.
export function validatePublicRosters(tournaments, registry, archive) {
  const errors = [];
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const fields = (value, allowed, path) => {
    if (!object(value)) { errors.push(`Invalid roster object: ${path}`); return false; }
    for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`Unsupported roster field: ${path}.${key}`);
    return true;
  };
  const text = (value) => typeof value === 'string' && value.trim().length > 0 && value === value.trim();
  if (!fields(archive, ['schemaVersion', 'sources', 'records'], 'rosters')) return errors;
  if (archive.schemaVersion !== 1 || !Array.isArray(archive.sources) || !Array.isArray(archive.records)) return [...errors, 'Invalid roster archive schema'];
  const sources = new Set();
  for (const source of archive.sources) {
    if (!fields(source, ['id', 'url', 'section', 'retrievedAt'], 'source')) continue;
    let validUrl = false;
    try { const url = new URL(source.url); validUrl = url.protocol === 'https:' && !url.username && !url.password; } catch { /* invalid source URL */ }
    const date = typeof source.retrievedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.retrievedAt) && Number.isFinite(Date.parse(source.retrievedAt)) && new Date(source.retrievedAt).toISOString().slice(0, 10) === source.retrievedAt;
    if (!text(source.id) || sources.has(source.id) || !validUrl || !text(source.section) || !date) errors.push(`Invalid roster source: ${source.id}`);
    sources.add(source.id);
  }
  const entries = new Set();
  for (const record of archive.records) {
    if (!fields(record, ['teamId', 'tournamentId', 'sourceId', 'sourceName', 'members'], 'record')) continue;
    const key = `${record.tournamentId}/${record.teamId}`;
    const team = registry.teams.find((item) => item.id === record.teamId);
    const tournament = tournaments.find((item) => item.id === record.tournamentId);
    if (entries.has(key) || !team || !tournament || !team.disciplines.includes(tournament.discipline) || !registry.bindings.some((binding) => binding.teamId === record.teamId && binding.tournamentId === record.tournamentId)) errors.push(`Invalid roster participation: ${key}`);
    entries.add(key);
    if (!sources.has(record.sourceId) || !text(record.sourceName)) errors.push(`Missing roster provenance: ${key}`);
    if (!Array.isArray(record.members) || !record.members.length) { errors.push(`Empty roster: ${key}`); continue; }
    const names = new Set();
    for (const member of record.members) {
      if (!fields(member, ['name', 'role'], `member/${key}`)) continue;
      if (!text(member.name) || !text(member.role) || names.has(member.name)) errors.push(`Invalid roster member: ${key}`);
      names.add(member.name);
    }
  }
  return errors;
}
