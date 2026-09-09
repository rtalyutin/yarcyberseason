import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,pairGroup} from '../src/lib/swissSimulator.js';
function replay(result){
 const counts=Array.from({length:result.config.n},(_,i)=>({id:i+1,wins:0,losses:0,byes:0,status:'ACTIVE'})),seen=new Set();let total=0;
 for(const r of result.rounds){
  assert.deepEqual(r.before,counts);const used=new Set();
  for(const m of r.matches){
   const w=counts[m.winner-1],l=counts[m.loser-1];
   assert.equal(w.status,'ACTIVE');assert.equal(l.status,'ACTIVE');assert.equal(w.losses,l.losses);
   for(const id of [w.id,l.id]){assert.ok(!used.has(id));used.add(id);}
   const key=[w.id,l.id].sort((a,b)=>a-b).join(':');assert.ok(!seen.has(key));seen.add(key);
   w.wins++;l.losses++;total++;
   if(w.wins===result.config.winLimit)w.status='QUALIFIED_WINS';
   if(l.losses===result.config.lossLimit)l.status='ELIMINATED';
   assert.deepEqual(m.winner_after,w);assert.deepEqual(m.loser_after,l);
  }
  for(const b of r.byes){assert.ok(!used.has(b.id));used.add(b.id);assert.equal(counts[b.id-1].status,'ACTIVE');counts[b.id-1].byes++;}
  assert.equal(used.size,r.before.filter(t=>t.status==='ACTIVE').length);assert.deepEqual(r.after,counts);
 }
 assert.equal(total,result.total);assert.equal(counts.reduce((s,t)=>s+t.wins,0),total);assert.equal(counts.reduce((s,t)=>s+t.losses,0),total);
 if(result.status==='COMPLETED')assert.equal(result.playoff.length,8);else assert.equal(result.playoff,null);
}
test('reference examples and independent journal replay',()=>{
 for(const [n,w,l,status,total] of [[16,4,3,'COMPLETED',36],[18,4,3,'COMPLETED',40],[8,4,3,'COMPLETED',0],[18,1,3,'RULE_CONFLICT',9],[10,100,1,'RULE_CONFLICT',5],[9,99,99,'STALLED',24],[10,1,3,'COMPLETED',8]]){
  const r=simulate({n,winLimit:w,lossLimit:l});assert.equal(r.status,status);assert.equal(r.total,total);replay(r);
 }
});
test('maximum pairing and bye priority',()=>{
 const group=[1,2,3,4].map(id=>({id,byes:0}));
 assert.deepEqual(pairGroup(group,new Set(['1:4','2:3','3:4'])).pairs,[[1,3],[2,4]]);
 assert.deepEqual(pairGroup(group.slice(0,3),new Set()).byes,[3]);
 group[2].byes=1;assert.deepEqual(pairGroup(group.slice(0,3),new Set()).byes,[2]);
});
test('invalid inputs and resource failure never fabricate a playoff',()=>{
 for(const n of [7,8.5,NaN,Infinity])assert.equal(simulate({n,winLimit:4,lossLimit:3}).status,'INVALID_INPUT');
 const r=simulate({n:18,winLimit:4,lossLimit:3},{maxOperations:0});assert.equal(r.status,'RESOURCE_LIMIT');assert.equal(r.playoff,null);
});
