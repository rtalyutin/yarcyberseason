// Contract-5 independent QA: synthetic identities/keys, captured encrypted S3 transport and local HTTP only.
// Run: node --test scripts/manual/captain-service-probes.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createDecipheriv } from 'node:crypto';
import { Readable } from 'node:stream';
import { createCaptainService } from '../../backend/captain-service.mjs';
import { CaptainError, createTelegramVerifier } from '../../backend/captain-auth.mjs';
import { emptyCaptainState, createCaptainS3Store } from '../../backend/captain-store.mjs';
import { createCaptainClient, moscowToIso } from '../../src/telegram/captain-client.js';

const now=Date.parse('2026-10-09T09:00:00Z');
const teams=['alpha','beta','gamma','delta'];
const tournament={id:'dota2-autumn-2026',participants:teams.map(teamId=>({teamId,displayName:teamId.toUpperCase()})),stages:[{title:'Swiss',rounds:[{label:'Round 1',matches:[{id:'ab',team1Id:'alpha',team2Id:'beta',bestOf:'BO3',status:'scheduled'},{id:'cd',team1Id:'gamma',team2Id:'delta',bestOf:'BO1',status:'scheduled'},{id:'no-window',team1Id:'alpha',team2Id:'delta',bestOf:'BO1',status:'scheduled'}]}]}]};
const window={start:'2026-10-10T10:00:00+03:00',end:'2026-10-12T23:00:00+03:00'};
function memory() {
  let value = emptyCaptainState(), version = 0, barrier = null, hold = null;
  const log = [];
  return {
    log,
    peek: () => structuredClone(value),
    arm(n = 2) {
      let release;
      const wait = new Promise((resolve) => { release = resolve; });
      barrier = { n, wait, release };
    },
    holdNextRead() {
      let release, captured;
      const wait = new Promise((resolve) => { release = resolve; });
      const reached = new Promise((resolve) => { captured = resolve; });
      hold = { wait, captured };
      return { release, reached };
    },
    async read() {
      const snapshot = { value: structuredClone(value), etag: String(version) };
      const delayed = hold;
      if (delayed) { hold = null; delayed.captured(); await delayed.wait; }
      return snapshot;
    },
    async compareAndSet(previous, next) {
      const at = version, b = barrier;
      if (b) { if (--b.n === 0) { barrier = null; b.release(); } await b.wait; }
      if (previous.etag !== String(version)) {
        log.push({ type: 'conflict', at, expected: previous.etag, actual: version });
        throw new CaptainError('storage_conflict', 409);
      }
      value = structuredClone(next); version++;
      log.push({ type: 'commit', revision: version, kind: value.history.at(-1).kind });
      return { value: structuredClone(value), etag: String(version) };
    },
  };
}
let counter = 0;
const req = () => `qa-request-${++counter}`;
const users = {
  a: { id: '101', username: 'alpha_captain' },
  b: { id: '202', username: 'beta_captain' },
  c: { id: '303', username: 'gamma_captain' },
  replacement: { id: '404', username: 'replacement_captain' },
  hijack: { id: '999', username: 'alpha_captain' },
};
async function fixture({ store = memory(), source = tournament } = {}) {
  let currentTime = now;
  const serviceOptions = {
    store, now: () => currentTime, getTournament: async () => structuredClone(source),
    env: { YCS_CAPTAIN_WINDOWS_JSON: JSON.stringify({ ab: window, cd: window }) },
    verify: (value) => {
      if (!users[value]) throw new CaptainError('unauthorized', 401);
      return users[value];
    },
  };
  const service = createCaptainService(serviceOptions);
  async function assign(teamId, username) {
    const revision = (await service.organizer()).revision;
    return service.organizer({ teamId, username, expectedRevision: revision, requestId: req() });
  }
  for (const [teamId, username] of [['alpha', 'alpha_captain'], ['beta', 'beta_captain'], ['gamma', 'gamma_captain']]) {
    await assign(teamId, username);
  }
  await service.captain({ action: 'access', initData: 'a' });
  await service.captain({ action: 'access', initData: 'b' });
  const call = (user, action, body = {}) => service.captain({ initData: user, action, ...body });
  const detail = (user = 'a', matchId = 'ab') => call(user, 'match', { matchId });
  const message = async (user, text, requestId = req(), expectedChatEpoch, matchId = 'ab') => call(user, 'message', {
    matchId, requestId, text, expectedChatEpoch: expectedChatEpoch ?? (await detail(user, matchId)).chatEpoch,
  });
  return { store, service, serviceOptions, assign, call, detail, message,
    advance: (milliseconds) => { currentTime += milliseconds; },
    agree: (user, version, time, id = req()) => call(user, 'agree', { matchId: 'ab', requestId: id, expectedScheduleVersion: version, startsAt: time }),
  };
}
const TEST_AES_KEY = '09'.repeat(32); // Synthetic fixture only; never a deployment key.
const CURRENT_BUCKET = 'e9dc5ea4-6dc9267d-85ca-4ae9-a41f-2895e9542a04';
function fakeS3() {
  let body = null, revision = 0, loseReply = false;
  const puts = [];
  let heldPut = null, afterCommit = null;
  return {
    puts,
    afterNextCommit(callback) { afterCommit = callback; },
    holdNextPut() {
      let release, reached;
      const wait = new Promise((resolve) => { release = resolve; });
      const captured = new Promise((resolve) => { reached = resolve; });
      heldPut = { wait, reached };
      return { release, captured };
    },
    body: () => body,
    replace: (value) => { body = value; },
    loseNextWriteReply: () => { loseReply = true; },
    async send(command) {
      const input = command.input;
      if (command.constructor.name === 'GetObjectCommand') {
        if (body === null) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
        return { Body: Readable.from([body]), ETag: String(revision), ContentLength: Buffer.byteLength(body) };
      }
      if (command.constructor.name !== 'PutObjectCommand') throw new Error('unexpected S3 command');
      const delayed = heldPut;
      if (delayed) { heldPut = null; delayed.reached(); await delayed.wait; }
      if ((input.IfMatch !== undefined && input.IfMatch !== String(revision)) || (input.IfNoneMatch === '*' && body !== null)) {
        throw Object.assign(new Error('CAS conflict'), { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } });
      }
      puts.push(structuredClone(input)); body = input.Body; revision++;
      const hook = afterCommit;
      if (hook) { afterCommit = null; await hook(); }
      if (loseReply) { loseReply = false; throw new Error('reply lost after commit'); }
      return {};
    },
  };
}
function decryptCaptured(body, key = TEST_AES_KEY, bucket = CURRENT_BUCKET) {
  const envelope = JSON.parse(body);
  assert.equal(envelope.envelopeVersion, 1);
  assert.equal(envelope.algorithm, 'aes-256-gcm');
  const nonce = Buffer.from(envelope.nonce, 'base64'), tag = Buffer.from(envelope.tag, 'base64');
  assert.equal(nonce.length, 12); assert.equal(tag.length, 16);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), nonce);
  decipher.setAAD(Buffer.from(JSON.stringify(['ycs-captain-state', bucket, 'captains/dota2-autumn-2026.json', 'dota2-autumn-2026', 1, 'aes-256-gcm'])));
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}
const rejectsCode=(promise,code)=>assert.rejects(promise,e=>e.code===code,code);
const time1='2026-10-10T12:00:00.000Z',time2='2026-10-11T13:00:00.000Z';

