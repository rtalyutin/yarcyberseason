import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, Crown, DownloadSimple, Play, Trophy, TwitchLogo } from '@phosphor-icons/react';
import { community } from '../data/community.js';
import { tournaments } from '../data/tournaments/index.js';
import { getMatchBroadcastLinks } from '../lib/broadcasts.js';
import { matchConsequence, matchDateLabel, matchKey, matchPath, matchStates, safeHttps } from '../lib/community.js';
import { getDotaMapMvp, getDotaSeriesMvp } from '../lib/dota-match-mvp.js';
import { DotaSeriesMvp } from './DotaSeriesMvp.jsx';
import { formatMvpScore } from '../lib/dota-mvp.js';
import { getMatchMapSlots, getPublishedMapStats } from '../lib/match-center.js';
import { getMatchMapClips } from '../lib/match-media.js';
import { useMatchMedia } from '../lib/match-media-client.js';
import { downloadResultCard } from '../lib/result-card.js';
import { publicUrl } from '../lib/public-url.js';
import { InternalLink, TeamLink } from './CommunityLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import { DotaHero } from './DotaHero.jsx';
import '../match-center.css';

const DOTA_ART = '/assets/atlas/backgrounds/dota2-river.webp';
const CS_ART = '/assets/atlas/backgrounds/cs2-river.webp';
const CORPORATE_ART = '/assets/atlas/backgrounds/corporate-river.webp';
const scoreText = (exact) => formatMvpScore(exact).replace('.', ',');
const durationText = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const numberText = (value) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) : '—';
const stateLabels = { available: 'Результат опубликован', scheduled: 'Ожидается', 'not-played': 'Не игралась', 'awaiting-data': 'Данные не опубликованы' };
const teamName = (match, id) => id === match.team1Id ? match.team1 : id === match.team2Id ? match.team2 : null;
const mapHeading = (slot, dota) => !slot ? 'Карты матча' : dota || /^Карта \d+$/.test(slot.name) ? `Карта ${slot.number}` : `Карта ${slot.number} · ${slot.name}`;
function mapArt(slot, dota) {
  if (dota) return '/assets/match-detail/dota-map-landscape.webp';
  const key = (slot?.name || '').toLowerCase().replace(/[\s_-]/g, '');
  const name = ({ dust2: 'dust2', dustii: 'dust2', mirage: 'mirage', nuke: 'nuke-panorama', inferno: 'inferno', anubis: 'anubis', ancient: 'ancient' })[key];
  return name ? `/assets/match-detail/cs2-${name}.webp` : null;
}
function ExternalLink({ children, className, href, ...props }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}<ArrowUpRight aria-hidden="true" /></a>;
}
function MatchTeam({ match, side }) {
  const name = match[`team${side}`], id = match[`team${side}Id`];
  return <div className={`mc-team mc-team--${side}`}><TeamLink tournamentId={match.tournamentId} name={name}><TeamLogo team={community.teams.get(id)} /><span>{name || 'Участник уточняется'}</span></TeamLink></div>;
}
function MapPicker({ slots, selected, onSelect, match, dota }) {
  return <section className="mc-maps" aria-labelledby="mc-series-title">
    <div className="mc-section-heading"><h2 id="mc-series-title">{slots.length > 1 ? 'Ход серии' : 'Карта матча'}</h2><p>Порядок счёта: {match.team1 || 'Команда 1'} — {match.team2 || 'Команда 2'}</p></div>
    <div className="mc-map-picker" role="group" aria-label="Выбор карты" style={{ '--map-count': slots.length }}>
      {slots.map((slot) => { const art = mapArt(slot, dota), result = slot.result, score = result?.kills || result?.score;
        return <button type="button" key={slot.key} className={`mc-map-tile${slot.key === selected?.key ? ' is-selected' : ''}${slot.state === 'not-played' ? ' is-unplayed' : ''}`} aria-pressed={slot.key === selected?.key} aria-controls="mc-map-detail" onClick={() => onSelect(slot.key)}>
          <span className="mc-map-picture">{art && <img src={art} alt="" loading="lazy" style={{ objectPosition: `${30 + slot.index * 15}% center` }} />}<span className="mc-map-name">{dota ? `Карта ${slot.number}` : slot.name}</span>{score && <strong>{score.join(' : ')}</strong>}{score && <small>{dota ? 'Убийства' : result?.unit || 'Раунды'}{result?.durationSeconds > 0 && ` · ${durationText(result.durationSeconds)}`}</small>}</span>
          <span className="mc-map-caption">{slot.winnerTeamId ? <><TeamLogo team={community.teams.get(slot.winnerTeamId)} /><span>Победа <b>{teamName(match, slot.winnerTeamId)}</b></span></> : <span>{slot.technical ? 'Техническое решение · не игралась' : stateLabels[slot.state]}</span>}{slot.key === selected?.key && <Check aria-label="Выбрана" weight="bold" />}</span>
        </button>;
      })}
    </div>
  </section>;
}
function MapSummary({ slot, match, dota, artwork }) {
  const result = slot?.result, score = result?.kills || result?.score;
  const mapUrl = safeHttps(result?.url || slot?.map?.url) || safeHttps((match.mapLinks || []).find((link) => String(link.matchId) === slot?.mapId)?.url);
  return <section className={`mc-map-summary${artwork ? '' : ' mc-map-summary--plain'}`} aria-labelledby="mc-map-title">
    {dota && artwork && slot?.state !== 'not-played' && <div className="mc-map-landscape" style={{ backgroundImage: "url('/assets/match-detail/dota-map-landscape.webp')" }} aria-hidden="true" />}
    <div className="mc-map-summary-copy"><p className="mc-eyebrow">{dota ? 'Dota 2' : 'Counter-Strike 2'} · {match.bestOf || 'Матч'}</p><h2 id="mc-map-title">{mapHeading(slot, dota)}</h2>
      {slot?.winnerTeamId && <p className="mc-map-winner">Победа <strong>{teamName(match, slot.winnerTeamId)}</strong></p>}
      {score ? <dl className="mc-map-numbers"><div><dd>{score.join(' : ')}</dd><dt>{dota ? 'Убийства' : result?.unit || 'Раунды'}</dt></div>{result.durationSeconds > 0 && <div><dd>{durationText(result.durationSeconds)}</dd><dt>Длительность</dt></div>}{!dota && <div><dd>{score[0] + score[1]}</dd><dt>Всего раундов</dt></div>}</dl> : <p className="mc-empty-message">{match.result.technical || slot?.technical ? 'Техническое решение без игры.' : stateLabels[slot?.state] || 'Результаты карт пока не опубликованы.'}</p>}
      {mapUrl && <ExternalLink href={mapUrl} className="mc-source-link">Статистика карты{dota ? ' на OpenDota' : ''}</ExternalLink>}
    </div>
  </section>;
}
function MapMvp({ mvp, dota, slot, match, artwork }) {
  const leaders = mvp?.leaders || [], estimated = Boolean(mvp?.estimatedMapIds?.length), noPlay = match.result.technical || slot?.state === 'not-played';
  const emptyTitle = noPlay ? 'Без сыгранной карты' : slot?.state === 'scheduled' ? 'После игры' : mvp?.availability === 'loading' ? 'Загружаем статистику…' : 'MVP ещё не опубликован';
  return <section className={`mc-mvp${dota ? ' mc-mvp--map' : ''}${leaders.length > 1 ? ' mc-mvp--tie' : ''}${!artwork ? ' mc-mvp--plain' : ''}`} aria-labelledby="mc-mvp-title">
    {!dota && artwork && <><img className="mc-mvp-art" src="/assets/match-detail/cs2-operator.webp" alt="" /><span className="mc-art-label">Иллюстрация</span></>}
    <div className="mc-mvp-copy"><h2 className="mc-eyebrow" id="mc-mvp-title"><Crown weight="fill" aria-hidden="true" />{leaders.length > 1 ? 'Лидеры MVP' : 'MVP'} · Карта {slot?.number || 1}</h2>
      {leaders.length ? <><div className="mc-mvp-leaders">{leaders.map((player) => <div key={player.accountId}><h3>{player.nickname}</h3><p>{player.teamNames?.join(' / ') || teamName(match, player.teamId)}</p>{dota && <DotaHero heroId={player.heroId} className="mc-mvp-hero" />}</div>)}</div>
        {dota ? <p className="mc-mvp-value"><strong>{scoreText(leaders[0].ratingExact)}</strong>Баллы MVP{estimated && <span>Расчётная оценка</span>}</p> : <p className="mc-mvp-value"><strong>{leaders.map((p) => `${numberText(p.kills)} / ${numberText(p.deaths)} / ${numberText(p.assists)}`).join(' · ')}</strong>K / D / A</p>}
        <p className="mc-mvp-note">{leaders.length > 1 ? dota ? 'Равные баллы. Единственный MVP не определён.' : 'Опубликовано несколько MVP карты.' : estimated ? 'По среднему турнира с поправкой на результат.' : dota ? 'По статистике выбранной карты. MVP может быть из проигравшей команды.' : 'MVP выбранной карты по опубликованным данным.'}</p>
      </> : <div className="mc-mvp-empty" role="status"><h3>{emptyTitle}</h3><p>{noPlay ? 'MVP не начисляется.' : 'Появится после подтверждения статистики игроков.'}</p></div>}
      {mvp?.correctionPendingMatchIds?.length > 0 && <p className="mc-notice">Статистика перепроверяется. Показан предыдущий подтверждённый расчёт.</p>}
      {mvp?.stale && leaders.length > 0 && <p className="mc-notice">Обновление задерживается. Показаны последние подтверждённые данные.</p>}
      {mvp?.availability === 'unavailable' && !leaders.length && !noPlay && <p className="mc-notice">Не удалось загрузить статистику. Повторим автоматически.</p>}
      {leaders.length > 0 && mvp?.preliminary && !estimated && !mvp.stale && !mvp.correctionPendingMatchIds?.length && <p className="mc-notice">Предварительный расчёт. Данные ещё уточняются.</p>}
    </div>
  </section>;
}
function RosterTable({ match, side, players, leaders, dota }) {
  const id = match[`team${side}Id`], team = community.teams.get(id), name = match[`team${side}`];
  const stats = players.filter((p) => (p.teamIds?.[0] || p.teamId) === id);
  const roster = team?.entries.find((entry) => entry.tournament.id === match.tournamentId)?.roster;
  return <section className={`mc-roster mc-roster--${side}`} aria-label={name || 'Команда уточняется'}><h3><TeamLogo team={team} /><TeamLink tournamentId={match.tournamentId} name={name} /></h3>
    {stats.length ? <div className="mc-table-scroll" tabIndex={0} role="region" aria-label={`Статистика ${name}`}><table><thead><tr><th scope="col">Игрок</th><th scope="col"><abbr title="Убийства / смерти / помощи">K / D / A</abbr></th><th scope="col">{dota ? <abbr title="Урон по героям">Урон</abbr> : <abbr title="Средний урон за раунд">ADR</abbr>}</th><th scope="col">{dota ? <abbr title="Баллы MVP выбранной карты">Баллы карты</abbr> : <abbr title="Процент попаданий в голову">HS %</abbr>}</th></tr></thead><tbody>{stats.map((player) => {
      const metrics = player.records?.[0]?.metrics, leader = leaders.some((p) => p.accountId === player.accountId);
      const kda = dota ? metrics ? `${numberText(metrics.K)} / ${numberText(metrics.L)} / ${numberText(metrics.A)}` : '—' : `${numberText(player.kills)} / ${numberText(player.deaths)} / ${numberText(player.assists)}`;
      const identity = <span className="mc-player-nickname">{player.nickname}{leader && <Crown weight="fill" aria-label="Лидер MVP карты" />}</span>;
      return <tr key={player.accountId} className={leader ? 'is-mvp' : ''}><th scope="row">{dota ? <DotaHero heroId={player.heroId}>{identity}</DotaHero> : identity}</th><td>{kda}</td><td>{numberText(dota ? metrics?.D : player.adr)}</td><td>{dota ? scoreText(player.ratingExact) : numberText(player.headshotPercent)}</td></tr>;
    })}</tbody></table></div> : roster?.members.length ? <><p className="mc-roster-label">Заявленный состав на турнир</p><ul className="mc-roster-list">{roster.members.map((member, index) => <li key={`${member.name}-${index}`}><strong>{member.name}</strong><span>{member.role}</span></li>)}</ul></> : <p className="mc-empty-message">Состав на этот турнир не опубликован.</p>}
  </section>;
}
function MatchContext({ match, tournament, slots }) {
  const consequence = matchConsequence(match, community, tournaments);
  const winner = match.result.winnerSide ? match[`team${match.result.winnerSide}`] : null;
  return <section className="mc-context"><h2>{match.result.confirmed ? 'Итог матча' : 'О матче'}</h2>
    {winner && <p><strong>{winner}</strong> побеждает{match.result.series ? ` со счётом ${(match.result.winnerSide === 2 ? [...match.result.series].reverse() : match.result.series).join(':')}` : ''}.</p>}{consequence && <p>{consequence}</p>}
    {!winner && !consequence && <p>{match.stageTitle} · {match.roundTitle}</p>}
    {slots.length > 1 && slots.some((s) => s.winnerTeamId) && <ol className="mc-series-recap">{slots.filter((s) => s.winnerTeamId).map((s) => <li key={s.key}><span>Карта {s.number}</span><TeamLogo team={community.teams.get(s.winnerTeamId)} /><strong>{teamName(match, s.winnerTeamId)}</strong></li>)}</ol>}
    <div className="mc-context-links"><InternalLink href={`/tournaments/${tournament.slug}#${match.stageId}`}>Открыть этап турнира <ArrowUpRight aria-hidden="true" /></InternalLink>{['winnerTo', 'loserTo'].map((field) => { const target = match[field], next = target && community.matches.get(matchKey(target.tournamentId || match.tournamentId, target.matchId)); return next ? <InternalLink key={field} href={matchPath(next)}>{field === 'winnerTo' ? 'Победитель' : 'Проигравший'} → {next.roundTitle}</InternalLink> : null; })}</div>
  </section>;
}
export function MatchCenterPage({ tournament, match, dotaState = null, theme = 'cs2' }) {
  const dota = tournament.discipline === 'Dota 2';
  const presentation = ['cs2', 'dota2', 'corporate'].includes(theme) ? theme : 'cs2';
  const heroArtwork = presentation === 'dota2' ? DOTA_ART : presentation === 'corporate' ? CORPORATE_ART : CS_ART;
  const gameArtwork = dota ? presentation === 'dota2' : presentation === 'cs2';
  const slots = getMatchMapSlots(match, dotaState?.snapshot);
  const [selection, setSelection] = useState(null);
  const selected = slots.find((s) => s.key === selection) || slots.find((s) => s.state === 'available') || slots[0];
  const [copyState, setCopyState] = useState(''), [downloadState, setDownloadState] = useState('');
  const mvp = dota ? getDotaMapMvp({ tournament, match, mapId: selected?.state === 'not-played' ? null : selected?.mapId, ...dotaState }) : getPublishedMapStats(match, selected);
  const seriesMvp = dota ? getDotaSeriesMvp({ tournament, match, ...dotaState }) : null;
  const players = mvp?.players || [], leaders = mvp?.leaders || [];
  const media = useMatchMedia({ tournamentId: tournament.id, matchId: match.id });
  const clips = selected ? getMatchMapClips(media.clips, selected) : [];
  const broadcasts = getMatchBroadcastLinks(match), vod = safeHttps(match.vodUrl || match.replayUrl);
  const highlights = (match.highlights || []).map((item) => ({ ...item, href: safeHttps(item.url) })).filter((item) => item.href);
  const winner = match.result.winnerSide ? match[`team${match.result.winnerSide}`] : null;
  const url = publicUrl(matchPath(match));
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopyState('Ссылка скопирована'); } catch { setCopyState('Скопируйте ссылку:'); } };
  const download = async () => { setDownloadState('loading'); try { await downloadResultCard(match, window.location.origin); setDownloadState('PNG передан браузеру для скачивания.'); } catch { setDownloadState('Не удалось подготовить PNG. Попробуйте ещё раз.'); } };
  return <main className={`match-center match-center--${dota ? 'dota' : 'cs2'}`} data-match-theme={presentation}>
    <section className="mc-hero" aria-labelledby="mc-title" style={{ backgroundImage: `url('${heroArtwork}')` }}>
      <nav className="mc-breadcrumb" aria-label="Путь к матчу"><InternalLink href="/tournaments">Турниры</InternalLink><span>/</span><InternalLink href={`/tournaments/${tournament.slug}`}>{tournament.title}</InternalLink><span>/</span><span aria-current="page">Матч</span></nav>
      <h1 id="mc-title" className="mc-title">{match.team1 || 'Участник уточняется'} — {match.team2 || 'Участник уточняется'}</h1>
      <div className="mc-scoreboard"><MatchTeam match={match} side={1} /><div className="mc-result"><p className="mc-round">{match.roundTitle}{match.bestOf && ` · ${match.bestOf}`}</p><p className="mc-date">{matchDateLabel(match)}</p><strong className="mc-score" aria-label={`${match.result.label || 'Счёт'}: ${match.result.score ? match.result.score.join(' : ') : 'не опубликован'}`}>{match.result.score ? match.result.score.join(' : ') : '— : —'}</strong><p className={`mc-status mc-status--${match.status}`}>{matchStates[match.status] || matchStates.unknown}</p><span className="mc-score-label">{match.result.score ? match.result.label : match.result.confirmed ? 'Смысл счёта уточняется' : 'Итог не подтверждён'}</span><img className="mc-game-mark" src={`/assets/games/${dota ? 'dota2' : 'counterstrike'}.svg`} alt={dota ? 'Dota 2' : 'Counter-Strike 2'} /></div><MatchTeam match={match} side={2} /></div>
      {(match.status === 'scheduled' || match.technicalMapNumbers?.length > 0) && match.note && <p className="mc-schedule-note">{match.note}</p>}
    </section>
    <div className="mc-outcome"><div className="mc-outcome-copy">{winner && <Trophy weight="duotone" aria-hidden="true" />}<div><h2>{winner ? `${winner} выигрывает ${slots.length > 1 ? 'серию' : 'матч'}` : matchStates[match.status] || matchStates.unknown}</h2><p>{match.result.technical ? 'Техническое решение' : match.result.confirmed ? `${match.stageTitle} · ${match.roundTitle}` : matchDateLabel(match)}</p></div></div><div className="mc-actions">{vod && <ExternalLink href={vod} className="mc-button mc-button--primary"><Play weight="fill" aria-hidden="true" />Смотреть запись</ExternalLink>}{broadcasts.map(({ platform, href, label }) => <ExternalLink key={platform} className={`mc-button mc-stream--${platform}`} href={href} aria-label={label}>{platform === 'twitch' ? <TwitchLogo weight="fill" aria-hidden="true" /> : <Play weight="fill" aria-hidden="true" />}{platform === 'twitch' ? 'Twitch' : 'VK Видео'}</ExternalLink>)}<button className="mc-button mc-share" type="button" onClick={copy}><Copy aria-hidden="true" />Поделиться</button></div></div>
    {(match.resultIssue || match.scoreKind === 'unknown') && match.result.sourceScore && <p className="mc-notice mc-source-issue">Опубликованный счёт: {match.result.sourceScore.join(':')}. {match.resultIssue || 'Единицы счёта уточняются.'}</p>}
    {copyState && <div className="mc-copy-feedback" role="status">{copyState}{copyState !== 'Ссылка скопирована' && <input readOnly value={url} aria-label="Ссылка на матч" onFocus={(event) => event.target.select()} />}</div>}
    {dota && <DotaSeriesMvp mvp={seriesMvp} match={match} />}
    {slots.length > 1 && <MapPicker slots={slots} selected={selected} onSelect={setSelection} match={match} dota={dota} />}
    {slots.length <= 1 && <nav className="mc-section-nav" aria-label="Разделы матча"><a href="#mc-map-detail">Обзор</a>{!match.result.technical && <a href="#mc-stats-title">Составы и статистика</a>}{clips.length > 0 && <a href="#mc-clips-title">Видео</a>}</nav>}
    <div id="mc-map-detail" className="mc-map-detail" aria-live="polite"><MapSummary slot={selected} match={match} dota={dota} artwork={gameArtwork} /><MapMvp slot={selected} match={match} mvp={mvp} dota={dota} artwork={gameArtwork} /></div>
    {selected?.state !== 'not-played' && !match.result.technical && <section className="mc-statistics" aria-labelledby="mc-stats-title"><div className="mc-section-heading"><h2 id="mc-stats-title">Составы и статистика{selected ? ` · Карта ${selected.number}` : ''}</h2>{slots.length > 1 && <label className="mc-map-select"><span className="mc-sr-only">Карта для статистики</span><select value={selected?.key || ''} onChange={(event) => setSelection(event.target.value)}>{slots.map((s) => <option key={s.key} value={s.key}>{mapHeading(s, dota)}{s.state === 'not-played' ? ' · Не игралась' : ''}</option>)}</select></label>}</div>
      <div className="mc-rosters"><RosterTable match={match} side={1} players={players} leaders={leaders} dota={dota} /><RosterTable match={match} side={2} players={players} leaders={leaders} dota={dota} /></div>
      <p className="mc-statistics-note">{players.length ? mvp?.estimatedMapIds?.length ? 'Баллы MVP рассчитаны по среднему турнира. Индивидуальная статистика не получена — вместо неё стоят прочерки.' : dota ? 'K / D / A — убийства / смерти / помощи. Урон — по героям. Баллы MVP рассчитаны для выбранной карты.' : 'Показатели относятся к выбранной карте.' : 'Статистика игроков выбранной карты пока не опубликована. Заявленный состав может отличаться от состава в игре.'}</p>
    </section>}
    <div className={`mc-bottom${clips.length ? ' has-clips' : ''}`}>{clips.length > 0 && <section className="mc-clips" aria-label={`Моменты карты ${selected.number}`}><h2 id="mc-clips-title">Момент карты {selected.number}</h2>{clips.map((clip) => <ExternalLink key={clip.id} className="mc-clip" href={clip.href}><span className="mc-clip-play"><Play weight="fill" aria-hidden="true" /></span><span><strong>{clip.title || `Момент карты ${selected.number}`}</strong><small>{clip.kind === 'recording' ? `Запись · с ${durationText(clip.startSeconds || 0)}` : 'Смотреть клип'}</small></span></ExternalLink>)}</section>}<MatchContext match={match} tournament={tournament} slots={slots} /></div>
    <footer className="mc-footer"><InternalLink className="mc-button" href={`/tournaments/${tournament.slug}#matches`}>Все матчи турнира <ArrowRight aria-hidden="true" /></InternalLink><div className="mc-footer-links">{highlights.map(({ title, href }) => <ExternalLink key={href} href={href}>{title || 'Видео матча'}</ExternalLink>)}<button type="button" onClick={download} disabled={!match.result.canDownload || downloadState === 'loading'}><DownloadSimple aria-hidden="true" />{downloadState === 'loading' ? 'Готовим карточку…' : 'Скачать результат'}</button></div>{downloadState && downloadState !== 'loading' && <p role="status">{downloadState}</p>}</footer>
  </main>;
}
