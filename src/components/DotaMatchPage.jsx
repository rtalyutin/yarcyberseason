import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Copy, DownloadSimple, Play, TwitchLogo } from '@phosphor-icons/react';
import { community } from '../data/community.js';
import { tournaments } from '../data/tournaments/index.js';
import { getMatchBroadcastLinks } from '../lib/broadcasts.js';
import { matchConsequence, matchDateLabel, matchKey, matchPath, matchStates, safeHttps } from '../lib/community.js';
import { useDotaMvp } from '../lib/dota-mvp-client.js';
import { getDotaMatchMvp } from '../lib/dota-match-mvp.js';
import { formatMvpScore } from '../lib/dota-mvp.js';
import { downloadResultCard } from '../lib/result-card.js';
import { publicUrl } from '../lib/public-url.js';
import { InternalLink, TeamLink } from './CommunityLinks.jsx';
import { MatchMapLinks } from './MatchMapLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import '../dota-match-detail.css';

const scoreText = (exact) => formatMvpScore(exact).replace('.', ',');
const durationText = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function MatchMvp({ tournament, match }) {
  const state = useDotaMvp(tournament);
  const mvp = getDotaMatchMvp({ tournament, match, ...state });
  const leaders = mvp.leaders;
  const estimated = mvp.estimatedMapIds.length > 0;
  const heading = leaders.length > 1 ? 'Лидеры MVP матча' : 'MVP матча';
  const noAward = match.result.technical && !match.result.maps.length;
  const emptyTitle = noAward ? 'Без сыгранных карт' : match.status !== 'completed' ? 'После завершения матча' : mvp.status === 'unsupported' ? 'Итог серии уточняется' : state.availability === 'loading' ? 'Получаем статистику…' : state.availability === 'unavailable' ? 'Статистика недоступна' : 'Ожидаем статистику';
  return <section className={`dm-mvp${leaders.length > 1 ? ' dm-mvp--tied' : ''}`} aria-labelledby="dm-mvp-heading">
    <h2 className="dm-eyebrow" id="dm-mvp-heading"><img src="/assets/games/dota2.svg" alt="" />{heading}</h2>
    {leaders.length ? <>
      <div className="dm-mvp-leaders">{leaders.map((player) => <div key={player.accountId} className="dm-mvp-player"><h3>{player.nickname}</h3><p>{player.teamNames?.join(' / ')}</p></div>)}</div>
      <p className="dm-mvp-score">Баллы MVP <strong>{scoreText(leaders[0].ratingExact)}</strong>{estimated && <span> · расчётная оценка</span>}</p>
      <p className="dm-mvp-note">{leaders.length > 1 ? 'Равные баллы. Единственный MVP не определён.' : estimated ? 'По среднему турнира с поправкой на результат. Обновится после получения статистики.' : 'По статистике этого матча.'}</p>
    </> : <div className="dm-mvp-empty" role="status"><h3>{emptyTitle}</h3><p>{noAward ? 'Техническое решение. MVP не начисляется.' : match.status !== 'completed' ? 'Здесь появится лучший игрок и его баллы.' : mvp.status === 'unsupported' ? 'MVP всей серии пока не опубликован.' : state.availability === 'unavailable' ? 'Не удалось загрузить подтверждённые данные MVP. Повторим загрузку автоматически.' : 'Лучший игрок появится после подтверждения данных карты.'}</p></div>}
    {mvp.correctionPendingMatchIds.length > 0 && <p className="dm-notice" role="status">Статистика перепроверяется. Показан предыдущий подтверждённый расчёт.</p>}
    {mvp.stale && leaders.length > 0 && <p className="dm-notice" role="status">Обновление задерживается. Показаны последние подтверждённые данные.</p>}
    {leaders.length > 0 && mvp.preliminary && !estimated && !mvp.stale && !mvp.correctionPendingMatchIds.length && <p className="dm-notice" role="status">Предварительный расчёт. Данные карты ещё уточняются.</p>}
  </section>;
}

function MatchMaps({ match }) {
  const { result } = match;
  return <section className="dm-maps" aria-label="Карты матча">
    {result.maps.length ? result.maps.map((map, index) => <div key={index} className="dm-map">
      <h2>{map.name || `Карта ${index + 1}`}</h2>
      {map.winnerTeamId && <p className="dm-map-winner">Победа <strong>{map.winnerTeamId === match.team1Id ? match.team1 : match.team2}</strong></p>}
      <dl>{map.kills && <div><dt>Убийства</dt><dd>{map.kills.join(' : ')}</dd></div>}{map.score && !map.kills && <div><dt>{map.unit || 'Счёт'}</dt><dd>{map.score.join(' : ')}</dd></div>}{map.durationSeconds > 0 && <div><dt>Длительность</dt><dd>{durationText(map.durationSeconds)}</dd></div>}</dl>
      {!map.kills && !map.score && map.outcome && <p>{map.outcome}</p>}
    </div>) : <><h2>Карты</h2><p>{result.technical ? 'Техническое решение без игры.' : result.confirmed ? 'Счёт отдельных карт не опубликован.' : 'Результаты появятся после игры.'}</p></>}
    <MatchMapLinks match={match} />
  </section>;
}