test('QA01 signed identity rejects tamper, duplicate fields, wrong bot and stale/future date',()=>{const {publicKey,privateKey}=generateKeyPairSync('ed25519');const botId='777';const verifier=createTelegramVerifier({botId,now:()=>now,publicKey});function signed(overrides={}){const p=new URLSearchParams({auth_date:String(Math.floor(now/1000)),user:JSON.stringify({id:101,username:'Alpha_Captain'}),...overrides});const check=`${botId}:WebAppData\n${[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')}`;p.set('signature',sign(null,Buffer.from(check),privateKey).toString('base64url'));return p.toString()}const valid=signed();assert.deepEqual(verifier(valid),{id:'101',username:'alpha_captain'});for(const bad of [valid.replace('101','999'),valid+'&user=%7B%22id%22%3A999%7D',signed({auth_date:String(now/1000-3601)}),signed({auth_date:String(now/1000+31)})])assert.throws(()=>verifier(bad),e=>e.code==='unauthorized');assert.throws(()=>createTelegramVerifier({botId:'778',now:()=>now,publicKey})(valid),e=>e.code==='unauthorized');});

test('QA02 binding lock prevents username takeover and foreign-match access; revoke clears pending consent',async()=>{const f=await fixture();assert.equal((await f.call('hijack','access')).authorized,false);await rejectsCode(f.call('hijack','match',{matchId:'ab'}),'forbidden');for(const action of ['match','message','agree','result']){const extra={match:{},message:{requestId:req(),expectedChatEpoch:'a'.repeat(64),text:'private'},agree:{requestId:req(),expectedScheduleVersion:0,startsAt:time1},result:{requestId:req(),score:[1,0],comment:''}}[action];await rejectsCode(f.call('a',action,{matchId:'cd',...extra}),'forbidden')}await f.agree('a',0,time1);await f.assign('alpha',null);const dto=await f.call('b','match',{matchId:'ab'});assert.equal(dto.proposal,null);assert.equal(dto.scheduleVersion,2);assert.equal((await f.call('a','access')).authorized,false);await rejectsCode(f.call('a','message',{matchId:'ab',requestId:req(),expectedChatEpoch:'a'.repeat(64),text:'revoked'}),'forbidden');assert.doesNotMatch(JSON.stringify(dto), /"(?:userId|actorUserId|bindingGeneration|username)":/);assert.equal(JSON.stringify(dto).includes('alpha_captain'),false);});

