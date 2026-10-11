import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmedPartners, getConfirmedPartners, getTournamentPartners, getOfficialSupport, getMatchPartners, projectContent, projectLegal } from '../src/data/project-content.js';
import currentDota from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };

test('confirmed partner registry separates tournament support from match assignments', () => {
  assert.equal(confirmedPartners.length, 18);
  assert.equal(new Set(confirmedPartners.map((partner) => partner.id)).size, 18);
  assert.deepEqual(getTournamentPartners(currentDota).map((p) => p.name), ['Додо Пицца', 'Торрефакто', 'Redragon']);
  assert.deepEqual(getOfficialSupport(currentDota).map((p) => p.id), ['minsport-yao', 'fks-yao']);
  assert.equal(getConfirmedPartners(currentDota).filter((p) => p.scope === 'unassigned').length, 8);
  assert.equal(getConfirmedPartners('cs2-august-2026').length, 0);
  assert.deepEqual(projectContent.partners, getTournamentPartners(currentDota));
});

test('opening partners belong only to the assigned match and tournament', () => {
  assert.deepEqual(getMatchPartners(currentDota, 'dota-autumn-swiss-r1-04').map((p) => p.name), ['Small Choice', 'Искусство Ритма']);
  assert.deepEqual(getMatchPartners(currentDota, 'dota-autumn-swiss-r1-01'), []);
  const copiedTournament = { ...currentDota, id: 'another-tournament' };
  assert.deepEqual(getMatchPartners(copiedTournament, 'dota-autumn-swiss-r1-04'), []);
  const hidden = structuredClone(currentDota);
  for (const stage of hidden.stages) for (const round of stage.rounds || []) for (const match of round.matches || []) if (match.id === 'dota-autumn-swiss-r1-04') match.published = false;
  assert.deepEqual(getMatchPartners(hidden, 'dota-autumn-swiss-r1-04'), []);
});

test('final agreement becomes a match assignment only for the published actual final', () => {
  assert.deepEqual(getMatchPartners(currentDota, 'final-1'), []);
  const tournament = { id: currentDota.id, stages: [{ rounds: [{ matches: [{ id: 'final-1', team1: 'Aegis Guardians', team2: 'WayProd.' }, { id: 'semifinal-1', team1: 'Aegis Guardians', team2: 'WayProd.' }] }] }] };
  assert.equal(getMatchPartners(tournament, 'final-1').length, 3);
  assert.deepEqual(getMatchPartners(tournament, 'semifinal-1'), []);
  for (const team of [undefined, 'TBD', 'Победитель полуфинала', 'Без соперника']) {
    tournament.stages[0].rounds[0].matches[0].team2 = team;
    assert.deepEqual(getMatchPartners(tournament, 'final-1'), []);
  }
  tournament.stages[0].rounds[0].matches[0] = { id: 'final-1', team1: 'Aegis Guardians', team2: 'WayProd.', published: false };
  assert.deepEqual(getMatchPartners(tournament, 'final-1'), []);
});

test('public partner projection uses existing logo assets and no private prize logistics', () => {
  assert.deepEqual(confirmedPartners.filter((p) => p.logoUrl).map((p) => p.id).sort(), ['dodo-pizza', 'fks-yao', 'minsport-yao']);
  for (const partner of confirmedPartners) {
    if (partner.url) assert.equal(new URL(partner.url).protocol, 'https:');
    assert.ok(!['contact', 'contactEmail', 'phone', 'delivery', 'prizeQuantity', 'prizeModel'].some((field) => field in partner));
  }
  assert.equal(projectLegal.companyName, 'ООО «ЯрКиберСезон»');
  assert.equal(projectLegal.identifiers, 'ИНН 7606143578 · ОГРН 1257600007500');
});
