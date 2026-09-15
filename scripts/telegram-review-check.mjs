// Step 5 review evidence only. Does not implement the step 6 version manifest.
// Run after npm run build. No server, deployment, bot calls or file writes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { loadMiniAppModel } from '../src/telegram/data/load.js';
import { MINI_APP_CONFIG } from '../src/telegram/config.js';
import { THEMES, LANGUAGES } from '../src/telegram/preferences.js';

const sourceCommit = 'a60052e131cb8fb770a51e3c4a8260cf957dc22c';
const sourcePaths = ['src', 'public', 'index.html', 'package.json', 'package-lock.json',
  'vite.config.mjs', 'worker', '.openai/hosting.json', 'scripts/community-build.mjs',
  'scripts/prepare-sites-build.mjs'];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('diff', sourceCommit, '--', ...sourcePaths), '', 'Review source differs from pinned step 4 build');
assert.equal(git('ls-files', '--others', '--exclude-standard', '--', ...sourcePaths), '', 'Untracked application source needs review');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const expected = {
  'assets/entry-C7_1bOwf.js': 'a184333d3f2b694b56085c6eee832caacda657c2d214ef0ae87d561a37fd5de4',
  'assets/entry-xXhKGvy7.css': 'f4e92b5bf181e1db60484e3656f3c53a72dccf939728a64b9559a1616c3e4484',
};
for (const [path, digest] of Object.entries(expected)) {
  assert.equal(hash(await readFile(`dist/client/${path}`)), digest, `Wrong review bundle: ${path}`);
}
const hosting = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
assert.deepEqual(JSON.parse(await readFile('dist/.openai/hosting.json', 'utf8')), hosting);
assert.equal(hosting.project_id, 'appgprj_6a8b38b48cec819184375be4f3b5495a');
assert.deepEqual(THEMES.map(({ id }) => id), ['rift']);
assert.deepEqual(LANGUAGES.map(({ id }) => id), ['ru']);
const model = loadMiniAppModel();
assert.equal(MINI_APP_CONFIG.tournamentSlug, 'dota2-autumn-2026');
assert.equal(model.participants.length, 16);
assert.equal(new Set(model.participants.map(({ teamId }) => teamId)).size, 16);
assert.equal(model.registration.status, 'closed');
assert.equal(model.matches.length, 0);

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(`${directory}/${entry.name}`, `${relative}/`));
    else if (entry.isFile()) result.push({ path: relative, sha256: hash(await readFile(`${directory}/${entry.name}`)) });
    else throw new Error(`Unsupported build entry: ${relative}`);
  }
  return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const inventory = await files('dist');
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), sourceCommit, journalCommit: git('rev-parse', 'HEAD'),
  runtime: process.version, platform: process.platform,
  sourceMatchesPin: true, bundleHashes: expected,
  distFileCount: inventory.length, distInventorySha256: hash(JSON.stringify(inventory)),
  projectId: hosting.project_id, tournamentSlug: MINI_APP_CONFIG.tournamentSlug,
  dates: model.tournament.dates, registration: model.registration.status,
  participants: model.participants.map(({ teamId, displayName }) => ({ teamId, displayName })),
  publishedMatches: model.matches.length, themes: ['rift'], languages: ['ru'],
  preparationCheck: 'PASS', jointAcceptance: 'NOT_EXECUTED',
  realTelegram: 'NOT_EXECUTED', deployment: 'NOT_STARTED',
}, null, 2));
