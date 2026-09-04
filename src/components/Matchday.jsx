import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { formatMatchday, getDisplayedResult, getMatchConsequence, getMatchdayModel } from "../lib/matchday.js";
import "../matchday.css";

function MatchdayActions({ tournament, navigate }) {
  return <div className="md-actions">
    <button type="button" className="md-primary" onClick={() => navigate(`/tournaments/${tournament.id}#playoffs`)}>Открыть сетку</button>
    <button type="button" className="md-link" onClick={() => navigate("/broadcasts")}>Трансляции <ArrowRight aria-hidden="true" /></button>
  </div>;
}

function Result({ match, matches, compact = false }) {
  const result = getDisplayedResult(match);
  const consequence = getMatchConsequence(match, matches);
  const label = match.status === "walkover" ? "Техническая победа" : match.status === "bye" ? "Победа без игры" : "Завершён";
  return <article className={`md-result${compact ? " md-result--compact" : ""}`} aria-label={`${result.first} ${result.score1 ?? "—"}:${result.score2 ?? "—"} ${result.second}`}>
    <div className="md-result-meta"><h3>{match.roundTitle}</h3><span>{label}{match.bestOf ? ` · ${match.bestOf}` : ""} <Check aria-hidden="true" /></span></div>
    <div className="md-result-scoreboard">
      <div className={`md-result-team md-result-team--first${result.winner === result.first ? " is-winner" : ""}`}>
        {result.winner === result.first && <Check className="md-winner-mark" aria-hidden="true" />}
        <strong>{result.first}</strong>
        {result.first === "bobr1ki" && <small>RSATU на FACEIT</small>}
      </div>
      <div className="md-series" aria-label={`Счёт ${result.score1 ?? "не опубликован"}:${result.score2 ?? "не опубликован"}`}>
        <span className="md-series-first">{result.score1 ?? "—"}</span><span className="md-series-separator">:</span><span className="md-series-second">{result.score2 ?? "—"}</span>
      </div>
      <div className="md-result-team md-result-team--second"><strong>{result.second}</strong></div>
      <div className="md-maps">{result.maps.length > 0 ? result.maps.map((map) => <span key={map.name}>{map.name} <b>{map.score1}:{map.score2}</b></span>) : <span>{match.status === "completed" ? "Счёт карт не опубликован" : label}</span>}</div>
    </div>
    {consequence && <p className="md-consequence"><strong>{result.winner}</strong>{consequence.slice(result.winner.length)}</p>}
  </article>;
}

function ScheduledMatch({ match, tournament, matches, navigate }) {
  return <article className="md-scheduled">
    <div className="md-scheduled-heading"><h2>{match.roundTitle}</h2><p>{formatMatchday(match.date, true)}{match.bestOf && <span> · {match.bestOf}</span>}</p><p className="md-muted">{match.time || "Время уточняется"}</p></div>
    <div className="md-versus">
      {[match.team1, match.team2].map((team, index) => <div className={`md-contender md-contender--${index + 1}`} key={`${index}-${team}`}>
        {tournament.teamLogos?.[team] && <img src={tournament.teamLogos[team]} alt="" />}
        <strong>{team || "Соперник уточняется"}</strong>
      </div>)}
      <span className="md-vs" aria-label="против">VS</span>
    </div>
    {getMatchConsequence(match, matches) && <p className="md-next-consequence">{getMatchConsequence(match, matches)}</p>}
    <MatchdayActions tournament={tournament} navigate={navigate} />
  </article>;
}

