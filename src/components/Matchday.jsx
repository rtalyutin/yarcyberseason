import { InternalLink, TeamLink, MatchLink } from './CommunityLinks.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CaretLeft, CaretRight, TwitchLogo, UsersThree, TreeStructure } from '@phosphor-icons/react';
import { getDisplayedResult, getMatchConsequence, getMatchdayModel, isFinishedMatch } from '../lib/matchday.js';
import { isArchive } from '../lib/tournament.js';
import { community } from '../data/community.js';
import twitchAnalytics from '../data/twitch-analytics.json';
import { getMatchPartners, getOfficialSupport } from '../data/project-content.js';
import { exactStart, matchDateLabel, safeHttps } from '../lib/community.js';
import { BroadcastActions, MatchCasters } from './BroadcastLinks.jsx';
import '../matchday.css';

const tournamentRoute = (tournament) => `/tournaments/${tournament.slug || tournament.id}`;
const teamLogo = (tournament, name) => tournament.teamLogos?.[name] || community.resolveTeam(tournament.id, name)?.logo;
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
const validTime = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '');

function timeOf(match) {
  const start = exactStart(match.scheduledAt);
  if (start) return { label: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(new Date(start)), zone: 'МСК', dateTime: start };
  return validTime(match.time) ? { label: match.time, zone: 'Пояс не указан', dateTime: null } : { label: '—', zone: 'Время уточняется', dateTime: null };
}

function statusOf(match, discipline) {
  if (isFinishedMatch(match, discipline)) return match.status === 'walkover' ? 'Техническая победа' : match.status === 'bye' ? 'Победа без игры' : 'Завершён';
  return { live: 'Идёт', cancelled: 'Отменён', postponed: 'Перенесён', completed: 'Итог уточняется', walkover: 'Итог уточняется', bye: 'Итог уточняется', scheduled: 'Ожидается' }[match.status] || 'Статус уточняется';
}

