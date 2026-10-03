#!/usr/bin/env node
// Offline retrospective verification. Reads captured OpenDota GET responses only.
// It never requests parses, calls S3, or assigns an official historical MVP award.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scoreDotaMap, buildMvpSnapshot, validateMvpSnapshot, topMvpPlayers,
  formatMvpScore } from '../src/lib/dota-mvp.js';

const LEAGUE_ID = 19021;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveId = (value) => /^[1-9]\d*$/.test(String(value));
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
// Node 22+ exposes source text for primitive JSON values in the reviver context.
// Retain the API's decimal spelling of stuns before binary Number conversion.
const readMatch = async (path) => JSON.parse(await readFile(path, 'utf8'), (key, value, context) =>
  key === 'stuns' && typeof value === 'number' && context?.source ? context.source : value);
async function optionalJson(path, fallback) {
  try { return await readJson(path); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
function heroRegistry(input) {
  if (Array.isArray(input)) return Object.fromEntries(input.map((hero) => [hero.id, hero.name]));
  if (!object(input)) throw new Error('Missing fetched hero registry');
  return input;
}
function teamIdentity(map, side, scope, warnings) {
  const id = map[`${side}_team_id`] ?? map[`${side}_team`]?.team_id;
  const name = map[`${side}_name`] ?? map[`${side}_team`]?.name;
  const binding = (scope?.teamBindings || []).find((entry) => String(entry.apiTeamId) === String(id));
  if (binding) return { id: binding.teamId, name: binding.teamName ?? name };
  if (positiveId(id) && typeof name === 'string' && name.trim()) {
    warnings.push(`Match ${map.match_id}: ${side} API team ${id} (${name}) has no archive team binding`);
    return { id: `opendota:${id}`, name };
  }
  return null;
}
function validateScope(scope) {
  if (!object(scope) || typeof scope.tournamentId !== 'string' || !scope.tournamentId.trim() ||
    scope.leagueId !== LEAGUE_ID || !Array.isArray(scope.matchIds) || !scope.matchIds.length ||
    scope.matchIds.some((id) => !positiveId(id)) || new Set(scope.matchIds.map(String)).size !== scope.matchIds.length ||
    (scope.teamBindings !== undefined && !Array.isArray(scope.teamBindings)) ||
    (scope.mapBindings !== undefined && !object(scope.mapBindings))) throw new Error('Invalid historical tournament scope');
  return scope;
}
export async function collectHistoricalMvp({ inputDir, scope = null, scopePath,
  heroNames, rosterIdentities = [], updatedAt = new Date().toISOString() } = {}) {
  if (!inputDir) throw new Error('Historical response directory is required');
  inputDir = resolve(inputDir);
  if (scopePath) scope = await readJson(resolve(scopePath));
  if (scope) validateScope(scope);
  const registry = heroRegistry(heroNames ?? await readJson(join(inputDir, 'heroes.json')));
  const playerNicknames = await optionalJson(join(inputDir, 'account-names.json'), {});
  const allLeagueIds = await optionalJson(join(inputDir, 'matchIds.json'),
    (await readdir(join(inputDir, 'matches'))).filter((name) => /^\d+\.json$/.test(name)).map((name) => name.slice(0, -5)));
  if (!Array.isArray(allLeagueIds) || allLeagueIds.some((id) => !positiveId(id))) throw new Error('Invalid captured league match ID list');
  const ids = scope ? scope.matchIds.map(String) : [...new Set(allLeagueIds.map(String))];
  const warnings = [], issues = [], records = [];
  const sources = [];
  for (const id of ids) {
    let map;
    try {
      map = await readMatch(join(inputDir, 'matches', `${id}.json`));
    } catch (error) {
      const reason = `Captured match response unavailable: ${error.code ?? error.message}`;
      records.push({ matchId: id, fixtureId: null, status: 'pending', reason, players: [] });
      issues.push({ matchId: id, status: 'pending', reason });
      continue;
    }
    let qualificationIssue = null;
    if (String(map.match_id) !== id || Number(map.leagueid) !== LEAGUE_ID) qualificationIssue = 'Captured map ID or league does not match selected scope';
    else if (![1, 2].includes(map.game_mode) || map.lobby_type !== 1) qualificationIssue = 'Unsupported competitive lobby/mode; tournament association needs review';
    const mapBinding = scope?.mapBindings?.[id];
    const sideTeamIds = mapBinding ? { radiant: mapBinding.radiant, dire: mapBinding.dire }
      : { radiant: teamIdentity(map, 'radiant', scope, warnings), dire: teamIdentity(map, 'dire', scope, warnings) };
    const record = qualificationIssue
      ? { matchId: id, fixtureId: mapBinding?.fixtureId ?? null, status: 'pending', reason: qualificationIssue, players: [] }
      : scoreDotaMap(map, { heroNames: registry, rosterIdentities, playerNicknames,
        fixtureId: mapBinding?.fixtureId ?? null, sideTeamIds,
        excludedReason: scope?.excludedMaps?.[id] });
    records.push(record);
    sources.push({ matchId: id, url: `https://api.opendota.com/api/matches/${id}`,
      startTime: map.start_time ?? null, parsedVersion: map.version ?? null });
    if (record.status !== 'ready') issues.push({ matchId: id, status: record.status, reason: record.reason });
  }
  const tournamentId = scope?.tournamentId ?? 'league-19021-diagnostics';
  const snapshot = buildMvpSnapshot(records, { tournamentId, leagueId: LEAGUE_ID, updatedAt });
  validateMvpSnapshot(snapshot, { id: tournamentId, leagueId: LEAGUE_ID });
  const ready = records.filter((entry) => entry.status === 'ready').length;
  const pending = records.filter((entry) => entry.status === 'pending').length;
  const excluded = records.filter((entry) => entry.status === 'excluded').length;
  const association = !scope ? 'UNSPECIFIED' : scope.provisional ? 'PROVISIONAL' : 'EXPLICIT_SCOPE';
  // Full score coverage is separate from proof that the chosen league subset is a tournament.
  const coverageComplete = pending === 0 && ready + excluded === ids.length;
  Object.assign(snapshot, { retrospective: true, coverageComplete, tournamentAssociation: association,
    sourceNote: scope?.sourceNote ?? 'Unscoped retrospective league aggregate; this is not a tournament MVP.',
    officialWinner: null });
  const top = topMvpPlayers(snapshot.players);
  const leaders = topMvpPlayers(snapshot.players, 1);
  const report = {
    schemaVersion: 1, tournamentId, leagueId: LEAGUE_ID, retrospective: true,
    officialWinner: null, tournamentAssociation: association,
    status: !scope ? 'BLOCKED_TOURNAMENT_SCOPE' : !coverageComplete ? 'PARTIAL_DATA' : association === 'PROVISIONAL' ? 'PROVISIONAL_SCOPE' : 'CALCULATED',
    scope: { selectedMaps: ids.length, capturedLeagueMaps: allLeagueIds.length,
      matchIds: ids, sourceNote: snapshot.sourceNote },
    coverage: { ready, pending, excluded, coverageComplete },
    leaderAccountIds: leaders.map((entry) => entry.accountId),
    exactTopTie: leaders.length > 1,
    awardUnresolved: !coverageComplete || association !== 'EXPLICIT_SCOPE' || leaders.length !== 1,
    top20: top.map((entry) => ({ rank: entry.rank, accountId: entry.accountId, nickname: entry.nickname,
      teamNames: entry.teamNames, countedMaps: entry.countedMaps, playedMaps: entry.playedMaps,
      ratingExact: entry.ratingExact, ratingDisplay: formatMvpScore(entry.ratingExact) })),
    issues, warnings: [...new Set(warnings)], sources,
  };
  return { report, snapshot };
}
async function cli() {
  const args = process.argv.slice(2), options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (['--input', '--scope', '--output', '--heroes'].includes(key)) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing ${key} value`);
      options[key.slice(2)] = args[++index];
    } else if (!key.startsWith('--') && !options.input) options.input = key;
    else throw new Error(`Unknown argument: ${key}`);
  }
  const result = await collectHistoricalMvp({ inputDir: options.input, scopePath: options.scope,
    heroNames: options.heroes ? await readJson(resolve(options.heroes)) : undefined });
  if (options.output) {
    const directory = resolve(options.output);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'report.json'), JSON.stringify(result.report, null, 2) + '\n');
    await writeFile(join(directory, 'snapshot.json'), JSON.stringify(result.snapshot, null, 2) + '\n');
    console.log(JSON.stringify({ status: result.report.status, coverage: result.report.coverage,
      players: result.snapshot.players.length, issues: result.report.issues, output: directory }, null, 2));
  } else console.log(JSON.stringify(result.report, null, 2));
  if (result.report.status === 'BLOCKED_TOURNAMENT_SCOPE' || result.report.status === 'PARTIAL_DATA') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
