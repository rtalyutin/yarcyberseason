import { useEffect, useState } from 'react';
import { community } from '../data/community.js';
import { tournaments } from '../data/tournaments/index.js';
import { calendarPath, matchConsequence, matchDateLabel, matchKey, matchPath, matchStates, safeHttps, teamPath, teamSummary, upcomingMatches } from '../lib/community.js';
import { downloadResultCard } from '../lib/result-card.js';
import { InternalLink, TeamLink } from './CommunityLinks.jsx';
import '../community.css';

function CopyLink({ value, label }) {
  const [message, setMessage] = useState('');
  return <div className="community-copy"><button type="button" className="community-button" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setMessage('Ссылка скопирована'); }
    catch { setMessage('Не удалось скопировать автоматически. Выделите ссылку ниже.'); }
  }}>{label}</button><a className="community-visible-url" href={value}>{value}</a>{message && <span role="status">{message}</span>}</div>;
}
function TeamLogo({ team, className = '' }) {
  return <img className={className} src={team?.logo || '/assets/teams/_default.svg'} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/teams/_default.svg'; }} />;
}
function UnknownPage({ kind }) {
  useEffect(() => { document.title = `${kind} не найден${kind === 'Команда' ? 'а' : ''} — ЯрКиберСезон`; }, [kind]);
  return <main className="community-page"><p className="community-eyebrow">404</p><h1>{kind} не найден{kind === 'Команда' ? 'а' : ''}</h1><InternalLink className="community-button" href="/">К турнирам</InternalLink></main>;
}
export function CommunityMatchRow({ match }) {
  return <article className="community-match-row">
    <p>{matchDateLabel(match)} · {match.roundTitle}</p>
    <div className="community-row-score">
      <TeamLink tournamentId={match.tournamentId} name={match.team1} />
      <InternalLink href={matchPath(match)} aria-label={`Страница матча ${match.team1} — ${match.team2}`}><strong>{match.result.score ? match.result.score.join(' : ') : '— : —'}</strong></InternalLink>
      <TeamLink tournamentId={match.tournamentId} name={match.team2} />
    </div>
    {(match.resultIssue || match.scoreKind === 'unknown') && match.result.sourceScore && <p>Опубликованный счёт: {match.result.sourceScore.join(':')}. {match.resultIssue || 'Единицы счёта уточняются.'}</p>}
    <div className="community-row-bottom"><span>{matchStates[match.status] || matchStates.unknown}{match.bestOf && ` · ${match.bestOf}`}{match.result.score && !match.result.technical ? ' · серия' : ''}</span><InternalLink href={matchPath(match)}>О матче ↗</InternalLink></div>
  </article>;
}
function CalendarPanel({ team }) {
  const url = new URL(calendarPath(team.id), window.location.origin).href;
  return <details className="community-panel community-calendar" id="calendar">
    <summary>Следить за командой <span>Календарь матчей</span></summary>
    <p>Добавьте календарь по ссылке в своём календарном приложении. Переносы появятся после его следующего обновления.</p>
    <a className="community-button community-button--primary" href={url.replace(/^https?:/, 'webcal:')}>Подписаться на календарь</a>
    <CopyLink label="Скопировать ссылку календаря" value={url} />
    <p className="community-muted">Скачивание и разовый импорт файла не создают подписку. Мгновенное обновление зависит от вашего календаря.</p>
  </details>;
}

