#!/usr/bin/env node
// Read-only historical evidence: fixed league, GET only, no parse/S3/import write.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const LEAGUE_ID = 19021;
const API = 'https://api.opendota.com/api';
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;

// This checks observed schema, not the correctness of the MVP calculation.
export function inspectMatchShape(match) {
  const missing = [];
  if (Number(match.leagueid) !== LEAGUE_ID) missing.push('leagueid');
  if (!Number.isSafeInteger(match.match_id) || match.match_id <= 0) missing.push('match_id');
  if (!Number.isFinite(match.duration) || match.duration <= 0) missing.push('duration');
  if (typeof match.radiant_win !== 'boolean') missing.push('radiant_win');
  if (!Number.isFinite(match.version) || match.version <= 0) missing.push('parsed version');
  if (!Array.isArray(match.players) || match.players.length !== 10) missing.push('ten players');
  const players = (match.players || []).map((player, index) => {
    const absent = [];
    for (const field of ['kills', 'assists', 'deaths', 'camps_stacked']) {
      if (!own(player, field) || !count(player[field])) absent.push(field);
    }
    for (const field of ['damage_targets', 'damage', 'healing']) {
      if (!own(player, field) || !record(player[field])) absent.push(field);
    }
    if (!own(player, 'stuns') || !Number.isFinite(player.stuns) || player.stuns < 0) absent.push('stuns');
    if (!own(player, 'obs_left_log') || !Array.isArray(player.obs_left_log)) absent.push('obs_left_log');
    if (!Number.isSafeInteger(player.hero_id) || player.hero_id <= 0) absent.push('hero_id');
    if (![0, 1, 2, 3, 4, 128, 129, 130, 131, 132].includes(player.player_slot)) absent.push('player_slot');
    if (absent.length) missing.push(`players[${index}]: ${absent.join(', ')}`);
    return { playerSlot: player.player_slot, accountId: player.account_id ?? null,
      heroId: player.hero_id, missing: absent,
      observerRemovalEvents: player.obs_left_log?.length ?? null };
  });
  if (new Set(players.map((player) => player.playerSlot)).size !== 10) missing.push('unique ten player slots');
  return { matchId: match.match_id, version: match.version ?? null,
    shapeComplete: missing.length === 0, missing, players };
}

export async function runHistoricalProbe({ outputDir = resolve('tmp/dota-mvp-history-19021'),
  fetcher = fetch, pause = (ms) => new Promise((done) => setTimeout(done, ms)),
  signal = AbortSignal.timeout(12 * 60_000) } = {}) {
  await mkdir(join(outputDir, 'matches'), { recursive: true });
  let previous;
  try { previous = JSON.parse(await readFile(join(outputDir, 'status.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = { schemaVersion: 1, leagueId: LEAGUE_ID, status: 'RUNNING',
    startedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || null,
    previousAttempts: previous ? [...(previous.previousAttempts || []),
      { startedAt: previous.startedAt, finishedAt: previous.finishedAt,
        status: previous.status, reason: previous.reason ?? null }] : [],
    readOnly: true, requests: previous?.requests || [], matchIds: [], matches: [], requestFailures: [],
    semanticCorrectness: 'UNVERIFIED' };
  async function atomicSave(filename, contents) {
    await writeFile(join(outputDir, filename + '.tmp'), contents);
    await rename(join(outputDir, filename + '.tmp'), join(outputDir, filename));
  }
  const save = () => atomicSave('status.json', JSON.stringify(report, null, 2) + '\n');
  await save();
  async function get(path, filename) {
    // Resume only previously successful responses; no public API write occurs.
    try { return JSON.parse(await readFile(join(outputDir, filename), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (let attempt = 0; attempt < 3; attempt++) {
      if (report.requests.length) await pause(1100);
      const url = `${API}${path}`;
      const response = await fetcher(url, { method: 'GET', headers: { accept: 'application/json' },
        signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]) });
      const text = await response.text();
      report.requests.push({ url, status: response.status, at: new Date().toISOString(),
        retryAfter: response.headers.get('retry-after') });
      await save();
      if (response.ok) {
        const parsed = JSON.parse(text);
        await atomicSave(filename, text + '\n');
        return parsed;
      }
      if (response.status >= 500 && attempt < 2) { await pause(2000 * (attempt + 1)); continue; }
      throw new Error(`HTTP ${response.status} at ${path}; stopped: ${text.slice(0,300)}`);
    }
  }
  try {
    const ids = await get(`/leagues/${LEAGUE_ID}/matchIds`, 'matchIds.json');
    if (!Array.isArray(ids) || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Invalid league match IDs');
    report.matchIds = [...new Set(ids.map(String))];
    if (!report.matchIds.length) throw new Error('Historical league contains no match IDs');
    for (const [index, id] of report.matchIds.entries()) {
      let match;
      try { match = await get(`/matches/${id}`, `matches/${id}.json`); }
      catch (error) {
        // A failed historical map does not erase collected evidence. Do not
        // fan out after access/rate errors; bounded server failures remain pending.
        if (!/^HTTP 5\d\d /.test(error.message)) throw error;
        report.requestFailures.push({ matchId: id, reason: error.message, retryable: true });
        await save();
        console.warn(`League ${LEAGUE_ID}: match ${id} still unavailable after bounded GET retries`);
        continue;
      }
      if (String(match.match_id) !== id) throw new Error(`Match response ID differs from requested ${id}`);
      const inspected = inspectMatchShape(match);
      report.matches.push(inspected);
      await save();
      console.log(`League ${LEAGUE_ID}: ${index + 1}/${report.matchIds.length}, match ${id}, parsed shape ${inspected.shapeComplete ? 'complete' : 'incomplete'}`);
      // Do not fan out when the first real response lacks required parsed data.
      if (index === 0 && !inspected.shapeComplete) {
        report.status = 'FIRST_MATCH_INCOMPLETE';
        report.reason = inspected.missing.join('; ');
        return report;
      }
    }
    report.status = report.requestFailures.length ? 'PARTIAL_REQUEST_FAILURE'
      : report.matches.every((match) => match.shapeComplete) ? 'PASS' : 'PARTIAL_INCOMPLETE_DATA';
    return report;
  } catch (error) {
    report.status = report.matches.length ? 'PARTIAL_REQUEST_FAILURE' : 'BLOCKED';
    report.reason = error.message;
    return report;
  } finally {
    report.finishedAt = new Date().toISOString();
    await save();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runHistoricalProbe({ outputDir: process.argv[2] ? resolve(process.argv[2]) : undefined });
  console.log(JSON.stringify({ status: result.status, matchIds: result.matchIds.length,
    fetched: result.matches.length, reason: result.reason ?? null }));
  if (result.status !== 'PASS') process.exitCode = 1;
}