test('QA03 two-party agreement, new-time reset, result claim and honest missing window',async()=>{const f=await fixture();let d=await f.agree('a',0,time1);assert.equal(d.agreed,null);assert.deepEqual(d.proposal.confirmedTeamIds,['alpha']);d=await f.agree('b',1,time1);assert.equal(d.agreed.startsAt,time1);assert.equal(d.proposal.confirmedTeamIds.length,2);d=await f.agree('a',2,time2);assert.equal(d.agreed.startsAt,time1);assert.deepEqual(d.proposal.confirmedTeamIds,['alpha']);d=await f.agree('b',3,time2);assert.equal(d.agreed.startsAt,time2);await rejectsCode(f.call('a','agree',{matchId:'no-window',expectedScheduleVersion:0,startsAt:time1,requestId:req()}),'window_unavailable');const claim=await f.call('a','result',{matchId:'ab',requestId:req(),score:[2,1],comment:'synthetic'});assert.equal(claim.match.status,'scheduled');assert.equal(claim.resultClaims.length,1);assert.equal(tournament.stages[0].rounds[0].matches[0].resultConfirmed,undefined);});

test('QA04 controlled concurrent confirm versus reschedule cannot combine consent across versions',async()=>{const f=await fixture();await f.agree('a',0,time1);f.store.arm();const results=await Promise.allSettled([f.agree('b',1,time1),f.agree('a',1,time2)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const failure=results.find(r=>r.status==='rejected');assert.equal(failure.reason.code,'conflict');const d=await f.call('a','match',{matchId:'ab'});if(d.proposal.startsAt===time1){assert.equal(d.agreed.startsAt,time1);assert.deepEqual(new Set(d.proposal.confirmedTeamIds),new Set(['alpha','beta']))}else{assert.equal(d.proposal.startsAt,time2);assert.equal(d.agreed,null);assert.deepEqual(d.proposal.confirmedTeamIds,['alpha'])}assert.ok(f.store.log.some(x=>x.type==='conflict'));console.log('QA04_HISTORY',JSON.stringify(f.store.log));});

test('QA05 repeat action uses original request id once; changed payload and stale organizer revision fail',async()=>{const f=await fixture();const id=req(),body={matchId:'ab',requestId:id,expectedChatEpoch:(await f.detail()).chatEpoch,text:'hello'};await f.call('a','message',body);const twice=await f.call('a','message',body);assert.equal(twice.messages.length,1);await rejectsCode(f.call('a','message',{...body,text:'changed'}),'idempotency_conflict');const before=await f.service.organizer();await f.assign('gamma',null);await rejectsCode(f.service.organizer({requestId:req(),teamId:'delta',username:'delta_captain',expectedRevision:before.revision}),'conflict');});

test('QA06 current bucket encryption, durable recovery and ambiguous successful PUT', async () => {
  const s3 = fakeS3();
  const store = createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 });
  const f = await fixture({ store });
  s3.loseNextWriteReply();
  await f.agree('a', 0, time1);
  await f.agree('b', 1, time1);
  assert.ok(s3.puts.every((put) => put.Bucket === CURRENT_BUCKET));
  assert.ok(s3.puts.every((put) => put.ACL === 'private' && put.CacheControl === 'no-store'));
  assert.equal(s3.puts[0].IfNoneMatch, '*');
  assert.ok(s3.puts.slice(1).every((put) => typeof put.IfMatch === 'string'));
  assert.equal(new Set(s3.puts.map((put) => JSON.parse(put.Body).nonce)).size, s3.puts.length);
  const clear = decryptCaptured(s3.body());
  assert.equal(clear.schemaVersion, 3);
  assert.equal(clear.bindings.alpha.userId, '101');
  assert.equal(clear.matches.ab.agreed.startsAt, time1);
  assert.ok(!s3.body().includes('alpha_captain'));
  const restartedStore = createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 });
  const restarted = createCaptainService({ ...f.serviceOptions, store: restartedStore });
  const detail = await restarted.captain({ action: 'match', matchId: 'ab', initData: 'a' });
  assert.equal(detail.agreed.startsAt, time1);
  assert.equal(detail.viewerTeamId, 'alpha');
  assert.deepEqual(detail.messages, []);
});

