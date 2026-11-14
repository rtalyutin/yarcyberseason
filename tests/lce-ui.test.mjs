import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {createServer} from 'vite';
import baseline from '../src/data/tournaments/cs2-lce-november-2026.json' with {type:'json'};
import {deriveLce} from '../src/lib/lce-tournament.js';
import {emptyLce} from '../backend/lce-results-service.mjs';

test('organizer loads thirteen rows, locks playoff slots, preserves invalid input and retries the same request after network failure', async()=>{
  const vite=await createServer({configFile:false,esbuild:{jsx:'automatic'},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,preTransformRequests:false},appType:'custom'});
  const previous=globalThis.IS_REACT_ACT_ENVIRONMENT;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  let renderer;
  try{
    const {default:OrganizerLce}=await vite.ssrLoadModule('/src/components/OrganizerLce.jsx');
    const state=deriveLce(baseline,emptyLce()),writes=[];let failure=true;
    const api=async(path,options)=>{assert.equal(path,'lce-results');assert.equal(options.token,'test-token');if(options.body){writes.push(options.body);if(failure)throw new Error('Сеть недоступна');}return state;};
    await act(async()=>{renderer=TestRenderer.create(React.createElement(OrganizerLce,{token:'test-token',api,onSessionExpired:()=>assert.fail('unexpected expiry')}));});
    const rows=renderer.root.findAllByType('tr').slice(1);assert.equal(rows.length,13);
    assert.equal(rows.filter(r=>r.findByType('fieldset').props.disabled).length,3);
    const fields=rows[0].findAllByType('input').filter(i=>i.props.type==='number');
    await act(async()=>{fields[0].props.onChange({target:{value:'13'}});fields[1].props.onChange({target:{value:'9'}});});
    const save=()=>rows[0].findAllByType('button')[0].props.onClick();
    await act(async()=>{await save();});
    assert.equal(fields[0].props.value,'13');assert.equal(fields[1].props.value,'9');assert.equal(rows[0].findByProps({role:'alert'}).children.join(''),'Сеть недоступна');
    failure=false;await act(async()=>{await save();});
    assert.deepEqual(writes[0],writes[1]);assert.equal(writes[0].result.maps[0].score1,13);assert.equal(writes[0].result.maps[0].score2,9);
  }finally{if(renderer)await act(async()=>renderer.unmount());globalThis.IS_REACT_ACT_ENVIRONMENT=previous;await vite.close();}
});
test('public client keeps a confirmed revision on outage, stale response and conflicting same-revision payload',async()=>{
  const vite=await createServer({configFile:false,esbuild:{jsx:'automatic'},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,preTransformRequests:false,hmr:false},appType:'custom'});
  try{
    const {refreshLceResults}=await vite.ssrLoadModule('/src/lib/lce-results-client.js');
    const {getTournament}=await vite.ssrLoadModule('/src/data/tournaments/index.js');
    const value=deriveLce(baseline,{...emptyLce(),revision:1,updatedAt:'2026-11-14T10:00:00Z'});
    assert.equal((await refreshLceResults(async()=>({ok:true,json:async()=>value}))).availability,'current');
    assert.equal((await refreshLceResults(async()=>{throw new Error('offline');})).revision,1);
    assert.equal((await refreshLceResults(async()=>({ok:true,json:async()=>({...value,revision:0,updatedAt:null})}))).availability,'unavailable');
    const bad=structuredClone(value);bad.tournament.status='completed';
    assert.equal((await refreshLceResults(async()=>({ok:true,json:async()=>bad}))).availability,'unavailable');
    assert.equal(getTournament(baseline.slug).status,'upcoming');
  }finally{await vite.close();}
});

test('runtime results keep current team names and logos without changing scores', async()=>{
  const vite=await createServer({configFile:false,server:{middlewareMode:true,preTransformRequests:false,hmr:false},appType:'custom'});
  try {
    const {updateLceTournament,getTournament}=await vite.ssrLoadModule('/src/data/tournaments/index.js');
    const snapshot=structuredClone(baseline);
    const old='Миссклик (Missclick)';
    snapshot.participants[1].displayName=old;
    const match=snapshot.stages[1].matches[0];
    match.team2=old;match.score1=13;match.score2=7;match.status='completed';
    snapshot.stages[0].groups[0].rows[1].team=old;
    snapshot.teamLogos={[old]:'/old-logo.png'};
    updateLceTournament(snapshot);
    const current=getTournament(baseline.slug);
    assert.equal(current.participants[1].displayName,'Missclick');
    assert.equal(current.stages[1].matches[0].team2,'Missclick');
    assert.equal(current.stages[0].groups[0].rows[1].team,'Missclick');
    assert.equal(current.teamLogos.Missclick,baseline.teamLogos.Missclick);
    assert.equal(current.stages[1].matches[0].score1,13);
    assert.equal(current.stages[1].matches[0].score2,7);
    assert.equal(current.stages[1].matches[0].status,'completed');
    assert.equal(snapshot.stages[1].matches[0].team2,old);
  } finally {await vite.close();}
});