export function DotaMatchPage({ tournament, match }) {
  const [copyState, setCopyState] = useState('');
  const [downloadState, setDownloadState] = useState('');
  const result = match.result;
  const broadcasts = getMatchBroadcastLinks(match);
  const vod = safeHttps(match.vodUrl || match.replayUrl);
  const highlights = (match.highlights || []).map((item) => ({ ...item, href: safeHttps(item.url) })).filter((item) => item.href);
  const tournamentUrl = `/tournaments/${tournament.slug}`;
  const url = publicUrl(matchPath(match));
  const consequence = matchConsequence(match, community, tournaments);
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopyState('Ссылка скопирована'); }
    catch { setCopyState('Выделите и скопируйте ссылку:'); }
  };
  const download = async () => {
    setDownloadState('loading');
    try { await downloadResultCard(match, window.location.origin); setDownloadState('PNG передан браузеру для скачивания.'); }
    catch { setDownloadState('Не удалось подготовить PNG. Попробуйте ещё раз.'); }
  };
  return <main className="dota-match-detail">
    <section className="dm-hero" aria-labelledby="dm-match-title">
      <nav className="dm-breadcrumb" aria-label="Путь к матчу"><InternalLink href={`${tournamentUrl}#matches`}><ArrowLeft aria-hidden="true" />К матчам</InternalLink><span>/</span><InternalLink href={tournamentUrl}>{tournament.title}</InternalLink></nav>
      <h1 className="dm-sr-only" id="dm-match-title">{match.team1 || 'Участник уточняется'} — {match.team2 || 'Участник уточняется'}</h1>
      <div className="dm-scoreboard">
        <div className="dm-team dm-team--left"><TeamLink tournamentId={match.tournamentId} name={match.team1}><TeamLogo team={community.teams.get(match.team1Id)} /><span>{match.team1 || 'Участник уточняется'}</span></TeamLink></div>
        <div className="dm-result"><p className="dm-round">{match.roundTitle}{match.bestOf && <span> · {match.bestOf}</span>}</p><p className="dm-date">{matchDateLabel(match)}</p><strong className="dm-score" aria-label={`${result.label || 'Счёт'}: ${result.score ? result.score.join(' : ') : 'не опубликован'}`}>{result.score ? result.score.join(' : ') : '— : —'}</strong><p className={`dm-status dm-status--${match.status}`}>{matchStates[match.status] || matchStates.unknown}</p><span className="dm-score-label">{result.score ? result.label : result.confirmed ? 'Смысл счёта уточняется' : 'Итог не подтверждён'}</span><img className="dm-dota-mark" src="/assets/games/dota2.svg" alt="" /></div>
        <div className="dm-team dm-team--right"><TeamLink tournamentId={match.tournamentId} name={match.team2}><TeamLogo team={community.teams.get(match.team2Id)} /><span>{match.team2 || 'Участник уточняется'}</span></TeamLink></div>
      </div>
      {match.status === 'scheduled' && match.note && <p className="dm-schedule-note">{match.note}</p>}
    </section>
    {(match.resultIssue || match.scoreKind === 'unknown') && result.sourceScore && <p className="dm-notice dm-source-issue">Опубликованный счёт: {result.sourceScore.join(':')}. {match.resultIssue || 'Единицы счёта уточняются.'}</p>}
    <div className="dm-stone-band"><MatchMvp tournament={tournament} match={match} /><MatchMaps match={match} /></div>
    <div className="dm-dock">
      {broadcasts.length > 0 && <section className="dm-broadcasts" aria-label="Трансляции матча"><h2>Трансляции</h2>{broadcasts.map(({ platform, href, label }) => <a key={platform} className={`dm-button dm-stream dm-stream--${platform}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}, новая вкладка`}>{platform === 'twitch' ? <TwitchLogo weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}<span>{platform === 'twitch' ? 'Twitch' : 'VK Видео'}</span><ArrowUpRight aria-hidden="true" /></a>)}</section>}
      <div className="dm-recording">{vod ? <a href={vod} target="_blank" rel="noopener noreferrer"><Play aria-hidden="true" />Запись матча<ArrowUpRight aria-hidden="true" /></a> : <span>Запись не опубликована.</span>}</div>
      <InternalLink href={`${tournamentUrl}#matches`} className="dm-button dm-button--primary">К матчам турнира <ArrowRight aria-hidden="true" /></InternalLink>
      <button type="button" className="dm-share" onClick={copyLink}><Copy aria-hidden="true" />Поделиться</button>
    </div>
    {copyState && <div className="dm-copy-feedback" role="status"><p>{copyState}</p>{copyState !== 'Ссылка скопирована' && <a href={url}>{url}</a>}</div>}
    <section className="dm-details" aria-label="Дополнительно о матче">
      {consequence && <p>{consequence}</p>}
      <div className="dm-details-actions"><InternalLink href={`${tournamentUrl}#${match.stageId}`}>Открыть этап турнира <ArrowUpRight aria-hidden="true" /></InternalLink>
        {['winnerTo', 'loserTo'].map((field) => { const target = match[field], next = target && community.matches.get(matchKey(target.tournamentId || match.tournamentId, target.matchId)); return next ? <InternalLink key={field} href={matchPath(next)}>{field === 'winnerTo' ? 'Победитель' : 'Проигравший'} → {next.roundTitle}</InternalLink> : null; })}
        {highlights.map(({ title, href }) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{title}<ArrowUpRight aria-hidden="true" /></a>)}
        <button className="dm-download" type="button" disabled={!result.canDownload || downloadState === 'loading'} onClick={download}><DownloadSimple aria-hidden="true" />{downloadState === 'loading' ? 'Готовим карточку…' : 'Скачать карточку результата'}</button>
      </div>
      {!result.canDownload && <p className="dm-muted">Карточка появится после подтверждения результата.</p>}
      {downloadState && downloadState !== 'loading' && <p role="status">{downloadState}</p>}
    </section>
  </main>;
}