test('QA07 Serverless endpoint error contract preserves definitive conflicts and ambiguous storage failure',async()=>{for(const [code,uncertain] of [['conflict',false],['forbidden',false],['window_unavailable',false],['chat_reset',false],['storage_unavailable',true]]){const client=createCaptainClient({initData:'synthetic',Serverless:{call(name,input,callback){callback({type:'ENDPOINT_ERROR',parameters:{code}})}}},{timeoutMs:50});await assert.rejects(client.call('agree',{requestId:'qa-request'}),e=>e.code===code&&e.uncertain===uncertain,code)}assert.equal(moscowToIso('2026-10-10','18:30'),'2026-10-10T15:30:00.000Z');assert.equal(moscowToIso('2026-02-30','18:30'),null);});

test('QA08 HTTP surface protects organizer mutations and signed captain data without browser CORS access',async()=>{const {createResultsServer}=await import('../../backend/server.mjs');const {publicKey,privateKey}=generateKeyPairSync('ed25519');const botId='777',p=new URLSearchParams({auth_date:String(now/1000),user:JSON.stringify({id:101,username:'alpha_captain'})});p.set('signature',sign(null,Buffer.from(`${botId}:WebAppData\n${[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')}`),privateKey).toString('base64url'));const service=createCaptainService({store:memory(),now:()=>now,getTournament:async()=>tournament,env:{},verify:createTelegramVerifier({botId,now:()=>now,publicKey})});await service.organizer({teamId:'alpha',username:'alpha_captain',expectedRevision:0,requestId:req()});const server=createResultsServer({env:{YCS_ORGS_LOGIN:'qa-login',YCS_ORGS_PASSWORD:'qa-password',YCS_ORGS_ALLOWED_ORIGIN:'https://qa.invalid'},captainService:service,organizerOptions:{getData:async()=>({rows:[]})}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;try{for(const method of ['GET','POST']){const response=await fetch(base+'/api/orgs/captains',{method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({teamId:'alpha',username:null})}:{})});assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store')}const invoke=initData=>fetch(base+'/api/captain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'access',initData})});let response=await invoke('forged');assert.equal(response.status,401);response=await invoke(p.toString());assert.equal(response.status,200);const data=await response.json();assert.equal(data.authorized,true);assert.equal(data.team.id,'alpha');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),null);response=await fetch(base+'/api/captain',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://qa.invalid'},body:JSON.stringify({action:'access',initData:p.toString()})});assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null);response=await fetch(base+'/api/orgs/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:'qa-login',password:'qa-password'})});const {token}=await response.json();assert.ok(token);response=await fetch(base+'/api/orgs/captains',{headers:{Authorization:`Bearer ${token}`}});assert.equal(response.status,200);assert.equal((await response.json()).bindings[0].linked,true);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}});


test('QA09 encrypted whole conversation survives seven offline days and restart; reads do not consume it', async () => {
  const s3 = fakeS3(), store = createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 });
  const f = await fixture({ store });
  const marker = 'QA_WEEK_OFFLINE_CONVERSATION', requestId = req();
  const first = await f.message('a', marker, requestId);
  assert.ok(JSON.stringify(decryptCaptured(s3.body())).includes(marker));
  assert.ok(!s3.body().includes(marker));
  for (let read = 0; read < 3; read++) assert.deepEqual((await f.detail('b')).messages, first.messages);
  assert.deepEqual((await f.service.organizer()).matches.find((detail) => detail.match.id === 'ab').messages, []);
  f.advance(7 * 24 * 60 * 60 * 1000);
  // This models a fresh verified Telegram launch after the week, not a stale initData signature.
  const restarted = createCaptainService({ ...f.serviceOptions, store: createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 }) });
  const after = await restarted.captain({ action: 'match', matchId: 'ab', initData: 'b' });
  assert.deepEqual(after.messages, first.messages);
  assert.equal(after.chatEpoch, first.chatEpoch);
  assert.equal(after.chatClosed, false);
  const retry = await restarted.captain({ action: 'message', matchId: 'ab', initData: 'a', requestId, expectedChatEpoch: first.chatEpoch, text: marker });
  assert.equal(retry.messages.length, 1);
  assert.ok(JSON.stringify(decryptCaptured(s3.body())).includes(marker));
  for (let index = 1; index <= 100; index++) {
    f.advance(2100);
    await f.message('a', `whole-conversation-${index}`, req(), first.chatEpoch);
  }
  const complete = await f.detail('b');
  assert.equal(complete.messages.length, 101, 'the prior rolling-100 cap must not silently discard history');
  assert.equal(complete.messages[0].text, marker);
});