export function TeamPage({ teamId }) {
  const team = community.teams.get(teamId);
  const [visibleCount, setVisibleCount] = useState(10);
  useEffect(() => { if (team) document.title = `${team.name} — ЯрКиберСезон`; }, [team]);
  if (!team) return <UnknownPage kind="Команда" />;
  const summary = teamSummary(team), next = upcomingMatches(team)[0];
  const matches = [...team.matches].sort((a, b) => (b.scheduledAt || b.date || '').localeCompare(a.scheduledAt || a.date || ''));
  const trophies = team.entries.filter((entry) => entry.placement && entry.placement <= 3);
  return <main className="community-page">
    <nav className="community-breadcrumb" aria-label="Путь к команде"><InternalLink href="/">Турниры</InternalLink><span>/ Команда</span></nav>
    <header className="community-team-header"><TeamLogo team={team} /><div><p className="community-eyebrow">{team.discipline}</p><h1>{team.name}</h1><p className="community-muted">Турнирная история</p><button type="button" className="community-button" onClick={() => { const panel = document.getElementById('calendar'); if (panel) { panel.open = true; panel.scrollIntoView({ block: 'start' }); panel.querySelector('summary')?.focus(); } }}>Следить за командой</button></div></header>
    <div className="community-stats" aria-label="По опубликованным матчам">{[['wins', 'Победы'], ['losses', 'Поражения'], ['draws', 'Ничьи'], ['technical', 'Тех. решения']].map(([key, label]) => <div key={key}><strong>{summary[key]}</strong><span>{label}</span></div>)}</div>
    <p className="community-muted community-stat-note">По опубликованным матчам. Технические решения учитываются отдельно.</p>
    <div className="community-columns">
      <div className="community-main-column">
        <section className="community-panel"><h2>Ближайшая игра</h2>{next ? <CommunityMatchRow match={next} /> : <p>Ближайшие матчи пока не назначены.</p>}</section>
        <section className="community-panel"><h2>Матчи <span className="community-count">{team.matches.length}</span></h2>{matches.length ? <>{matches.slice(0, visibleCount).map((match) => <CommunityMatchRow key={match.key} match={match} />)}{visibleCount < matches.length && <button className="community-button" type="button" onClick={() => setVisibleCount(matches.length)}>Показать все матчи</button>}</> : <p>Матчи пока не опубликованы.</p>}</section>
        <section className="community-panel"><h2>История встреч</h2>{summary.opponents.length ? summary.opponents.map((opponent) => <details key={opponent.id} className="community-opponent"><summary><span>{community.teams.get(opponent.id)?.name}</span><span>{opponent.wins} В · {opponent.losses} П · {opponent.draws} Н · {opponent.technical} тех.</span></summary><InternalLink className="community-inline-action" href={teamPath(opponent.id)}>Страница соперника ↗</InternalLink>{opponent.matches.map((match) => <CommunityMatchRow key={match.key} match={match} />)}</details>) : <p>Подтверждённые встречи с соперниками пока не опубликованы.</p>}</section>
      </div>
      <aside className="community-side-column">
        <CalendarPanel team={team} />
        <section className="community-panel"><h2>Трофеи</h2>{trophies.length ? trophies.map((entry) => <div className="community-trophy" key={entry.tournament.id}><strong>{entry.placement === 1 ? 'Чемпионы' : `${entry.placement} место`}</strong><InternalLink href={`/tournaments/${entry.tournament.slug}#results`}>{entry.tournament.title}</InternalLink><span>{entry.tournament.dates?.display}</span></div>) : <p>Призовые места пока не опубликованы.</p>}</section>
        <section className="community-panel"><h2>Турниры</h2>{team.entries.map((entry) => <div className="community-entry" key={entry.tournament.id}><InternalLink href={`/tournaments/${entry.tournament.slug}`}>{entry.tournament.title}</InternalLink><span>{entry.tournament.dates?.display}</span><span>{entry.placement ? `${entry.placement} место` : 'Итоговое место не опубликовано'}</span></div>)}</section>
        {team.previousNames?.length > 0 && <section className="community-panel"><h2>Другие названия</h2>{team.previousNames.map((alias) => <p key={alias.name}><strong>{alias.name}</strong><br /><span className="community-muted">{alias.context}</span></p>)}</section>}
      </aside>
    </div>
  </main>;
}