export function MatchdayPage({ tournament, navigate }) {
  const model = useMemo(() => getMatchdayModel(tournament), [tournament]);
  const readDate = () => {
    const date = new URLSearchParams(window.location.search).get("date");
    return model.days.some((day) => day.date === date) ? date : model.defaultDate;
  };
  const [selectedDate, setSelectedDate] = useState(readDate);
  const tabRefs = useRef([]);
  useEffect(() => {
    const onPopState = () => setSelectedDate(readDate());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [model]);
  const selectDate = (date) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const day = model.days.find((candidate) => candidate.date === selectedDate) || model.days[0];
  const latestResults = model.days.filter((candidate) => candidate.date < day?.date && candidate.completed.length).at(-1);
  const following = model.days.find((candidate) => candidate.date > day?.date && candidate.scheduled.length);
  const title = day ? `${formatMatchday(day.date)} · ${day.label}` : "Матчи ещё не опубликованы";
  return <main className="matchday">
    <div className="md-container">
      <div className="md-page-heading"><div><h1>Matchday</h1><p>CS2 · YCS’26</p></div><button className="md-link md-desktop-link" type="button" onClick={() => navigate(`/tournaments/${tournament.id}#playoffs`)}>К сетке турнира <ArrowRight aria-hidden="true" /></button></div>
      <button className="md-link md-back" type="button" onClick={() => navigate(`/tournaments/${tournament.id}`)}><ArrowLeft aria-hidden="true" /> Турнир CS2</button>
      <div className="md-days" role="tablist" aria-label="Игровой день">
        {model.days.map((item, index) => <button type="button" role="tab" id={`md-tab-${item.date}`} aria-controls="md-day-panel" aria-selected={day?.date === item.date} tabIndex={day?.date === item.date ? 0 : -1} key={item.date} ref={(node) => { tabRefs.current[index] = node; }} onClick={() => selectDate(item.date)} onKeyDown={(event) => {
          let next;
          if (event.key === "ArrowRight") next = (index + 1) % model.days.length;
          if (event.key === "ArrowLeft") next = (index - 1 + model.days.length) % model.days.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = model.days.length - 1;
          if (next !== undefined) { event.preventDefault(); selectDate(model.days[next].date); tabRefs.current[next]?.focus(); }
        }}><strong>{formatMatchday(item.date)}</strong><span>{item.label}</span></button>)}
      </div>
      {day ? <section id="md-day-panel" role="tabpanel" aria-labelledby={`md-tab-${day.date}`} tabIndex={0} className="md-day-panel">
        <p className="sr-only" aria-live="polite">{title}</p>
        {day.scheduled.map((match) => <ScheduledMatch key={match.id} match={match} tournament={tournament} matches={model.matches} navigate={navigate} />)}
        {day.completed.map((match) => <Result key={match.id} match={match} matches={model.matches} />)}
        {day.scheduled.length > 0 && latestResults && <section className="md-recent" aria-labelledby="md-recent-title"><h2 id="md-recent-title">Итоги {formatMatchday(latestResults.date)}</h2>{latestResults.completed.map((match) => <Result key={match.id} match={match} matches={model.matches} compact />)}</section>}
        {day.scheduled.length === 0 && following && <section className="md-next"><div><p>Следующий матч · {formatMatchday(following.date)}{following.scheduled[0].bestOf && ` · ${following.scheduled[0].bestOf}`}</p><h2>{following.scheduled[0].team1} — {following.scheduled[0].team2}</h2><span>{following.scheduled[0].time || "Время уточняется"}</span></div><MatchdayActions tournament={tournament} navigate={navigate} /></section>}
        {day.scheduled.length === 0 && !following && <div className="md-last-actions"><MatchdayActions tournament={tournament} navigate={navigate} /></div>}
      </section> : <section className="md-empty"><h2>Матчи ещё не опубликованы</h2><button className="md-link" type="button" onClick={() => navigate(`/tournaments/${tournament.id}`)}>На страницу турнира <ArrowRight aria-hidden="true" /></button></section>}
      <footer className="md-partners" aria-label="Партнёры турнира"><span>При поддержке</span><div>{tournament.matchday.partners.map((partner) => <div key={partner.name}>{partner.logo ? <img src={partner.logo} alt={partner.name} /> : <span title={partner.role}>{partner.name}</span>}</div>)}</div></footer>
    </div>
  </main>;
}
