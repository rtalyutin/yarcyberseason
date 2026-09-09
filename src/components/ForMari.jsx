import React, {useState,useEffect} from 'react';
import '../for-mari.css';
const initial=[{n:'16',winLimit:'4',lossLimit:'3'},{n:'18',winLimit:'4',lossLimit:'3'}];
const record=t=>`${t.wins}–${t.losses}`;
const names=ids=>ids.length?ids.map(i=>`К${i}`).join(', '):'Нет';
const reasons={INVALID_INPUT:'Введите целое число команд от 8 и целые пороги от 1.',TOO_MANY_QUALIFIED:'Порог побед достигли более восьми команд. Восемь мест не вмещают всех прошедших.',TOO_FEW_REMAINING:'После полного тура осталось меньше восьми команд. Эти настройки не дают восьмёрку.',NO_LEGAL_PAIRS:'Допустимых пар больше нет, а восьмёрка ещё не определена. Пропуски не изменят счёт.',RESOURCE_LIMIT:'Расчёт слишком сложен для текущего лимита. Попробуйте меньше команд или другие пороги. Это не означает, что турнир невозможен.'};
function Case({item,round,index}){
 const current=item.rounds[round-1],completed=item.status==='COMPLETED',atEnd=!current||round===item.rounds.length;
 const peak=Math.max(1,...item.rounds.map(r=>r.matches.length));
 return <section className={`fm-case ${index?'fm-case-18':''}`}>
 <header className="fm-case-head"><div><span className="fm-eyebrow">СЦЕНАРИЙ {index?'Б':'А'}</span><h2>{item.config.n} команд</h2><p className="fm-meta">Выход: {item.config.winLimit} побед · выбывание: {item.config.lossLimit} поражений</p></div><div className="fm-total"><strong>{item.total}</strong><span>{completed?'матчей':'матчей до остановки'} · {item.rounds.length} туров</span></div></header>
 {item.rounds.length>0&&<div className="fm-bars" aria-label="Матчи по турам">{item.rounds.map(r=><div key={r.round} className={r.round===round?'active':''} style={{'--bar':`${r.matches.length/peak*100}%`}}><span>{r.matches.length}</span><i/><small>Т{r.round}</small></div>)}</div>}
 {!completed&&<p className="fm-error" role="status">{reasons[item.reason||item.status]}</p>}
 {current?<div key={round} className="fm-round"><div className="fm-round-title"><h3>Тур {round}</h3><span>{current.matches.length} матчей · не выбыли {current.remaining.length}</span></div><div className="fm-table-head"><span>Пара · счёт после матча</span><span>Поражений до</span></div>{current.matches.map((m,i)=><div className="fm-match" key={`${m.winner}-${m.loser}`} style={{'--delay':`${Math.min(i,10)*24}ms`}}><div className="fm-pair"><span className="fm-winner">К{m.winner} <small>{record(m.winner_after)}</small><b title={m.winner_after.status==='QUALIFIED_WINS'?'Выход в плей-офф':'Победа'}>{m.winner_after.status==='QUALIFIED_WINS'?'↑':'✓'}</b></span><span className="fm-vs">vs</span><span className={m.loser_after.status==='ELIMINATED'?'fm-out':''}>К{m.loser} <small>{record(m.loser_after)}</small>{m.loser_after.status==='ELIMINATED'&&<b title="Выбывание">×</b>}</span></div><span className="fm-loss">{m.losses_before}</span></div>)}<div className="fm-note"><b>Пропускают</b><span>{current.byes.length?current.byes.map(t=>`К${t.id} (${record(t)})`).join(', ')+' — счёт не меняется':'Нет'}</span></div><div className="fm-note"><b>Прошли по победам</b><span>{names(current.qualified)}</span></div><div className="fm-note"><b>Выбыли</b><span>{names(current.eliminated)}</span></div></div>:completed?<div className="fm-finished"><span>✓</span><h3>Отбор завершён</h3><p>{item.rounds.length?`Восьмёрка определена. Сыграно туров: ${item.rounds.length}.`:'Все восемь проходят без матчей.'}</p></div>:null}
 {completed&&atEnd&&<div className="fm-qualified"><b>8 команд в плей-офф</b><div>{item.playoff.map(id=>{const t=item.teams[id-1];return <span key={id} title={t.status==='QUALIFIED_WINS'?'По порогу побед':'По оставшейся восьмёрке'}>К{id} · {record(t)} {t.status==='QUALIFIED_WINS'?'↑':''}</span>;})}</div><p>↑ по порогу побед · остальные — по оставшейся восьмёрке</p></div>}
 </section>;
}
export default function ForMari(){
 const [draft,setDraft]=useState(initial),[configs,setConfigs]=useState(()=>initial.map(c=>Object.fromEntries(Object.entries(c).map(([k,v])=>[k,Number(v)])))),[results,setResults]=useState(null),[round,setRound]=useState(1),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
 useEffect(()=>{document.title='Симулятор Swiss — ЯрКиберСезон';},[]);
 useEffect(()=>{
  let active=true;setResults(null);setError('');
  let worker;
  try{worker=new Worker(new URL('../lib/swissSimulator.worker.js',import.meta.url),{type:'module'});}catch{setError('Не удалось запустить расчёт. Перезагрузите страницу.');return;}
  const timer=setTimeout(()=>{if(active){worker.terminate();setError('Расчёт превысил время ожидания. Попробуйте меньше команд или другие пороги.');}},8000);
  worker.onmessage=({data})=>{if(!active)return;clearTimeout(timer);if(data.error)setError('Не удалось выполнить расчёт.');else setResults(data.results);worker.terminate();};
  worker.onerror=()=>{if(active){clearTimeout(timer);setError('Не удалось загрузить расчёт. Перезагрузите страницу.');worker.terminate();}};
  worker.postMessage(configs);
  return()=>{active=false;clearTimeout(timer);worker.terminate();};
 },[configs]);
 const submit=e=>{e.preventDefault();setResults(null);setDirty(false);setRound(1);setConfigs(draft.map(c=>Object.fromEntries(Object.entries(c).map(([k,v])=>[k,Number(v)]))));};
 const visible=dirty?null:results,totalRounds=visible?Math.max(...visible.map(c=>c.rounds.length)):0;
 const both=visible?.every(c=>c.status==='COMPLETED');
 return <main className="for-mari"><div className="fm-shell"><nav className="fm-top"><a href="/">← ЯрКиберСезон</a><span>ДЛЯ МАРИ · СИМУЛЯТОР</span></nav><header className="fm-intro"><h1>Сравним форматы.<br/><em>По вашим правилам.</em></h1><p>Пары — по поражениям. В плей-офф — восемь команд. Задайте параметры двух сценариев.</p></header>
 <form className="fm-form" onSubmit={submit}><div className="fm-grid">{draft.map((c,i)=><fieldset key={i}><legend>Сценарий {i?'Б':'А'}</legend><div className="fm-fields">{[['n','Команды',8],['winLimit','Побед для выхода',1],['lossLimit','Поражений до выбывания',1]].map(([key,label,min])=><label key={key}>{label}<input type="number" required min={min} step="1" value={c[key]} onChange={e=>{const value=e.target.value;setDraft(old=>old.map((x,j)=>i===j?{...x,[key]:value}:x));setDirty(true);}}/></label>)}</div></fieldset>)}</div><button className="fm-calculate" type="submit">Рассчитать сравнение</button></form>
 <div className="fm-rules"><span>Порог побед → выход и остановка</span><span>Порог поражений → выбывание</span><span>Нет пары → пропуск без результата</span><span>Осталось 8 с учётом прошедших → проходят все</span></div>
 {dirty?<p className="fm-status" role="status">Параметры изменены. Нажмите «Рассчитать сравнение».</p>:error?<p className="fm-error" role="alert">{error}</p>:!visible?<p className="fm-status" role="status">Рассчитываем пары и туры…</p>:<>
 {both&&<div className="fm-summary"><div><b>{visible[0].total} <small>матчей</small></b><span>Сценарий А · {visible[0].rounds.length} туров</span></div><div className="fm-delta">Б − А: {visible[1].total-visible[0].total>0?'+':''}{visible[1].total-visible[0].total} матчей<span>Туры: {visible[1].rounds.length-visible[0].rounds.length>0?'+':''}{visible[1].rounds.length-visible[0].rounds.length}</span></div><div><b>{visible[1].total} <small>матчей</small></b><span>Сценарий Б · {visible[1].rounds.length} туров</span></div></div>}
 {totalRounds>0&&<div className="fm-controls"><span>Выберите тур</span><div aria-label="Выбор тура">{Array.from({length:totalRounds},(_,i)=>i+1).map(n=><button type="button" key={n} aria-pressed={round===n} onClick={()=>setRound(n)}>Тур {n}</button>)}</div></div>}<div className="fm-grid">{visible.map((item,i)=><Case item={item} index={i} round={round} key={i}/>)}</div></>}
 <footer className="fm-footer"><p><b>Условный пример, не прогноз и не регламент действующего турнира.</b> В каждой паре побеждает команда с меньшим номером. Повторных встреч нет. Считаются полные туры; конфликтные настройки останавливают расчёт.</p><p>Счёт: победы–поражения после матча. ✓ победа · ↑ выход по победам · × выбывание. Плей-офф: 8 команд, double elimination; его матчи здесь не считаются.</p></footer></div></main>;
}