export function MatchPage({ tournamentSlug, matchId }) {
  const tournament = tournaments.find((t) => t.slug === tournamentSlug);
  const match = tournament && community.matches.get(matchKey(tournament.id, matchId));
  const [downloadState, setDownloadState] = useState('');
  useEffect(() => { if (match) document.title = `${match.team1} — ${match.team2} · ЯрКиберСезон`; }, [match]);
  if (!match) return <UnknownPage kind="Матч" />;
  const url = new URL(matchPath(match), window.location.origin).href;
  const consequence = matchConsequence(match, community, tournaments);
  const result = match.result;
  const media = [['Трансляция', safeHttps(match.broadcastUrl)], ['Запись матча', safeHttps(match.vodUrl || match.replayUrl)], ...(match.highlights || []).map((h) => [h.title, safeHttps(h.url)])].filter(([, href]) => href);
  return <main className="community-page">
    <nav className="community-breadcrumb" aria-label="Путь к матчу"><InternalLink href={`/tournaments/${tournament.slug}`}>{tournament.title}</InternalLink><span>/ Матч</span></nav>
    <header className="community-match-header"><p className="community-eyebrow">{match.roundTitle}{match.bestOf && ` · ${match.bestOf}`}</p><h1>{match.team1 || 'Участник уточняется'} <span>—</span> {match.team2 || 'Участник уточняется'}</h1><p>{matchDateLabel(match)}</p></header>
    <section className="community-score-panel" aria-label="Результат матча"><span className={`community-status community-status--${match.status}`}>{matchStates[match.status] || matchStates.unknown}</span><div className="community-big-score">
      <div><TeamLogo team={community.teams.get(match.team1Id)} /><TeamLink tournamentId={match.tournamentId} name={match.team1} /></div>
      <div className="community-series"><strong>{result.score ? result.score.join(' : ') : '— : —'}</strong><span>{result.score ? result.label : result.confirmed ? 'Смысл счёта уточняется' : 'Итог не подтверждён'}</span></div>
      <div><TeamLogo team={community.teams.get(match.team2Id)} /><TeamLink tournamentId={match.tournamentId} name={match.team2} /></div>
    </div>{consequence && <p className="community-consequence">{consequence}</p>}</section>
    {(match.resultIssue || match.scoreKind === 'unknown') && result.sourceScore && <p className="community-source-issue">Опубликованный счёт: {result.sourceScore.join(':')}. {match.resultIssue || 'Единицы счёта уточняются.'}</p>}
    <div className="community-columns">
      <div className="community-main-column">
        <section className="community-panel"><h2>Карты</h2>{result.maps.length ? <ol className="community-map-list">{result.maps.map((map, i) => <li key={i}><span>{map.name}</span><strong>{map.score ? map.score.join(' : ') : map.outcome || 'Результат не опубликован'}</strong><span>{map.score ? map.unit : ''}</span></li>)}</ol> : <p>{result.technical ? 'Техническое решение: сыгранные карты не добавляются.' : result.confirmed ? 'Счёт отдельных карт не опубликован.' : 'Результаты карт пока не опубликованы.'}</p>}</section>
        <section className="community-panel"><h2>В турнирной сетке</h2>{consequence && <p>{consequence}</p>}{['winnerTo', 'loserTo'].map((field) => {
          const target = match[field], next = target && community.matches.get(matchKey(target.tournamentId || match.tournamentId, target.matchId));
          return next ? <p key={field}><InternalLink href={matchPath(next)}>{field === 'winnerTo' ? 'Победитель' : 'Проигравший'} → {next.roundTitle}</InternalLink></p> : null;
        })}<InternalLink href={`/tournaments/${tournament.slug}#${match.stageId}`}>Открыть этап турнира ↗</InternalLink></section>
        <section className="community-panel"><h2>Видео</h2>{!safeHttps(match.vodUrl || match.replayUrl) && <p>Запись не опубликована.</p>}{media.map(([label, href]) => <p key={href}><a href={href} target="_blank" rel="noreferrer">{label} ↗</a></p>)}</section>
      </div>
      <aside className="community-side-column"><section className="community-panel"><h2>Поделиться матчем</h2><CopyLink label="Скопировать ссылку" value={url} /><button className="community-button community-button--primary" type="button" disabled={!result.canDownload || downloadState === 'loading'} onClick={async () => {
        setDownloadState('loading');
        try { await downloadResultCard(match, window.location.origin); setDownloadState('Готово. PNG передан браузеру для скачивания.'); }
        catch { setDownloadState('Не удалось подготовить PNG. Попробуйте ещё раз или скопируйте ссылку.'); }
      }}>{downloadState === 'loading' ? 'Готовим карточку…' : 'Скачать карточку результата'}</button>{!result.canDownload && <p className="community-muted">Карточка появится после публикации однозначного подтверждённого результата.</p>}{downloadState && downloadState !== 'loading' && <p role="status">{downloadState}</p>}</section></aside>
    </div>
  </main>;
}
