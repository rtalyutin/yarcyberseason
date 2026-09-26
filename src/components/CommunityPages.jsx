import { TeamLogo } from './TeamLogo.jsx';
import { MatchMapLinks } from './MatchMapLinks.jsx';
import { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarBlank, CaretDown, Trophy } from '@phosphor-icons/react';
import { community } from '../data/community.js';
import { tournaments } from '../data/tournaments/index.js';
import { calendarPath, matchConsequence, matchDateLabel, matchKey, matchPath, matchStates, safeHttps, teamPath, teamSummary, teamForDiscipline, upcomingMatches } from '../lib/community.js';
import { downloadResultCard } from '../lib/result-card.js';
import { publicUrl } from '../lib/public-url.js';
import { InternalLink, TeamLink } from './CommunityLinks.jsx';
import '../community.css';
import '../team-profile.css';

function CopyLink({ value, label }) {
  const [message, setMessage] = useState('');
  return <div className="community-copy"><button type="button" className="community-button" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setMessage('Ссылка скопирована'); }
    catch { setMessage('Не удалось скопировать автоматически. Выделите ссылку ниже.'); }
  }}>{label}</button><a className="community-visible-url" href={value}>{value}</a>{message && <span role="status">{message}</span>}</div>;
}
function UnknownPage({ kind }) {
  useEffect(() => { document.title = `${kind} не найден${kind === 'Команда' ? 'а' : ''} — ЯрКиберСезон`; }, [kind]);
  return <main className="community-page"><p className="community-eyebrow">404</p><h1>{kind} не найден{kind === 'Команда' ? 'а' : ''}</h1><InternalLink className="community-button" href="/">К турнирам</InternalLink></main>;
}
export function CommunityMatchRow({ match, profile = false }) {
  const identity = (side) => profile ? <span className={`tp-match-team tp-match-team--${side}`}><TeamLogo team={community.teams.get(match[`team${side}Id`])} /><TeamLink tournamentId={match.tournamentId} name={match[`team${side}`]} /></span> : <TeamLink tournamentId={match.tournamentId} name={match[`team${side}`]} />;
  return <article className={`community-match-row${profile ? ' tp-match' : ''}`}>
    <p>{matchDateLabel(match)} · {match.roundTitle}</p>
    <div className="community-row-score">
      {identity(1)}
      <InternalLink href={matchPath(match)} aria-label={`Страница матча ${match.team1} — ${match.team2}`}><strong>{match.result.score ? match.result.score.join(' : ') : '— : —'}</strong></InternalLink>
      {identity(2)}
    </div>
    {(match.resultIssue || match.scoreKind === 'unknown') && match.result.sourceScore && <p>Опубликованный счёт: {match.result.sourceScore.join(':')}. {match.resultIssue || 'Единицы счёта уточняются.'}</p>}
    <div className="community-row-bottom"><span>{matchStates[match.status] || matchStates.unknown}{match.bestOf && ` · ${match.bestOf}`}{match.result.score && !match.result.technical ? ' · серия' : ''}</span><InternalLink href={matchPath(match)}>О матче ↗</InternalLink></div>
    <MatchMapLinks match={match} />
  </article>;
}
function CalendarPanel({ team, compact = false }) {
  const url = publicUrl(calendarPath(team.id));
  return <details className={`community-panel community-calendar${compact ? ' tp-follow' : ''}`} id="calendar">
    <summary>{compact && <CalendarBlank aria-hidden="true" size={20} />}Следить за командой {compact ? <CaretDown aria-hidden="true" size={16} /> : <span>Календарь матчей</span>}</summary>
    {team.disciplines.length > 1 && <p>Все дисциплины команды</p>}
    <p>Добавьте календарь по ссылке в своём календарном приложении. Переносы появятся после его следующего обновления.</p>
    <a className="community-button community-button--primary" href={url.replace(/^https?:/, 'webcal:')}>Подписаться на календарь</a>
    <CopyLink label="Скопировать ссылку календаря" value={url} />
    <p className="community-muted">Скачивание и разовый импорт файла не создают подписку. Мгновенное обновление зависит от вашего календаря.</p>
  </details>;
}

