/** DEMO_V1: full rounds, equal losses, no rematches, smaller ID wins. */
export function pairGroup(group, played, tick = () => {}) {
  const ids = group.map(t => t.id).sort((a,b)=>a-b);
  const rank = new Map([...group].sort((a,b)=>a.byes-b.byes || b.id-a.id).map((t,i)=>[t.id,i]));
  const memo = new Map();
  const compare = (a,b) => { for(let i=0;i<Math.min(a.length,b.length);i++){if(a[i]!==b[i])return a[i]-b[i];}return a.length-b.length; };
  const score = s => [-s.pairs.length,...s.byes.map(i=>rank.get(i)).sort((a,b)=>a-b),...s.pairs.flat()];
  function solve(rest) {
    tick();
    if(!rest.length)return {pairs:[],byes:[]};
    const key=rest.join(',');if(memo.has(key))return memo.get(key);
    const [a,...tail]=rest;
    // Try paired branches first; the first perfect matching is lexicographically minimal.
    let best=null;
    for(let j=0;j<tail.length;j++){
      const b=tail[j];if(played.has(`${a}:${b}`))continue;
      const sub=solve(tail.filter((_,i)=>i!==j));
      const candidate={pairs:[[a,b],...sub.pairs],byes:sub.byes};
      if(!best || compare(score(candidate),score(best))<0)best=candidate;
      if(best.byes.length===0){memo.set(key,best);return best;}
    }
    const sub=solve(tail),skip={pairs:sub.pairs,byes:[a,...sub.byes]};
    if(!best || compare(score(skip),score(best))<0)best=skip;
    memo.set(key,best);return best;
  }
  return solve(ids);
}
export function simulate(config, {maxOperations=250000}={}) {
  const {n,winLimit,lossLimit}=config;
  const empty={config,profile:'DEMO_V1',rounds:[],teams:[],total:0,playoff:null};
  if(![n,winLimit,lossLimit].every(Number.isSafeInteger)||n<8||winLimit<1||lossLimit<1)
    return {...empty,status:'INVALID_INPUT'};
  // Resource bounds are a distinct computation failure, never an altered tournament rule.
  if(n>10000)return {...empty,status:'RESOURCE_LIMIT'};
  let operations=0;
  const tick=()=>{if(++operations>maxOperations)throw new Error('RESOURCE_LIMIT');};
  let teams=Array.from({length:n},(_,i)=>({id:i+1,wins:0,losses:0,byes:0,status:'ACTIVE'}));
  const played=new Set(),rounds=[];
  const result=(status,reason=null)=>({config,profile:'DEMO_V1',teams,rounds,total:rounds.reduce((s,r)=>s+r.matches.length,0),status,reason,playoff:status==='COMPLETED'?teams.filter(t=>t.status.startsWith('QUALIFIED')).map(t=>t.id):null});
  try {
    while(true){
      tick();
      const active=teams.filter(t=>t.status==='ACTIVE'),q=teams.filter(t=>t.status.startsWith('QUALIFIED'));
      const remaining=active.length+q.length;
      if(q.length>8)return result('RULE_CONFLICT','TOO_MANY_QUALIFIED');
      if(remaining<8)return result('RULE_CONFLICT','TOO_FEW_REMAINING');
      if(remaining===8 || q.length===8){
        teams=teams.map(t=>t.status==='ACTIVE'?{...t,status:remaining===8?'QUALIFIED_REMAINING':'NOT_SELECTED'}:t);
        return result('COMPLETED');
      }
      const pairs=[],byeIds=[];
      for(const losses of [...new Set(active.map(t=>t.losses))].sort((a,b)=>a-b)){
        const draw=pairGroup(active.filter(t=>t.losses===losses),played,tick);
        pairs.push(...draw.pairs);byeIds.push(...draw.byes);
      }
      if(!pairs.length)return result('STALLED','NO_LEGAL_PAIRS');
      const before=teams.map(t=>({...t})),matches=[];
      for(const [a,b] of pairs){
        const w=teams[a-1],l=teams[b-1];
        teams[a-1]={...w,wins:w.wins+1,status:w.wins+1===winLimit?'QUALIFIED_WINS':'ACTIVE'};
        teams[b-1]={...l,losses:l.losses+1,status:l.losses+1===lossLimit?'ELIMINATED':'ACTIVE'};
        played.add(`${a}:${b}`);
        matches.push({winner:a,loser:b,losses_before:w.losses,winner_after:{...teams[a-1]},loser_after:{...teams[b-1]}});
      }
      for(const id of byeIds)teams[id-1]={...teams[id-1],byes:teams[id-1].byes+1};
      rounds.push({round:rounds.length+1,matches,byes:byeIds.map(id=>({...teams[id-1],team:id})),before,after:teams.map(t=>({...t})),remaining:teams.filter(t=>t.status!=='ELIMINATED').map(t=>t.id),eliminated:matches.filter(m=>m.loser_after.status==='ELIMINATED').map(m=>m.loser),qualified:matches.filter(m=>m.winner_after.status==='QUALIFIED_WINS').map(m=>m.winner)});
    }
  }catch(error){if(error.message==='RESOURCE_LIMIT'||error instanceof RangeError)return result('RESOURCE_LIMIT');throw error;}
}
