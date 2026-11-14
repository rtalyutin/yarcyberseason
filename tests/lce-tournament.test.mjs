import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import baseline from '../src/data/tournaments/cs2-lce-november-2026.json' with { type: 'json' };
import { deriveLce, lceFixtures, validateLceResult } from '../src/lib/lce-tournament.js';
import { createLceResultsService, emptyLce, validateLceDocument } from '../backend/lce-results-service.mjs';
import { createMatchMediaS3Store } from '../backend/match-media-store.mjs';
import { createResultsServer } from '../backend/server.mjs';
const group = lceFixtures(baseline).filter(m => m.id.startsWith('lce-group-'));
const map = (score1 = 13, score2 = 9, technical = false) => ({ score1, score2, technical });
const result = (m, maps = [map()]) => ({ ...validateLceResult(m, { maps }), team1Id: m.team1Id, team2Id: m.team2Id });
function groupDoc(cyclic = false) {
  const d = emptyLce();
  for (const m of group) {
    const a = Number(m.team1Id.at(-1)), b = Number(m.team2Id.at(-1));
    const firstWins = cyclic ? [1, 2].includes((b - a + 5) % 5) : a < b;
    d.matches[m.id] = result(m, [firstWins ? map() : map(9, 13)]);
  }
  return d;
}
function memoryStore() {
  let value = emptyLce(), etag = 0;
  return { read: async () => ({ value: structuredClone(value), etag }), compareAndSet: async (old, next) => {
    if (old.etag !== etag) throw Object.assign(new Error('conflict'), { status: 409 });
    value = structuredClone(next); etag++; return { value: structuredClone(value), etag };
  } };
}
test('screenshot schedule: 13 fixtures, ten unique pairs, four games/team, exact times/channels', () => {
  assert.equal(lceFixtures(baseline).length, 13);
  assert.equal(new Set(group.map(m => [m.team1Id, m.team2Id].sort().join('|'))).size, 10);
  for (const p of baseline.participants) assert.equal(group.filter(m => [m.team1Id, m.team2Id].includes(p.teamId)).length, 4);
  assert.deepEqual(group.map(m => m.time), ['12:00','12:00','13:30','13:30','15:00','15:00','16:30','16:30','18:00','18:00']);
  assert.deepEqual(group.map(m => m.channelNumber), [1,2,1,2,1,2,1,2,1,2]);
});
test('round scores, overtime, sequential BO3/BO5, technical maps and no-show validation', () => {
  assert.equal(validateLceResult(group[0], { maps: [map(16, 14)] }).winnerSide, 1);
  assert.equal(validateLceResult(group[0], { maps: [map(16, 12)] }).winnerSide, 1);
  assert.equal(validateLceResult(group[0], { maps: [map(17, 19)] }).winnerSide, 2);
  for (const scores of [[12,12],[13,12],[14,14],[14,12],[16,15],[17,15],[13,-1]]) assert.throws(() => validateLceResult(group[0], { maps: [map(...scores)] }));
  const sf = { ...group[0], bestOf: 'BO3' };
  assert.deepEqual(validateLceResult(sf, { maps: [map(13,0,true), map()] }).wins, [2,0]);
  assert.throws(() => validateLceResult(sf, { maps: [map(),map(),map()] }));
  assert.throws(() => validateLceResult(sf, { maps: [map()] }));
  assert.throws(() => validateLceResult(sf, { outcome: 'double_no_show', maps: [] }));
  assert.equal(validateLceResult(sf, { outcome: 'series_forfeit', winnerSide: 2, maps: [] }).winnerSide, 2);
  assert.throws(() => validateLceResult(group[0], { maps: [map(13,9,true)] }));
});
test('13:9 earns a point/+4; no-show excludes rounds; group seeding waits for all ten', () => {
  const doc = emptyLce(); doc.matches[group[0].id] = result(group[0]);
  let state = deriveLce(baseline, doc), row = state.tournament.stages[0].groups[0].rows.find(r => r.teamId === group[0].team1Id);
  assert.equal(row.points, 1); assert.equal(row.roundDifference, 4); assert.equal(state.groupReady, false);
  assert.equal(lceFixtures(state.tournament).find(m => m.id === 'lce-sf-1').team1Id, undefined);
  doc.matches[group[0].id] = { ...validateLceResult(group[0], { outcome: 'double_no_show', maps: [] }), team1Id: group[0].team1Id, team2Id: group[0].team2Id };
  row = deriveLce(baseline, doc).tournament.stages[0].groups[0].rows.find(r => r.teamId === group[0].team1Id);
  assert.deepEqual([row.points,row.played,row.roundsFor,row.roundsAgainst], [0,1,0,0]);
});
test('completed group fills semifinals; 2:0 advances; 3:0 crowns champion; upstream correction blocked', () => {
  const doc = groupDoc(); let state = deriveLce(baseline, doc);
  assert.equal(state.groupReady, true);
  for (const id of ['lce-sf-1','lce-sf-2']) {
    const m = lceFixtures(state.tournament).find(m => m.id === id);
    doc.matches[id] = result(m, [map(13,7),map()]); state = deriveLce(baseline,doc);
  }
  const final = lceFixtures(state.tournament).find(m => m.id === 'lce-final');
  assert.ok(final.team1Id && final.team2Id); assert.equal(final.score1, undefined);
  doc.matches[final.id] = result(final,[map(),map(),map()]);
  state = deriveLce(baseline,doc); assert.equal(state.tournament.status,'completed'); assert.equal(state.tournament.results.placements[0].team,final.team1);
  const sf = lceFixtures(state.tournament).find(m => m.id === 'lce-sf-1');
  doc.matches[sf.id] = result(sf,[map(9,13),map(9,13)]);
  assert.throws(() => deriveLce(baseline,doc), /lce-final/);
});
test('equal mini-table produces round-robin tiebreaks, then judge draw, separate from group totals', () => {
  const doc = groupDoc(true); let state = deriveLce(baseline,doc);
  assert.equal(state.groupReady,false);
  const tb = lceFixtures(state.tournament).filter(m => m.id.startsWith('lce-tb-'));
  assert.equal(tb.length,10); assert.ok(tb.every(m => !m.scheduledAt));
  for (const m of tb) {
    const a=Number(m.team1Id.at(-1)),b=Number(m.team2Id.at(-1));
    doc.matches[m.id] = result(m, [[1,2].includes((b-a+5)%5) ? map() : map(9,13)]);
  }
  state=deriveLce(baseline,doc); assert.equal(state.groupReady,false);
  const key=state.unresolved.find(k=>k.includes('|')); assert.ok(key);
  doc.draws[key]=key.split('|').reverse(); state=deriveLce(baseline,doc);
  assert.equal(state.groupReady,true); assert.ok(state.tournament.stages[0].groups[0].rows.every(r=>r.played===4&&r.points===2));
});
test('service retries once, rejects stale revision and preserves state across service restart', async () => {
  const store=memoryStore(),service=createLceResultsService({store});
  const body={action:'result',requestId:'a'.repeat(32),expectedRevision:0,matchId:group[0].id,result:{maps:[map()]}};
  assert.equal((await service.organizer(body)).revision,1);
  assert.equal((await service.organizer(body)).revision,1);
  await assert.rejects(service.organizer({...body,result:{maps:[map(13,8)]}}), e=>e.status===409);
  await assert.rejects(service.organizer({...body,requestId:'b'.repeat(32)}), e=>e.status===409);
  assert.equal((await createLceResultsService({store}).read()).revision,1);
  const responses=await Promise.allSettled(['b','c'].map(x=>service.organizer({...body,requestId:x.repeat(32),expectedRevision:1})));
  assert.equal(responses.filter(r=>r.status==='fulfilled').length,1);
});
test('dedicated S3 document uses CAS, private ACL and cold restart readback', async () => {
  let object=null,etag=0;
  const s3={async send(cmd){const i=cmd.input;assert.equal(i.Key,'results/cs2-lce-november-2026.json');
    if(cmd.constructor.name==='GetObjectCommand'){if(!object)throw Object.assign(new Error(),{name:'NoSuchKey'});return {Body:Readable.from([object]),ETag:String(etag)};}
    assert.equal(i.ACL,'private');if(object?i.IfMatch!==String(etag):i.IfNoneMatch!=='*')throw Object.assign(new Error(),{$metadata:{httpStatusCode:412}});
    object=i.Body;etag++;return {};
  }};
  const store=()=>createMatchMediaS3Store({s3,key:'results/cs2-lce-november-2026.json',empty:emptyLce,validate:validateLceDocument});
  const service=createLceResultsService({store:store()});
  await service.organizer({action:'result',requestId:'a'.repeat(32),expectedRevision:0,matchId:group[0].id,result:{maps:[map()]}});
  assert.equal((await createLceResultsService({store:store()}).read()).revision,1);
});
test('HTTP result writes require organizer session; public read is anonymous and same revision', async () => {
  const service=createLceResultsService({store:memoryStore()});
  const server=createResultsServer({env:{YCS_ORGS_LOGIN:'test',YCS_ORGS_PASSWORD:'secret'},lceService:service});
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base+'/api/orgs/lce-results')).status,401);
    const login=await fetch(base+'/api/orgs/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:'test',password:'secret'})});
    const {token}=await login.json();
    const body={action:'result',requestId:'a'.repeat(32),expectedRevision:0,matchId:group[0].id,result:{maps:[map()]}};
    const saved=await fetch(base+'/api/orgs/lce-results',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});assert.equal(saved.status,200);
    const publicResponse=await fetch(base+'/api/tournaments/cs2-lce-november-2026'); const doc=await publicResponse.json();assert.equal(doc.revision,1);assert.equal(doc.requests,undefined);
    assert.equal((await fetch(base+'/api/tournaments/cs2-lce-november-2026',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/api/tournaments/cs2-lce-november-2026',{headers:{Origin:'https://evil.example'}})).status,403);
  } finally { await new Promise(r=>server.close(r)); }
});
test('head-to-head ranks two equal teams; mini-table round difference ranks three equal teams', () => {
  const doc=emptyLce();
  const firstBeats = {1:[2,3,4],2:[3,4,5],3:[4,5],4:[5],5:[1]};
  for(const m of group){const a=+m.team1Id.at(-1),b=+m.team2Id.at(-1);doc.matches[m.id]=result(m,[firstBeats[a].includes(b)?map():map(9,13)]);}
  let rows=deriveLce(baseline,doc).tournament.stages[0].groups[0].rows;
  assert.deepEqual(rows.slice(0,2).map(r=>+r.teamId.at(-1)),[1,2]);
  const cycle={1:[2,4,5],2:[3,4,5],3:[1,4,5],4:[5],5:[]};
  for(const m of group){const a=+m.team1Id.at(-1),b=+m.team2Id.at(-1);const win=cycle[a].includes(b);const zero=(a===1&&b===2)||(a===2&&b===1);doc.matches[m.id]=result(m,[win?map(13,zero?0:9):map(zero?0:9,13)]);}
  const state=deriveLce(baseline,doc);rows=state.tournament.stages[0].groups[0].rows;
  assert.deepEqual(rows.slice(0,3).map(r=>+r.teamId.at(-1)),[1,3,2]);assert.equal(state.groupReady,true);
});
test('renaming by stable team ID updates all displays without changing results', () => {
  const doc=groupDoc(),registry={teams:baseline.participants.map(p=>({id:p.teamId,name:p.displayName}))};
  registry.teams[0].name='Новое название';
  const state=deriveLce(baseline,doc,registry);
  assert.equal(state.tournament.stages[0].groups[0].rows[0].team,'Новое название');
  assert.equal(lceFixtures(state.tournament).find(m=>m.id==='lce-sf-1').team1,'Новое название');
  assert.equal(lceFixtures(state.tournament)[0].team1,'Новое название');
});
test('tiebreak scheduling and judge draw reject invalid scope, conflicting slots and premature draw', async () => {
  const doc=groupDoc(true),store={read:async()=>({value:structuredClone(doc),etag:1}),compareAndSet:async(_,value)=>{Object.assign(doc,value);return {value,etag:2};}};
  const service=createLceResultsService({store});
  const state=await service.read(),tb=lceFixtures(state.tournament).filter(m=>m.id.startsWith('lce-tb-'));
  const body={action:'slot',requestId:'a'.repeat(32),expectedRevision:0,matchId:tb[0].id,scheduledAt:'2026-11-14T22:30:00+03:00'};
  await service.organizer(body);
  const other=tb.find(m=>m.id!==tb[0].id&&[m.team1Id,m.team2Id].includes(tb[0].team1Id));
  await assert.rejects(service.organizer({...body,matchId:other.id,requestId:'b'.repeat(32),expectedRevision:1}),/разные слоты/);
  await assert.rejects(service.organizer({action:'draw',requestId:'c'.repeat(32),expectedRevision:1,teamIds:baseline.participants.map(p=>p.teamId)}),/Жребий/);
});