function TournamentRoster({ entry }) {
  const roster = entry.roster;
  if (!roster) return <p className="community-muted">Состав на этот турнир не опубликован.</p>;
  const sourceUrl = safeHttps(roster.source?.url);
  return <details className="community-roster">
    <summary>Состав на турнир <span className="community-count">· {roster.members.length}</span><span className="tp-roster-preview">{roster.members.map((member) => <span key={member.name}>{member.name.match(/«([^»]+)»/)?.[1] || member.name}</span>)}</span></summary>
    <ul className="community-roster-list" aria-label={`Состав ${roster.sourceName} — ${entry.tournament.title}`}>
      {roster.members.map((member) => <li key={member.name}><strong>{member.name}</strong><span>{member.role}</span></li>)}
    </ul>
    {sourceUrl && <p className="community-roster-source"><a href={sourceUrl} target="_blank" rel="noreferrer">Источник: {new URL(sourceUrl).hostname} · {roster.source.section} ↗</a></p>}
  </details>;
}

function TeamStats({ team, discipline = team.disciplines[0] }) {
  const summary = teamSummary(team);
  return <div className="tp-statistics">
    <div className="community-stats" aria-label={`${discipline} · По опубликованным матчам`}>
      {[['wins', 'Победы'], ['losses', 'Поражения'], ['draws', 'Ничьи'], ['technical', 'Тех. решения']].map(([key, label]) => <div key={key}><strong>{summary[key]}</strong><span>{label}</span></div>)}
    </div>
    <p className="community-muted community-stat-note">По матчам на сайте. Тех. решения — отдельно.</p>
  </div>;
}

