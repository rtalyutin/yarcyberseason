import { InternalLink, TeamLink, MatchLink } from './CommunityLinks.jsx';
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { formatMatchday, getDisplayedResult, getMatchConsequence, getMatchdayModel, getPreviousMatchday } from "../lib/matchday.js";
import { isArchive } from "../lib/tournament.js";
import { community } from '../data/community.js';
import { getMatchPartners, getOfficialSupport } from '../data/project-content.js';
import { matchDateLabel, safeHttps } from '../lib/community.js';
import { BroadcastActions, MatchCasters } from './BroadcastLinks.jsx';
import "../matchday.css";

const bracketRoute = (tournament) => `/tournaments/${tournament.slug || tournament.id}#${/dota/i.test(tournament.discipline) && !isArchive(tournament) ? 'swiss' : 'playoffs'}`;
const teamLogo = (tournament, name) => tournament.teamLogos?.[name] || community.resolveTeam(tournament.id, name)?.logo;

function PartnerIdentity({ partner }) {
  const content = partner.logoUrl || partner.logo ? <img src={partner.logoUrl || partner.logo} alt={partner.name} /> : <span title={partner.role}>{partner.shortName || partner.name}</span>;
  const url = safeHttps(partner.url);
  return url ? <a href={url} target="_blank" rel="noreferrer">{content}</a> : content;
}

function MatchPartners({ tournament, match }) {
  const partners = getMatchPartners(tournament, match);
  if (!partners.length) return null;
  return <div className="md-match-partners" aria-label="Партнёры матча"><span>Партнёры матча</span><div>{partners.map((partner) => <div key={partner.id || partner.name}><PartnerIdentity partner={partner} /></div>)}</div></div>;
}

function MatchdayActions({ tournament }) {
  return <div className="md-actions">
    <InternalLink className="md-primary" href={bracketRoute(tournament)}>Открыть сетку</InternalLink>
    <InternalLink className="md-link" href="/broadcasts">Трансляции <ArrowRight aria-hidden="true" /></InternalLink>
  </div>;
}

function Result({ match, matches, tournament, compact = false }) {
  const result = getDisplayedResult(match, { winnerFirst: false, discipline: tournament.discipline });
  const consequence = getMatchConsequence(match, matches);
  const label = match.status === "walkover" ? "Техническая победа" : match.status === "bye" ? "Победа без игры" : "Завершён";
  return <article className={`md-result${compact ? " md-result--compact" : ""}`} data-match-id={match.id} aria-label={`${result.first} ${result.score1 ?? "—"}:${result.score2 ?? "—"} ${result.second}`}>
    <div className="md-result-meta"><h3>{match.roundTitle}</h3><span>{label}{match.bestOf ? ` · ${match.bestOf}` : ""} <Check aria-hidden="true" /></span></div>
    <p className="md-result-date">{matchDateLabel(match)}</p>
    <div className="md-result-scoreboard">
      <div className={`md-result-team md-result-team--first${result.winner === result.first ? " is-winner" : ""}`}>
        {teamLogo(tournament, result.first) && <img className="md-team-logo" src={teamLogo(tournament, result.first)} alt="" />}
        <strong><TeamLink tournamentId={tournament.id} name={result.first} /></strong>
        {tournament.discipline === 'Counter-Strike 2' && result.first === "bobr1ki" && <small>RSATU на FACEIT</small>}
      </div>
      <div className="md-series" aria-label={`Счёт ${result.score1 ?? "не опубликован"}:${result.score2 ?? "не опубликован"}`}>
        <span className={`md-series-first${result.winner === result.first ? " is-winner" : ""}`}>{result.score1 ?? "—"}</span><span className="md-series-separator">:</span><span className={`md-series-second${result.winner === result.second ? " is-winner" : ""}`}>{result.score2 ?? "—"}</span>
      </div>
      <div className={`md-result-team md-result-team--second${result.winner === result.second ? " is-winner" : ""}`}><strong><TeamLink tournamentId={tournament.id} name={result.second} /></strong>{teamLogo(tournament, result.second) && <img className="md-team-logo" src={teamLogo(tournament, result.second)} alt="" />}</div>
      <div className="md-maps">{result.maps.length > 0 ? result.maps.map((map) => <span key={map.name}>{map.name} <b>{map.score1}:{map.score2}</b></span>) : <span>{match.status === "completed" ? "Счёт карт не опубликован" : label}</span>}</div>
    </div>
    <MatchLink tournamentId={tournament.id} matchId={match.id} />
    {safeHttps(match.replayUrl) && <a className="md-link" href={safeHttps(match.replayUrl)} target="_blank" rel="noreferrer">Запись матча <ArrowRight aria-hidden="true" /></a>}
    <BroadcastActions match={match} />
    <MatchCasters match={match} />
    <MatchPartners tournament={tournament} match={match} />
    {consequence && <p className="md-consequence"><strong>{result.winner}</strong>{consequence.slice(result.winner.length)}</p>}
  </article>;
}

function ScheduledMatch({ match, tournament, matches }) {
  const status = ['completed', 'walkover', 'bye'].includes(match.status) ? 'Итог уточняется'
    : match.status === 'live' ? 'LIVE' : match.status === 'cancelled' ? 'Матч отменён'
      : match.status === 'postponed' ? 'Матч перенесён' : 'Матч назначен';
  return <article className="md-scheduled" data-match-id={match.id}>
    <div className="md-scheduled-heading"><h2>{match.roundTitle}</h2><p>{matchDateLabel(match)}{match.bestOf && <span> · {match.bestOf}</span>}</p><p className="md-muted">{status}{!match.time && !match.scheduledAt && ' · Время уточняется'}</p></div>
    <div className="md-versus">
      {[match.team1, match.team2].map((team, index) => <div className={`md-contender md-contender--${index + 1}`} key={`${index}-${team}`}>
        {teamLogo(tournament, team) && <img src={teamLogo(tournament, team)} alt="" />}
        <strong><TeamLink tournamentId={tournament.id} name={team} /></strong>
      </div>)}
      <span className="md-vs" aria-label="против">VS</span>
    </div>
    {getMatchConsequence(match, matches) && <p className="md-next-consequence">{getMatchConsequence(match, matches)}</p>}
    <MatchLink tournamentId={tournament.id} matchId={match.id} />
    <BroadcastActions match={match} />
    <MatchCasters match={match} />
    <MatchPartners tournament={tournament} match={match} />
    <MatchdayActions tournament={tournament} />
  </article>;
}