function officialFinish(source) {
  const match = source.stages[0].rounds[0].matches[0];
  match.status = 'completed'; match.resultConfirmed = true;
}
function containsMessageMetadata(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.action === 'message' || value.kind === 'message') return true;
  return Object.values(value).some(containsMessageMetadata);
}

test('QA10 official completion purges only chat data from current S3; claims do not close and closure survives rollback', async () => {
  const source = structuredClone(tournament), s3 = fakeS3();
  const store = createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 });
  const f = await fixture({ store, source });
  await f.agree('a', 0, time1); await f.agree('b', 1, time1);
  const id = req(), marker = 'QA_REMOVE_AT_OFFICIAL_END';
  const sent = await f.message('a', marker, id);
  const result = await f.call('a', 'result', { matchId: 'ab', requestId: req(), score: [2, 1], comment: 'retained result claim' });
  assert.equal(result.chatClosed, false);
  assert.equal(result.messages[0].text, marker);
  await f.service.cleanup();
  assert.equal((await f.detail()).messages[0].text, marker, 'a captain claim cannot trigger closure');
  const before = decryptCaptured(s3.body());
  const messageReceipts = Object.entries(before.requests).filter(([, receipt]) => receipt.action === 'message');
  const messageEvents = before.history.filter((event) => ['chat_opened', 'chat_reset', 'message'].includes(event.kind));
  assert.equal(messageReceipts.length, 1);
  assert.ok(messageEvents.some((event) => event.kind === 'message'));
  officialFinish(source);
  // An unrelated malformed scheduling configuration must not block privacy cleanup.
  const cleaner = createCaptainService({ ...f.serviceOptions, env: { YCS_CAPTAIN_WINDOWS_JSON: 'malformed-json' } });
  await cleaner.cleanup();
  const after = decryptCaptured(s3.body()), json = JSON.stringify(after);
  assert.equal(after.matches.ab.chatClosed, true);
  assert.equal(after.matches.ab.chat, null);
  assert.ok(!json.includes(marker));
  for (const [key, receipt] of messageReceipts) { assert.ok(!json.includes(key)); assert.ok(!json.includes(receipt.fingerprint)); }
  for (const event of messageEvents) assert.ok(!json.includes(event.id));
  assert.equal(containsMessageMetadata(after), false);
  assert.deepEqual(after.bindings, before.bindings);
  assert.deepEqual(after.matches.ab.agreed, before.matches.ab.agreed);
  assert.deepEqual(after.matches.ab.resultClaims, before.matches.ab.resultClaims);
  const detail = await f.detail('b');
  assert.equal(detail.chatClosed, true); assert.equal(detail.chatEpoch, null); assert.deepEqual(detail.messages, []);
  await rejectsCode(f.message('a', marker, id, sent.chatEpoch), 'match_closed');
  source.stages[0].rounds[0].matches[0].status = 'scheduled';
  source.stages[0].rounds[0].matches[0].resultConfirmed = false;
  const restarted = createCaptainService({ ...f.serviceOptions, store: createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 }) });
  const rolledBack = await restarted.captain({ action: 'match', matchId: 'ab', initData: 'a' });
  assert.equal(rolledBack.chatClosed, true); assert.deepEqual(rolledBack.messages, []);
  await rejectsCode(restarted.captain({ action: 'message', matchId: 'ab', initData: 'a', requestId: id, expectedChatEpoch: sent.chatEpoch, text: marker }), 'match_closed');
});