function DisciplineHistory({ sourceTeam, discipline, first, multiple, railStats }) {
  const team = teamForDiscipline(sourceTeam, discipline);
  const [visibleCount, setVisibleCount] = useState(3);
  const summary = teamSummary(team), next = upcomingMatches(team)[0];
  const matches = [...team.matches].sort((a, b) => (b.scheduledAt || b.date || '').localeCompare(a.scheduledAt || a.date || ''));
  const trophies = team.entries.filter((entry) => entry.placement && entry.placement <= 3);
  const entryRank = (entry) => !['completed', 'archive'].includes(entry.tournament.status) ? 0 : entry.roster ? 1 : 2;
  const entries = [...team.entries].sort((a, b) => entryRank(a) - entryRank(b));
  return <section className={`tp-discipline${first ? ' tp-discipline--first' : ''}`} aria-label={discipline}>
    <h2 className={`tp-discipline-title${!multiple ? ' tp-visually-hidden' : ''}`}>{discipline === 'Counter-Strike 2' ? 'CS2' : discipline}</h2>
    {!railStats && <TeamStats team={team} discipline={discipline} />}
    <section className="tp-panel tp-matches">
      <div className="tp-section-heading"><h2>Матчи <span className="community-count">· {team.matches.length}</span></h2>{matches.length > visibleCount && <button className="tp-text-action" type="button" onClick={() => setVisibleCount(matches.length)}>Все {matches.length} матчей <ArrowUpRight aria-hidden="true" /></button>}</div>
      {matches.length ? <div className="tp-match-list">{matches.slice(0, visibleCount).map((match) => <CommunityMatchRow key={match.key} match={match} profile />)}</div> : <p className="tp-empty">Матчи пока не опубликованы.</p>}
      {visibleCount > 3 && matches.length > 3 && <button className="tp-text-action" type="button" onClick={() => setVisibleCount(3)}>Свернуть список матчей</button>}
      <section className="tp-next" aria-label="Ближайшая игра">{next ? <><h3>Ближайшая игра</h3><CommunityMatchRow match={next} profile /></> : <p><CalendarBlank aria-hidden="true" size={22} />Ближайшие матчи пока не назначены.</p>}</section>
    </section>
    <section className="tp-panel tp-tournaments"><div className="tp-section-heading"><h2>Турниры и составы</h2></div>
      <div className="tp-tournament-grid">{entries.map((entry) => {
        const upcoming = !['completed', 'archive'].includes(entry.tournament.status);
        return <div className={`community-entry tp-entry${upcoming ? ' tp-entry--upcoming' : ''}`} key={entry.tournament.id} data-tournament-id={entry.tournament.id}>
          <span className="tp-entry-label">{upcoming ? 'Ближайший турнир' : 'Архив турниров'}</span>
          <InternalLink className="tp-entry-title" href={`/tournaments/${entry.tournament.slug}`}>{entry.tournament.title}<ArrowUpRight aria-hidden="true" /></InternalLink>
          <span>{entry.tournament.dates?.display}</span>
          {entry.displayName !== sourceTeam.name && <span>{entry.displayName}</span>}
          <span className={upcoming && entry.status === 'registered' ? 'tp-registered' : ''}>{entry.status === 'registered' && upcoming ? 'Заявлена · турнир ещё не начался' : entry.placement ? `${entry.placement} место` : 'Итоговое место не опубликовано'}</span>
          <TournamentRoster entry={entry} />
        </div>;
      })}</div>
    </section>
    <section className="tp-panel tp-trophies"><div className="tp-section-heading"><h2><Trophy aria-hidden="true" />Трофеи</h2></div>{trophies.length ? trophies.map((entry) => <div className="community-trophy" key={entry.tournament.id}><strong>{entry.placement === 1 ? 'Чемпионы' : `${entry.placement} место`}</strong><InternalLink href={`/tournaments/${entry.tournament.slug}#results`}>{entry.tournament.title}</InternalLink><span>{entry.tournament.dates?.display}</span></div>) : <p className="tp-empty">Призовые места пока не опубликованы.</p>}</section>
    <section className="tp-panel tp-opponents"><div className="tp-section-heading"><h2>История встреч</h2></div>{summary.opponents.length ? summary.opponents.map((opponent) => <details key={opponent.id} className="community-opponent"><summary><span>{community.teams.get(opponent.id)?.name}</span><span>{opponent.wins} В · {opponent.losses} П · {opponent.draws} Н · {opponent.technical} тех.</span></summary><InternalLink className="community-inline-action" href={teamPath(opponent.id)}>Страница соперника ↗</InternalLink>{opponent.matches.map((match) => <CommunityMatchRow key={match.key} match={match} profile />)}</details>) : <p className="tp-empty">Подтверждённые встречи с соперниками пока не опубликованы.</p>}</section>
    {team.previousNames?.length > 0 && <section className="tp-panel tp-aliases"><h2>Другие названия</h2>{team.previousNames.map((alias) => <p key={alias.name}><strong>{alias.name}</strong><br /><span className="community-muted">{alias.context}</span></p>)}</section>}
  </section>;
}

export function TeamPage({ teamId, theme = 'cs2' }) {
  const team = community.getTeam(teamId);
  if (!team) return <UnknownPage kind="Команда" />;
  const multiple = team.disciplines.length > 1;
  return <main className={`community-page team-profile${multiple ? ' team-profile--multiple' : ''}`} data-team-theme={theme}>
    <nav className="community-breadcrumb" aria-label="Путь к команде"><InternalLink href="/">Турниры</InternalLink><span>/ Команда</span></nav>
    <div className="tp-layout">
      <header className="tp-identity">
        <p className="community-eyebrow">{team.disciplines.join(' · ')}</p>
        <h1>{team.name}</h1>
        <TeamLogo className="tp-team-logo" team={team} />
        <CalendarPanel team={team} compact />
        {theme === 'dota2' && <>{multiple && <p className="tp-rail-discipline">Статистика · {team.disciplines[0] === 'Counter-Strike 2' ? 'CS2' : team.disciplines[0]}</p>}<TeamStats team={teamForDiscipline(team, team.disciplines[0])} /><div className="tp-city" aria-hidden="true"><img src="/assets/themes/yaroslavl-dota-768.webp" alt="" /><span>Ярославль</span></div></>}
        {theme === 'cs2' && <img className="tp-identity-brand" src="/assets/ycs-logo.jpg" alt="" aria-hidden="true" />}
      </header>
      {theme === 'corporate' && <div className="tp-city" aria-hidden="true"><img src={theme === 'corporate' ? '/assets/themes/yaroslavl-strelka.webp' : '/assets/themes/yaroslavl-dota-768.webp'} alt="" /><span>Ярославль</span></div>}
      {team.disciplines.map((discipline, i) => <DisciplineHistory key={`${team.id}/${discipline}`} sourceTeam={team} discipline={discipline} first={i === 0} multiple={multiple} railStats={theme === 'dota2' && i === 0} />)}
    </div>
  </main>;
}