function dayHeading(day) {
  if (!day) return 'Расписание ещё не опубликовано';
  if (!validDate(day.date)) return day.dateLabel;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`));
}

function PartnerIdentity({ partner }) {
  const content = partner.logoUrl || partner.logo ? <img src={partner.logoUrl || partner.logo} alt={partner.name} loading="lazy" /> : <span title={partner.role}>{partner.shortName || partner.name}</span>;
  const url = safeHttps(partner.url);
  return url ? <a href={url} target="_blank" rel="noreferrer">{content}</a> : content;
}

function MatchPartners({ tournament, match }) {
  const partners = getMatchPartners(tournament, match);
  if (!partners.length) return null;
  return <div className="md2-match-partners" aria-label="Партнёры матча"><span>Партнёры матча</span><div>{partners.map((partner) => <div key={partner.id || partner.name}><PartnerIdentity partner={partner} /></div>)}</div></div>;
}

function TeamIdentity({ tournament, name, winner, side }) {
  const logo = teamLogo(tournament, name);
  return <div className={`md2-team md2-team--${side}${winner ? ' is-winner' : ''}`}>
    <span className="md2-crest" aria-hidden="true">{logo ? <img src={logo} alt="" loading="lazy" /> : <span>{name ? name.trim().slice(0, 1) : '?'}</span>}</span>
    <strong><TeamLink tournamentId={tournament.id} name={name} /></strong>
  </div>;
}

function ProgramMatch({ match, tournament, matches }) {
  const finished = isFinishedMatch(match, tournament.discipline);
  const result = getDisplayedResult(match, { winnerFirst: false, discipline: tournament.discipline });
  const time = timeOf(match);
  const live = match.status === 'live';
  const consequence = getMatchConsequence(match, matches);
  const pendingResult = !finished && ['completed', 'walkover', 'bye'].includes(match.status);
  const technical = ['walkover', 'bye'].includes(match.status);
  const scoreKnown = finished && result.score1 !== null && result.score2 !== null;
  const replay = safeHttps(match.replayUrl);
  return <li className={`md2-match${live ? ' is-live' : ''}${finished ? ' is-finished' : ''}`} data-match-id={match.id} data-match-status={match.status}>
    <div className="md2-time"><time dateTime={time.dateTime || undefined} title={matchDateLabel(match)}>{time.label}</time><small>{time.zone}</small><span className="md2-timeline-node" aria-hidden="true" /></div>
    <article className="md2-match-body" aria-label={`${match.team1 || 'Участник уточняется'} — ${match.team2 || 'Участник уточняется'}`}>
      <h3 className="md2-round">{match.roundTitle}{match.bestOf && <span> · {match.bestOf}</span>}</h3>
      <div className="md2-scoreboard">
        <TeamIdentity tournament={tournament} name={match.team1} winner={result.winner === match.team1 && finished} side="first" />
        <div className="md2-score" aria-label={scoreKnown ? `Счёт ${result.score1}:${result.score2}` : finished ? 'Счёт не опубликован' : 'Результат не опубликован'}>{scoreKnown ? <>{result.score1}<span>:</span>{result.score2}</> : finished || pendingResult ? <><span>—</span><span>:</span><span>—</span></> : 'VS'}</div>
        <TeamIdentity tournament={tournament} name={match.team2} winner={result.winner === match.team2 && finished} side="second" />
      </div>
      <div className="md2-match-action"><span className="md2-status">{statusOf(match, tournament.discipline)}</span><MatchLink tournamentId={tournament.id} matchId={match.id} className={live ? 'md2-button md2-button--primary' : 'md2-button'}>{live ? 'Открыть матч' : 'Матч'} <ArrowRight aria-hidden="true" /></MatchLink></div>
      {live && <p className="md2-result-note">Результат после завершения серии</p>}
      {finished && <div className="md2-maps">{!technical && result.maps.length ? result.maps.map((map, index) => <span key={`${map.name}-${index}`}>{map.name} <b>{map.score1}:{map.score2}</b></span>) : <span>{match.status === 'completed' ? 'Счёт карт не опубликован' : 'Без сыгранных карт'}</span>}</div>}
      <div className="md2-match-extras">
        <BroadcastActions match={match} className="md2-broadcasts" linkClassName="md2-text-link" />
        {replay && <a className="md2-text-link" href={replay} target="_blank" rel="noreferrer">Запись матча <ArrowUpRight aria-hidden="true" /></a>}
        <MatchCasters match={match} className="md2-casters" />
        {consequence && <p className="md2-consequence">{consequence}</p>}
        <MatchPartners tournament={tournament} match={match} />
      </div>
    </article>
  </li>;
}

function TournamentSidebar({ tournament }) {
  const root = tournamentRoute(tournament);
  const channel = safeHttps(twitchAnalytics.channelUrl);
  const bracket = (tournament.stages || []).find((stage) => /playoff/i.test(stage.id)) || (tournament.stages || []).find((stage) => /swiss/i.test(stage.id));
  return <aside className="md2-sidebar" aria-label="Канал и турнир">
    {channel && <section className="md2-panel md2-channel">
      <h2>Канал проекта</h2>
      <a className="md2-channel-image" href={channel} target="_blank" rel="noreferrer" aria-label="Открыть канал ЯрКиберСезон на Twitch"><span><ArrowUpRight aria-hidden="true" /></span></a>
      <p className="md2-channel-name"><TwitchLogo weight="fill" aria-hidden="true" /><span>Twitch <b>· {twitchAnalytics.channel}</b></span></p>
      <a className="md2-button md2-button--primary" href={channel} target="_blank" rel="noreferrer">Открыть Twitch <ArrowUpRight aria-hidden="true" /></a>
      <p className="md2-channel-note">Эфиры ЯрКиберСезона. Назначенные трансляции указаны у матчей.</p>
    </section>}
    <section className="md2-panel md2-tournament">
      <h2>Весь турнир</h2><p>{tournament.title}: участники, расписание и опубликованные результаты.</p>
      <nav aria-label="Разделы турнира">
        <InternalLink className="md2-button" href={bracket ? `${root}?section=${bracket.id}` : `${root}?section=matches&phase=all`}><TreeStructure aria-hidden="true" />{bracket ? 'Сетка турнира' : 'Все матчи'}<ArrowRight aria-hidden="true" /></InternalLink>
        <InternalLink className="md2-button" href={`${root}?section=participants`}><UsersThree aria-hidden="true" />Участники <ArrowRight aria-hidden="true" /></InternalLink>
      </nav>
    </section>
  </aside>;
}

export function MatchdayPage({ tournament }) {
  const model = useMemo(() => getMatchdayModel(tournament), [tournament]);
  const [selectedDate, setSelectedDate] = useState(model.defaultDate);
  const [focusedDate, setFocusedDate] = useState(model.defaultDate);
  const tabRefs = useRef([]);
  const day = model.days.find((candidate) => candidate.date === selectedDate) || model.days.find((candidate) => candidate.date === model.defaultDate) || model.days[0];
  const dayIndex = model.days.indexOf(day);
  const archived = isArchive(tournament);
  const root = tournamentRoute(tournament);
  const support = getOfficialSupport(tournament);
  const footerPartners = support.length ? support : tournament.matchday?.partners || [];
  const orderedMatches = [...(day?.matches || [])].sort((a, b) => {
    const left = timeOf(a), right = timeOf(b);
    // Unknown times remain unplaced after the known appointments; source order breaks ties.
    return (left.label === '—' ? 1 : 0) - (right.label === '—' ? 1 : 0) || left.label.localeCompare(right.label);
  });

  useEffect(() => {
    const sync = () => {
      const requested = new URLSearchParams(window.location.search).get('date');
      const date = model.days.some((item) => item.date === requested) ? requested : model.defaultDate;
      setSelectedDate(date); setFocusedDate(date);
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [model]);
  useEffect(() => {
    const revealSelectedDate = () => {
      const tab = tabRefs.current[model.days.findIndex((item) => item.date === selectedDate)];
      if (tab?.parentElement) tab.parentElement.scrollLeft = tab.offsetLeft - tab.parentElement.offsetLeft - 24;
    };
    revealSelectedDate();
    window.addEventListener('resize', revealSelectedDate);
    return () => window.removeEventListener('resize', revealSelectedDate);
  }, [selectedDate, model]);

  const selectDate = (date) => {
    if (!model.days.some((item) => item.date === date)) return;
    setFocusedDate(date);
    if (date === selectedDate) return;
    setSelectedDate(date);
    const url = new URL(window.location.href);
    url.searchParams.set('date', date);
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };
  const moveFocus = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % model.days.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + model.days.length) % model.days.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = model.days.length - 1;
    if (next !== undefined) { event.preventDefault(); setFocusedDate(model.days[next].date); tabRefs.current[next]?.focus(); }
  };

  return <main className="matchday">
    <div className="md2-container">
      <div className="md2-topline"><nav aria-label="Хлебные крошки"><InternalLink href="/tournaments">Турниры</InternalLink><span aria-hidden="true">/</span><InternalLink href={root}>{tournament.title}</InternalLink></nav><InternalLink className="md2-back" href={root}>К турниру <ArrowUpRight aria-hidden="true" /></InternalLink></div>
      <header className="md2-heading"><div><p className="md2-eyebrow">{archived ? 'Архив турнира' : tournament.discipline}</p><h1>Игровой день</h1><p className="md2-current-date">{dayHeading(day)}</p></div>{day && <p className="md2-day-count">Матчей: <strong>{day.matches.length}</strong><span>Вся программа дня</span></p>}</header>
      {day && <div className="md2-date-navigation"><button type="button" className="md2-date-arrow" aria-label="Предыдущий игровой день" disabled={dayIndex <= 0} onClick={() => selectDate(model.days[dayIndex - 1].date)}><CaretLeft aria-hidden="true" /></button><div className="md2-days" role="tablist" aria-label="Игровой день">
        {model.days.map((item, index) => <button type="button" role="tab" id={`md-tab-${item.date}`} aria-controls="md-day-panel" aria-selected={day.date === item.date} tabIndex={(focusedDate || day.date) === item.date ? 0 : -1} key={item.date} ref={(node) => { tabRefs.current[index] = node; }} onFocus={() => setFocusedDate(item.date)} onClick={() => selectDate(item.date)} onKeyDown={(event) => moveFocus(event, index)}><strong>{item.dateLabel}</strong><span>{validDate(item.date) ? new Intl.DateTimeFormat('ru-RU', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`)) : 'Без точной даты'}</span></button>)}
      </div><button type="button" className="md2-date-arrow" aria-label="Следующий игровой день" disabled={dayIndex >= model.days.length - 1} onClick={() => selectDate(model.days[dayIndex + 1].date)}><CaretRight aria-hidden="true" /></button></div>}
      <div className="md2-layout">
        {day ? <section id="md-day-panel" role="tabpanel" aria-labelledby={`md-tab-${day.date}`} tabIndex={0} className="md2-panel md2-program">
          <div className="md2-section-heading"><h2>Программа дня</h2><span aria-hidden="true" /></div>
          <p className="sr-only" aria-live="polite">{dayHeading(day)}. Матчей: {day.matches.length}.</p>
          <ol className="md2-timeline">{orderedMatches.map((match) => <ProgramMatch key={match.id} match={match} tournament={tournament} matches={model.matches} />)}</ol>
        </section> : <section className="md2-panel md2-empty"><h2>Матчи ещё не опубликованы</h2><p>Программа появится после публикации расписания организатором.</p><InternalLink className="md2-button" href={root}><ArrowLeft aria-hidden="true" /> На страницу турнира</InternalLink></section>}
        <TournamentSidebar tournament={tournament} />
      </div>
      {footerPartners.length > 0 && <section className="md2-partners" aria-label="При поддержке"><span>При поддержке</span><div>{footerPartners.map((partner) => <div key={partner.id || partner.name}><PartnerIdentity partner={partner} /></div>)}</div></section>}
    </div>
  </main>;
}
