import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDataIntegrity, declaredMatches, mergeExactRecords } from '../src/lib/data-integrity.js';
import { buildCommunityModel } from '../src/lib/community.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const filenames = readdirSync(join(root, 'src/data/tournaments')).filter((f) => f.endsWith('.json'));
const tournaments = filenames.map((f) => read(`src/data/tournaments/${f}`));
const registry = read('src/data/teams.json'), rosters = read('src/data/team-rosters.json'), sources = read('src/data/data-sources.json');
const validate = (ts) => validateDataIntegrity(ts, registry, rosters, sources);

test('all prior sporting values survive; only identity and collection metadata is added', () => {
  const preserve = (before, after, path) => {
    if (Array.isArray(before)) {
      assert.equal(after.length, before.length, path);
      before.forEach((v, i) => preserve(v, after[i], `${path}/${i}`));
    } else if (before && typeof before === 'object') {
      for (const [k, v] of Object.entries(before)) preserve(v, after[k], `${path}/${k}`);
    } else assert.deepEqual(after, before, path);
  };
  for (const f of filenames) {
    const before = JSON.parse(execFileSync('git', ['show', `2800ce2e4aa48642ffe0f86343b2ffb0b160bc40:src/data/tournaments/${f}`], { cwd: root, encoding: 'utf8' }));
    preserve(before, read(`src/data/tournaments/${f}`), f);
  }
  assert.deepEqual(validate(tournaments), []);
});

test('stable team and map links survive reordering; current rosters stay unknown', () => {
  const model = buildCommunityModel(tournaments, registry, rosters);
  const shuffled = structuredClone(tournaments);
  for (const t of shuffled) for (const m of declaredMatches(t)) { m.maps?.reverse(); m.mapLinks?.reverse(); }
  const next = buildCommunityModel(shuffled, registry, rosters);
  assert.deepEqual([...model.maps.keys()].sort(), [...next.maps.keys()].sort());
  for (const [key, map] of model.maps) {
    assert.deepEqual(next.maps.get(key), map);
    assert.ok(model.matches.has(map.seriesKey));
  }
  const autumn = tournaments.find((t) => t.id === 'dota2-autumn-2026');
  for (const p of autumn.participants) {
    const entry = model.getTeam(p.teamId).entries.find((e) => e.tournament.id === autumn.id);
    assert.equal(entry.roster, null); assert.equal(entry.rosterStatus, 'unknown');
  }
  assert.equal(autumn.rosterCollection.expectedBy, '2026-09-21');
  const dispute = model.matches.get('dota2-main-2026/dota-main-group-16');
  assert.equal(dispute.result.confirmed, false); assert.equal(dispute.result.series, null);
});

test('broken identities, maps, unpublished records and results cannot pass validation', () => {
  const mutate = (fn, expected) => {
    const ts = structuredClone(tournaments); fn(ts);
    assert.ok(validate(ts).some((e) => e.includes(expected)), expected);
  };
  const cs = (ts) => ts.find((t) => t.id === 'cs2-august-2026');
  mutate((ts) => ts.push(structuredClone(ts[0])), 'Duplicate tournament ID');
  mutate((ts) => { declaredMatches(cs(ts))[0].team1Id = 'missing'; }, 'Unresolved team');
  mutate((ts) => { const m = declaredMatches(cs(ts))[0]; m.published = false; m.team1Id = 'missing'; }, 'Unresolved team');
  mutate((ts) => { const ms = declaredMatches(cs(ts)).filter((m) => m.maps?.length); ms[1].maps[0].id = ms[0].maps[0].id; }, 'map ID');
  mutate((ts) => { cs(ts).results.finalMatchId = 'missing'; }, 'Missing final');
  mutate((ts) => { const m = declaredMatches(cs(ts))[0]; m.status = 'scheduled'; }, 'Unplayed match');
  mutate((ts) => { const m = declaredMatches(cs(ts))[0]; m.winnerTo = { matchId: m.id }; }, 'Bracket cycle');
  mutate((ts) => { const ms = declaredMatches(ts.find((t) => t.id === 'dota2-main-2026')).filter((m) => m.mapLinks?.length); ms[1].mapLinks[0] = structuredClone(ms[0].mapLinks[0]); }, 'repeated external map');
});