export function MatchdayPage({ tournament, navigate }) {
  const model = useMemo(() => getMatchdayModel(tournament), [tournament]);
  const readDate = () => {
    const date = new URLSearchParams(window.location.search).get("date");
    return model.days.some((day) => day.date === date) ? date : model.defaultDate;
  };
  const [selectedDate, setSelectedDate] = useState(model.defaultDate);
  const tabRefs = useRef([]);
  const archived = isArchive(tournament);
  useEffect(() => {
    const sync = () => setSelectedDate(readDate());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [model]);
  useEffect(() => {
    const index = model.days.findIndex((day) => day.date === selectedDate);
    const tab = tabRefs.current[index];
    if (tab && archived) tab.parentElement.scrollLeft = tab.offsetLeft - tab.parentElement.offsetLeft;
  }, [selectedDate, model, archived]);
  const selectDate = (date) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const day = model.days.find((candidate) => candidate.date === selectedDate) || model.days[0];
  const latestResults = getPreviousMatchday(model, day?.date);
  const dayIndex = model.days.indexOf(day);
  const following = model.days.slice(dayIndex + 1).find((candidate) => candidate.scheduled.length);
  const title = day ? `${day.dateLabel} · ${day.label}` : "Матчи ещё не опубликованы";
  const support = getOfficialSupport(tournament);
  const footerPartners = support.length ? support : tournament.matchday?.partners || [];
  return <main className="matchday">
    <div className="md-container">
      <div className="md-page-heading"><div><h1>Matchday</h1><p>{tournament.title}{archived ? " · Турнир завершён" : ""}</p></div><InternalLink className="md-link md-desktop-link" href={bracketRoute(tournament)}>К сетке турнира <ArrowRight aria-hidden="true" /></InternalLink></div>
      <InternalLink className="md-link md-back" href={`/tournaments/${tournament.id}`}><ArrowLeft aria-hidden="true" /> {archived ? "Итоги турнира" : tournament.title}</InternalLink>
      <div className={`md-days${archived ? " md-days--archive" : ""}`} role="tablist" aria-label="Игровой день">
        {model.days.map((item, index) => <button type="button" role="tab" id={`md-tab-${item.date}`} aria-controls="md-day-panel" aria-selected={day?.date === item.date} tabIndex={day?.date === item.date ? 0 : -1} key={item.date} ref={(node) => { tabRefs.current[index] = node; }} onClick={() => selectDate(item.date)} onKeyDown={(event) => {
          let next;
          if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % model.days.length;
          if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index - 1 + model.days.length) % model.days.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = model.days.length - 1;
          if (next !== undefined) { event.preventDefault(); selectDate(model.days[next].date); tabRefs.current[next]?.focus(); }
        }}><strong>{item.dateLabel}</strong><span>{item.label}</span></button>)}
      </div>
      {day ? <section id="md-day-panel" role="tabpanel" aria-labelledby={`md-tab-${day.date}`} tabIndex={0} className="md-day-panel">
        <p className="sr-only" aria-live="polite">{title}</p>
        {day.scheduled.map((match) => <ScheduledMatch key={match.id} match={match} tournament={tournament} matches={model.matches} />)}
        {day.completed.map((match) => <Result key={match.id} match={match} matches={model.matches} tournament={tournament} />)}
        {day.scheduled.length === 0 && following && <section className="md-next"><div><p>Следующий матч · {following.dateLabel}{following.scheduled[0].bestOf && ` · ${following.scheduled[0].bestOf}`}</p><h2>{following.scheduled[0].team1} — {following.scheduled[0].team2}</h2><span>{following.scheduled[0].time ? `${following.scheduled[0].time} МСК` : "Время уточняется"}</span></div><MatchdayActions tournament={tournament} /></section>}
        {day.scheduled.length === 0 && !following && <div className="md-last-actions"><MatchdayActions tournament={tournament} /></div>}
        {latestResults && <section className="md-recent" aria-labelledby="md-recent-title" data-previous-date={latestResults.date}><div className="md-recent-heading"><div><p>Предыдущий игровой день</p><h2 id="md-recent-title">Итоги {formatMatchday(latestResults.date)}</h2></div>{model.days.some((item) => item.date === latestResults.date) && <button className="md-link" type="button" onClick={() => selectDate(latestResults.date)}>Открыть день <ArrowRight aria-hidden="true" /></button>}</div>{latestResults.completed.map((match) => <Result key={match.id} match={match} matches={model.matches} tournament={tournament} compact />)}</section>}
      </section> : <section className="md-empty"><h2>Матчи ещё не опубликованы</h2><InternalLink className="md-link" href={`/tournaments/${tournament.id}`}>На страницу турнира <ArrowRight aria-hidden="true" /></InternalLink></section>}
      {footerPartners.length > 0 && <footer className="md-partners" aria-label="При поддержке"><span>При поддержке</span><div>{footerPartners.map((partner) => <div key={partner.id || partner.name}><PartnerIdentity partner={partner} /></div>)}</div></footer>}
    </div>
  </main>;
}
