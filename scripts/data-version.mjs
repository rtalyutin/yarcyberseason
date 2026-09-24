import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function jsonFiles(root, directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? jsonFiles(root, relative) : entry.isFile() && entry.name.endsWith('.json') ? [relative] : [];
  });
}

export const WEBMCP_DATA_FILES = Object.freeze([
  ...jsonFiles(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'src/data/tournaments'),
  'src/data/tournaments/index.js',
  'src/data/teams.json',
  'src/data/community.js',
  'src/data/rosters.js',
  'src/data/team-rosters.json',
  'src/data/team-rosters-autumn-2026.json',
  'src/lib/community.js',
  'src/lib/webmcp.js',
  'src/lib/public-url.js',
  'src/lib/public-origin.js',
]);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createWebMcpDataVersion(root = projectRoot, read = readFileSync) {
  const hash = createHash('sha256');
  for (const file of [...WEBMCP_DATA_FILES].sort()) {
    hash.update(file).update('\0').update(read(path.join(root, file))).update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}
