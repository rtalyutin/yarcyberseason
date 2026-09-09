import React, { useState, useEffect } from 'react';
import data from '../data/swiss-fixture-example.json';
import '../for-mari.css';
const record = r => `${r.wins}–${r.losses}`;
function Case({ item, round }) {
  const current = item.rounds[round - 1];
  return <section className={`fm-case fm-case-${item.teams}`}>
    <header className="fm-case-head"><div><span className="fm-eyebrow">СЦЕНАРИЙ {item.teams === 16 ? 'А' : 'Б'}</span><h2>{item.teams} команд</h2></div><div className="fm-total"><strong>{item.total}</strong><span>матчей · {item.rounds.length} туров</span></div></header>
    <div className="fm-bars" aria-label="Матчи по турам">{item.rounds.map(r => <button key={r.round} tabIndex={-1} disabled className={r.round === round ? 'active' : ''} style={{'--bar':`${r.matches.length / 9 * 100}%`}}><span>{r.matches.length}</span><i/><small>Т{r.round}</small></button>)}</div>
    {current ? <div key={round} className="fm-round"><div className="fm-round-title"><h3>Тур {round}</h3><span>{current.matches.length} матчей · осталось {current.remaining.length}</span></div><div className="fm-table-head"><span>Пара и результат после матча</span><span>Поражений до</span></div>
      {current.matches.map((m,i) => <div className="fm-match" key={`${m.winner}-${m.loser}`} style={{'--delay':`${i * 24}ms`}}><div className="fm-pair"><span className="fm-winner">К{m.winner} <small>{record(m.winner_after)}</small><b aria-label="победа">✓</b></span><span className="fm-vs">vs</span><span className={m.loser_after.losses === 3 ? 'fm-out' : ''}>К{m.loser} <small>{record(m.loser_after)}</small>{m.loser_after.losses === 3 && <b aria-label="выбыла">×</b>}</span></div><span className="fm-loss">{m.losses_before}</span></div>)}
      <div className="fm-note"><b>Пропуск тура</b><span>{current.byes.length ? current.byes.map(b=>`К${b.team} (${record(b)})`).join(', ') : 'Нет'}{current.byes.length > 0 && ' — счёт не меняется'}</span></div>
      <div className="fm-note"><b>Выбыли</b><span>{current.eliminated.length ? current.eliminated.map(n=>`К${n}`).join(', ') : 'Никто'}</span></div>
    </div> : <div className="fm-finished"><span>✓</span><h3>Отбор завершён</h3><p>Восьмёрка определена после пятого тура.<br/>Дополнительных матчей нет.</p></div>}
    {(!current || round === item.rounds.length) && <div className="fm-qualified"><b>8 команд в плей-офф</b><div>{item.qualified.map(n=><span key={n}>К{n}</span>)}</div></div>}
  </section>;
}
export default function ForMari(){
 const [round,setRound]=useState(1);
 useEffect(()=>{document.title='Swiss: 16 и 18 команд — ЯрКиберСезон';},[]);
 return <main className="for-mari"><div className="fm-shell"><nav className="fm-top"><a href="/">← ЯрКиберСезон</a><span>ДЛЯ МАРИ · РАЗБОР ФОРМАТА</span></nav><header className="fm-intro"><span className="fm-eyebrow">ОДНИ ПРАВИЛА. ДВА РАЗМЕРА ТУРНИРА.</span><h1>16 или 18?<br/><em>Смотрим по турам.</em></h1><p>Пары собираются по одинаковому количеству поражений. Играем полные туры, пока не останется восемь команд.</p></header><div className="fm-rules"><span><b>3 поражения</b> → выбывание</span><span><b>Нет пары</b> → пропуск без результата</span><span><b>3 победы</b> → игра продолжается</span></div><div className="fm-summary"><div><b>36 <small>матчей</small></b><span>16 команд · 5 туров</span></div><div className="fm-delta">+6 матчей<span>и один тур</span></div><div><b>42 <small>матча</small></b><span>18 команд · 6 туров</span></div></div><div className="fm-controls"><span>Выберите тур</span><div aria-label="Выбор тура">{[1,2,3,4,5,6].map(n=><button type="button" key={n} aria-pressed={round===n} onClick={()=>setRound(n)}>Тур {n}</button>)}</div></div><div className="fm-grid">{data.cases.map(c=><Case key={c.teams} item={c} round={round}/>)}</div><footer className="fm-footer"><p><b>Условный пример, не прогноз и не регламент действующего турнира.</b> Для наглядности в каждой паре побеждает команда с меньшим номером. Повторных встреч нет. Числа 36 и 42 относятся к показанному расписанию.</p><p>К1–К18 — номера команд. Счёт рядом с командой: победы–поражения после матча. <span className="fm-winner">✓ победа</span> · <span className="fm-out">× третье поражение</span>. Плей-офф одинаковый: 8 команд, double elimination; его матчи здесь не считаются.</p></footer></div></main>;
}
