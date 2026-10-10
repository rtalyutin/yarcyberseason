import { useId, useState } from 'react';
import { ArrowUpRight, CaretDown } from '@phosphor-icons/react';
import { community } from '../data/community.js';
import { exactStart, matchStates, normalizeResult, safeHttps } from '../lib/community.js';
import { matchDateParts } from '../lib/tournament.js';
import { TeamLink, MatchLink } from './CommunityLinks.jsx';
import { MatchBroadcastLinks } from './MatchBroadcastLinks.jsx';
import { MatchMapLinks } from './MatchMapLinks.jsx';

export function matchTimeLabel(match) {
  const time = (match.time || match.dateDisplay || '').match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time) return `${time[1].padStart(2, '0')}:${time[2]}`;
  return exactStart(match.scheduledAt) ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(new Date(match.scheduledAt)) : null;
}

function dateGroup(match) {
  const parts = matchDateParts(match);
  if (!parts) {
    if (exactStart(match.scheduledAt)) {
      const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date(match.scheduledAt));
      return dateGroup({ date: day });
    }
    return { key: 'unknown', label: match.dateDisplay || match.date || 'Дата уточняется' };
  }
  const date = new Date(Date.UTC(parts.year || 2000, parts.month - 1, parts.day, 12));
  // A legacy source without a year cannot establish a weekday.
  return {
    key: `${parts.year || ''}-${parts.month}-${parts.day}`,
    label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', ...(parts.year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(date).replace(/ г\.$/, ''),
    weekday: parts.year ? new Intl.DateTimeFormat('ru-RU', { weekday: 'long', timeZone: 'UTC' }).format(date) : null,
  };
}

// Group adjacent dates only: the model's published match order stays intact.
export function groupMatchDates(matches) {
  return matches.reduce((groups, match) => {
    const date = dateGroup(match);
    const last = groups.at(-1);
    if (last?.date.key === date.key) last.matches.push(match);
    else groups.push({ date, matches: [match] });
    return groups;
  }, []);
}

function ArenaTeamLogo({ tournament, name }) {
  const source = tournament.teamLogos?.[name] || community.resolveTeam(tournament.id, name)?.logo;
  const [failed, setFailed] = useState(false);
  const initials = (name || '?').split(/[\s_.-]+/).filter(Boolean).slice(0, 3).map((word) => word[0]).join('').toUpperCase();
  return <span className="tn-arena-logo" aria-hidden="true">{source && !source.endsWith('_default.svg') && !failed ? <img src={source} alt="" onError={() => setFailed(true)} /> : initials}</span>;
}

export function TournamentMatchCard({ match, tournament }) {
  const result = normalizeResult(match, tournament.discipline);
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const time = matchTimeLabel(match);
  const date = dateGroup(match);
  const status = ['completed', 'walkover', 'bye'].includes(match.status) && !result.confirmed ? 'Итог не подтверждён' : result.technical ? result.label : result.confirmed ? 'Завершён' : match.status === 'scheduled' ? 'Запланирован' : matchStates[match.status] || 'Статус уточняется';
  return <article className={`tn-arena-match${match.status === 'live' ? ' tn-arena-match--live' : ''}`} data-match-id={match.id || match.key}>
    <div className="tn-arena-time"><strong className={time ? '' : 'tn-time-unknown'}>{time || 'Время уточняется'}</strong><span>{status}</span><span className="tn-card-timezone">МСК</span></div>
    <div className="tn-arena-pair">
      <div className="tn-arena-team tn-arena-team--first"><TeamLink tournamentId={tournament.id} name={match.team1} /><ArenaTeamLogo tournament={tournament} name={match.team1} />{result.score && <span className="tn-mobile-score" aria-hidden="true">{result.score[0]}</span>}</div>
      <div className="tn-arena-score"><strong aria-label={result.score ? `${result.label}: ${result.score.join(':')}` : 'Счёт пока не опубликован'}>{result.score ? result.score.join(' : ') : 'VS'}</strong>{result.score && <span>{result.technical ? 'Технический счёт' : result.label}</span>}</div>
      <div className="tn-arena-team tn-arena-team--second"><ArenaTeamLogo tournament={tournament} name={match.team2} /><TeamLink tournamentId={tournament.id} name={match.team2} />{result.score && <span className="tn-mobile-score" aria-hidden="true">{result.score[1]}</span>}</div>
      <p className="tn-arena-meta">{[match.roundTitle, match.bestOf].filter(Boolean).join(' · ')}</p>
    </div>
    <div className="tn-arena-actions">
      <MatchLink tournamentId={tournament.id} matchId={match.id} className="tn-match-primary">Матч <ArrowUpRight aria-hidden="true" /></MatchLink>
      <MatchBroadcastLinks match={match} />
      <button className="tn-details-toggle" type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)}>{expanded ? 'Скрыть подробности' : 'Подробности'}<CaretDown aria-hidden="true" /></button>
    </div>
    <div className="tn-arena-details" id={detailsId} hidden={!expanded}>
      <p>{[date.label, time ? `${time} МСК` : 'Время уточняется', match.stageTitle, match.bestOf].filter(Boolean).join(' · ')}</p>
      {match.resultIssue && <p>{match.resultIssue}</p>}
      {result.maps.length > 0 && <ul>{result.maps.map((map, index) => <li key={`${map.name}-${index}`}><span>{map.name}{map.winnerTeamId ? ` · Победа: ${map.winnerTeamId === match.team1Id ? match.team1 : match.team2}` : ''}</span><b>{map.kills ? `Убийства ${map.kills.join(':')}` : map.score ? `${map.unit} ${map.score.join(':')}` : 'Результат не опубликован'}{map.durationSeconds ? ` · ${Math.floor(map.durationSeconds / 60)}:${String(map.durationSeconds % 60).padStart(2, '0')}` : ''}</b>{map.url && <a href={map.url} target="_blank" rel="noopener noreferrer">OpenDota <ArrowUpRight aria-hidden="true" /></a>}</li>)}</ul>}
      <MatchMapLinks match={match} />
      {match.note && <p>{match.note}</p>}
      {match.roundRecord && !match.note && <p>Раунды: {match.roundRecord}</p>}
      {safeHttps(match.faceitUrl) && <a href={match.faceitUrl} target="_blank" rel="noopener noreferrer">Результат FACEIT <ArrowUpRight aria-hidden="true" /></a>}
    </div>
  </article>;
}