test('QA11 captain replacement retains the conversation but rotates epoch and rejects the former account', async () => {
  const f = await fixture();
  const original = await f.message('a', 'team conversation survives replacement');
  await f.assign('alpha', 'replacement_captain');
  const replacement = await f.detail('replacement');
  assert.deepEqual(replacement.messages, original.messages);
  assert.notEqual(replacement.chatEpoch, original.chatEpoch);
  assert.equal(replacement.chatClosed, false);
  await rejectsCode(f.detail('a'), 'forbidden');
  await rejectsCode(f.message('a', 'former account', req(), original.chatEpoch), 'forbidden');
  await rejectsCode(f.message('b', 'stale pending', req(), original.chatEpoch), 'chat_reset');
  assert.equal((await f.message('replacement', 'new captain', req(), replacement.chatEpoch)).messages.length, 2);
});

test('QA12 official cleanup wins a CAS race against a message built from the preceding open snapshot', async () => {
  const source = structuredClone(tournament), s3 = fakeS3();
  const f = await fixture({ source, store: createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 }) });
  const detail = await f.detail();
  const hold = s3.holdNextPut(), marker = 'QA_RACING_MESSAGE_MUST_NOT_RESURRECT';
  const pending = f.message('a', marker, req(), detail.chatEpoch).then((value) => ({ value }), (error) => ({ error }));
  await hold.captured;
  officialFinish(source);
  await f.service.cleanup();
  hold.release();
  const outcome = await pending;
  assert.equal(outcome.error?.code, 'match_closed');
  const current = decryptCaptured(s3.body());
  assert.equal(current.matches.ab.chatClosed, true);
  assert.equal(current.matches.ab.chat, null);
  assert.ok(!JSON.stringify(current).includes(marker));
  assert.equal(containsMessageMetadata(current), false);
});