export function MatchPage({ tournamentSlug, matchId }) {
  const tournament = tournaments.find((t) => t.slug === tournamentSlug);
  const match = tournament && community.matches.get(matchKey(tournament.id, matchId));
  const [downloadState, setDownloadState] = useState('');
  if (!match) return <UnknownPage kind="Матч" />;
  const url = publicUrl(matchPath(match));
  const consequence = matchConsequence(match, community, tournaments);
  const result = match.result;
  const media = [['Трансляция', safeHttps(match.broadcastUrl)], ['Запись матча', safeHttps(match.vodUrl || match.replayUrl)], ...(match.highlights || []).map((h) => [h.title, safeHttps(h.url)])].filter(([, href]) => href);
  return <main className="community-page">
    <nav className="community-breadcrumb" aria-label="Путь к матчу"><InternalLink href={`/tournaments/${tournament.slug}`}>{tournament.title}</InternalLink><span>/ Матч</span></nav>
    <header className="community-match-header"><p className="community-eyebrow">{match.roundTitle}{match.bestOf && ` · ${match.bestOf}`}</p><h1>{match.team1 || 'Участник уточняется'} <span>—</span> {match.team2 || 'Участник уточняется'}</h1><p>{matchDateLabel(match)}</p>{match.status === 'scheduled' && match.note && <p>{match.note}</p>}</header>
    <section className="community-score-panel" aria-label="Результат матча"><span className={`community-status community-status--${match.status}`}>{matchStates[match.status] || matchStates.unknown}</span><div className="community-big-score">
      <div><TeamLogo team={community.teams.get(match.team1Id)} /><TeamLink tournamentId={match.tournamentId} name={match.team1} /></div>
      <div className="community-series"><strong>{result.score ? result.score.join(' : ') : '— : —'}</strong><span>{result.score ? result.label : result.confirmed ? 'Смысл счёта уточняется' : 'Итог не подтверждён'}</span></div>
      <div><TeamLogo team={community.teams.get(match.team2Id)} /><TeamLink tournamentId={match.tournamentId} name={match.team2} /></div>
    </div>{consequence && <p className="community-consequence">{consequence}</p>}</section>
    {(match.resultIssue || match.scoreKind === 'unknown') && result.sourceScore && <p className="community-source-issue">Опубликованный счёт: {result.sourceScore.join(':')}. {match.resultIssue || 'Единицы счёта уточняются.'}</p>}
    <div className="community-columns">
      <div className="community-main-column">
        <section className="community-panel"><h2>Карты</h2><MatchMapLinks match={match} />{result.maps.length ? <ol className="community-map-list">{result.maps.map((map, i) => <li key={i}><span>{map.name}</span><strong>{map.score ? map.score.join(' : ') : map.outcome || 'Результат не опубликован'}</strong><span>{map.score ? map.unit : ''}</span></li>)}</ol> : !match.mapLinks?.length && <p>{result.technical ? 'Техническое решение: сыгранные карты не добавляются.' : result.confirmed ? 'Счёт отдельных карт не опубликован.' : 'Результаты карт пока не опубликованы.'}</p>}</section>
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