test('repeat import is idempotent and conflicting versions do not replace records', () => {
  const before = [{ id: 'one', value: 5 }];
  assert.deepEqual(mergeExactRecords(before, [{ value: 5, id: 'one' }], (r) => r.id), before);
  assert.throws(() => mergeExactRecords(before, [{ id: 'one', value: 6 }], (r) => r.id), /conflict/);
  assert.deepEqual(before, [{ id: 'one', value: 5 }]);
});

test('verifier regressions: hidden edges, source dates and collection metadata are checked', () => {
  const cases = [
    (ts, p) => { p.files[0].observedAt = '2026-99-99'; },
    (ts, p) => { p.files[0].email = 'private@example.test'; },
    (ts) => { ts.find((t) => t.id === 'dota2-autumn-2026').rosterCollection = { expectedBy: '2026-99-99', status: 'confirmed', source: 'missing' }; },
    (ts) => { const a = declaredMatches(ts[0])[0], b = declaredMatches(ts[1])[0]; a.published = b.published = false; a.winnerTo = { tournamentId: ts[1].id, matchId: b.id }; b.winnerTo = { tournamentId: ts[0].id, matchId: a.id }; },
    (ts) => { const m = declaredMatches(ts[0])[0]; m.published = false; m.status = 'garbage'; },
    (ts) => { const ms = declaredMatches(ts[0]); ms[0].published = false; ms[0].winnerTo = { matchId: ms[1].id, slot: 99 }; },
  ];
  for (const mutate of cases) {
    const ts = structuredClone(tournaments), p = structuredClone(sources); mutate(ts, p);
    assert.ok(validateDataIntegrity(ts, registry, rosters, p).length > 0);
  }
});

test('CLI validates before writing, imports once, and rejects private data and conflicts atomically', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ycs-import-'));
  try {
    cpSync(join(root, 'src/data'), join(dir, 'src/data'), { recursive: true });
    cpSync(join(root, 'src/lib'), join(dir, 'src/lib'), { recursive: true });
    mkdirSync(join(dir, 'scripts'));
    cpSync(join(root, 'scripts/import-public-rosters.mjs'), join(dir, 'scripts/import-public-rosters.mjs'));
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    const target = join(dir, 'src/data/team-rosters.json'), input = join(dir, 'input.json');
    const payload = { schemaVersion: 1, sources: [rosters.sources[0]], records: [{ teamId: 'dota2-autumn-2026-vnext', tournamentId: 'dota2-autumn-2026', sourceId: rosters.sources[0].id, sourceName: 'Synthetic test only', members: [{ name: 'Synthetic player', role: 'Test' }] }] };
    const run = (...args) => spawnSync(process.execPath, [join(dir, 'scripts/import-public-rosters.mjs'), input, ...args], { encoding: 'utf8' });
    writeFileSync(input, JSON.stringify(payload));
    const original = readFileSync(target, 'utf8');
    assert.equal(run().status, 0); assert.equal(readFileSync(target, 'utf8'), original);
    assert.equal(run('--write').status, 0);
    const imported = readFileSync(target, 'utf8');
    assert.equal(JSON.parse(imported).records.length, rosters.records.length + 1);
    const again = run('--write'); assert.equal(again.status, 0); assert.equal(JSON.parse(again.stdout).changed, false);
    assert.equal(readFileSync(target, 'utf8'), imported);
    payload.records[0].members[0].name = 'Conflicting version'; writeFileSync(input, JSON.stringify(payload));
    assert.notEqual(run('--write').status, 0); assert.equal(readFileSync(target, 'utf8'), imported);
    payload.records[0].members[0].email = 'private@example.test'; writeFileSync(input, JSON.stringify(payload));
    assert.notEqual(run('--write').status, 0); assert.equal(readFileSync(target, 'utf8'), imported);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