function fakeTimers() {
  const timers = new Map();
  let unrefs = 0;
  return { timers, unrefs: () => unrefs,
    setTimer(callback, delay) { const timer = { unref() { unrefs++; } }; timers.set(timer, { callback, delay }); return timer; },
    clearTimer(timer) { timers.delete(timer); },
  };
}

test('QA13 cleanup worker is wired at backend startup, repeats at 60 seconds, coalesces runs and stops gracefully', async () => {
  const { startResultsBackend } = await import('../../backend/server.mjs');
  const { startCaptainCleanupWorker } = await import('../../backend/captain-cleanup-worker.mjs');
  const source = structuredClone(tournament), s3 = fakeS3();
  const f = await fixture({ source, store: createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 }) });
  const sent = await f.message('a', 'background removal without a captain request');
  const clock = fakeTimers();
  const backend = await startResultsBackend({ host: '127.0.0.1', port: 0,
    env: { YCS_DOTA_RESULTS_IMPORT_ENABLED: 'false', YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY, YCS_CAPTAIN_BOT_ID: '777' },
    captainService: f.service, captainWorkerOptions: { now: () => now, setTimer: clock.setTimer, clearTimer: clock.clearTimer }, logger: { log() {} } });
  try {
    await backend.captainWorker.run();
    assert.equal(backend.captainWorker.state.attempts, 1, 'run() must join the automatic startup pass');
    assert.equal(clock.timers.size, 1); assert.ok(clock.unrefs() > 0);
    const [timer, task] = [...clock.timers][0];
    assert.equal(task.delay, 60_000);
    officialFinish(source); clock.timers.delete(timer); task.callback();
    await backend.captainWorker.run();
    assert.equal(backend.captainWorker.state.attempts, 2);
    const state = decryptCaptured(s3.body());
    assert.equal(state.matches.ab.chat, null);
    assert.ok(!JSON.stringify(state).includes(sent.messages[0].text));
  } finally { await backend.stop(); }
  assert.equal(clock.timers.size, 0); assert.equal(backend.captainWorker.state.status, 'stopped');

  let release, calls = 0, stopped = false;
  const gate = new Promise((resolve) => { release = resolve; }), overlapClock = fakeTimers();
  const worker = startCaptainCleanupWorker({ enabled: true, service: { cleanup() { calls++; return gate; } },
    setTimer: overlapClock.setTimer, clearTimer: overlapClock.clearTimer });
  await Promise.resolve();
  const first = worker.run(), second = worker.run();
  assert.equal(first, second); assert.equal(calls, 1);
  const stopping = worker.stop().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false);
  release(); await stopping;
  assert.equal(worker.state.status, 'stopped'); assert.equal(overlapClock.timers.size, 0);
  await worker.run(); assert.equal(calls, 1);
});

test('QA14 wrong encryption key, corrupted ciphertext, plaintext and wrong AAD fail closed', async () => {
  const s3 = fakeS3();
  for (const key of [undefined, '', 'ab', 'z'.repeat(64)]) {
    await rejectsCode(createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: key }, s3 }).read(), 'captain_not_configured');
  }
  const store = createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 });
  await fixture({ store });
  const valid = s3.body();
  await rejectsCode(createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: 'a1'.repeat(32) }, s3 }).read(), 'storage_unavailable');
  await rejectsCode(createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY, YCS_CAPTAIN_BUCKET: 'qa-other-bucket' }, s3 }).read(), 'storage_unavailable');
  const damaged = JSON.parse(valid), bytes = Buffer.from(damaged.ciphertext, 'base64');
  bytes[0] ^= 1; damaged.ciphertext = bytes.toString('base64'); s3.replace(JSON.stringify(damaged));
  await rejectsCode(store.read(), 'storage_unavailable');
  s3.replace(JSON.stringify(decryptCaptured(valid))); await rejectsCode(store.read(), 'storage_unavailable');
  s3.replace(valid); assert.equal((await store.read()).value.bindings.alpha.userId, '101');
});

