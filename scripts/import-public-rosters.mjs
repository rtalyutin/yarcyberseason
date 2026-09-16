import { readFileSync, readdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicRosters } from '../src/lib/rosters.js';
import { mergeExactRecords } from '../src/lib/data-integrity.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const args = process.argv.slice(2);
if (![1, 2].includes(args.length) || (args.length === 2 && args[1] !== '--write')) throw new Error('Usage: node scripts/import-public-rosters.mjs INPUT.json [--write]. Default: validate only.');
const target = resolve(root, 'src/data/team-rosters.json');
const before = readFileSync(target, 'utf8'), archive = JSON.parse(before), incoming = read(resolve(args[0]));
const tournaments = readdirSync(resolve(root, 'src/data/tournaments')).filter((f) => f.endsWith('.json')).map((f) => read(resolve(root, 'src/data/tournaments', f)));
const registry = read(resolve(root, 'src/data/teams.json'));
// Validate both archives before merging; private/unsupported fields never reach disk.
for (const value of [archive, incoming]) {
  const errors = validatePublicRosters(tournaments, registry, value);
  if (errors.length) throw new Error(errors.join('\n'));
}
const next = {
  schemaVersion: 1,
  sources: mergeExactRecords(archive.sources, incoming.sources, (r) => r.id),
  records: mergeExactRecords(archive.records, incoming.records, (r) => r.teamId && r.tournamentId && `${r.tournamentId}/${r.teamId}`),
};
const errors = validatePublicRosters(tournaments, registry, next);
if (errors.length) throw new Error(errors.join('\n'));
const changed = JSON.stringify(next) !== JSON.stringify(archive);
if (args.includes('--write') && changed) {
  if (readFileSync(target, 'utf8') !== before) throw new Error('Archive changed during import; retry after review.');
  const temp = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', { flag: 'wx' });
    renameSync(temp, target);
  } catch (error) { try { unlinkSync(temp); } catch {} throw error; }
}
console.log(JSON.stringify({ mode: args.includes('--write') ? 'local-write' : 'dry-run', changed, records: next.records.length, added: next.records.length - archive.records.length }));