test('QA15 client closure discards pending text, blocks new sends and cannot be undone by stale open DTO', async () => {
  const { captainMessageInput, recoverCaptainCommand, reconcileCaptainChat } = await import('../../src/telegram/captain-client.js');
  let sends = 0;
  const client = createCaptainClient({ initData: 'synthetic', Serverless: { call(name, input, callback) { sends++; callback(null, {}); } } });
  const command = { action: 'message', input: { matchId: 'ab', requestId: req(), expectedChatEpoch: 'a'.repeat(64), text: 'pending draft' } };
  client.pendingCommands.set('ab', command); client.messageDrafts.set('ab', command.input.text);
  const closed = reconcileCaptainChat(client, 'ab', { chatClosed: true, chatEpoch: 'a'.repeat(64), messages: [{ text: 'stale text' }] });
  assert.equal(client.pendingCommands.has('ab'), false); assert.equal(client.messageDrafts.has('ab'), false);
  assert.deepEqual(closed.messages, []); assert.equal(closed.chatEpoch, null);
  const stale = reconcileCaptainChat(client, 'ab', { chatClosed: false, chatEpoch: 'b'.repeat(64), messages: [{ text: 'late stale response' }] });
  assert.equal(stale.chatClosed, true); assert.deepEqual(stale.messages, []);
  assert.throws(() => captainMessageInput(stale, 'cannot send'), (error) => error.code === 'match_closed');
  const recovery = recoverCaptainCommand(command, { code: 'match_closed', uncertain: true });
  assert.deepEqual(recovery, { pending: null, draft: null, awaitingChatRefresh: false });
  await rejectsCode(client.call('message', command.input), 'match_closed'); assert.equal(sends, 0);
  await client.call('result', { matchId: 'ab' }); assert.equal(sends, 1, 'closure only blocks chat, not separate result claims');
});

test('QA16 production catalog remains immutable and rejects results that change the opponent', async () => {
  const { createCaptainTournamentSource } = await import('../../backend/captain-service.mjs');
  let currentTime = now, loads = 0, published = structuredClone(tournament), altered = false;
  const source = createCaptainTournamentSource({ now: () => currentTime,
    load: async () => { loads++; return structuredClone(published); },
    fetcher: async () => altered ? { ok: true, status: 200, json: async () => ({ schemaVersion: 1, tournamentId: tournament.id,
      leagueId: tournament.leagueId, revision: 1, updatedAt: new Date(currentTime).toISOString(),
      matches: { ab: { status: 'completed', resultConfirmed: true, scoreKind: 'series', team1Id: 'alpha', team2Id: 'gamma', score1: 2, score2: 0, maps: [] } } }) } : { status: 404, ok: false } });
  await source(); published.stages[0].rounds[0].matches[0].team2Id = 'gamma'; currentTime += 61_000; altered = true;
  const refreshed = await source();
  assert.equal(loads, 1); assert.equal(refreshed.captainResultsAvailable, false);
  assert.equal(refreshed.stages[0].rounds[0].matches[0].team2Id, 'beta');
});

test('QA17 a lost message PUT response followed by official cleanup cannot produce a false send acknowledgement', async () => {
  const source = structuredClone(tournament), s3 = fakeS3();
  const f = await fixture({ source, store: createCaptainS3Store({ env: { YCS_CAPTAIN_ENCRYPTION_KEY: TEST_AES_KEY }, s3 }) });
  const initial = await f.detail(), marker = 'QA_COMMIT_THEN_PURGE_BEFORE_REPLY';
  s3.afterNextCommit(async () => {
    officialFinish(source);
    await f.service.cleanup();
    throw new Error('message response lost after official cleanup');
  });
  await rejectsCode(f.message('a', marker, req(), initial.chatEpoch), 'match_closed');
  const current = decryptCaptured(s3.body());
  assert.equal(current.matches.ab.chatClosed, true); assert.equal(current.matches.ab.chat, null);
  assert.ok(!JSON.stringify(current).includes(marker)); assert.equal(containsMessageMetadata(current), false);
});
