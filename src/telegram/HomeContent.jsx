import React from 'react';
import { tournamentRoute } from './contracts.js';
import { hasScore, isFinished } from '../lib/tournament.js';
import { projectLegal } from '../data/project-content.js';

const websiteOrigin = 'https://xn--90aiaibl0ahlel5n.xn--p1ai';

export function HomeExternalLink({ href, runtime, children, ...props }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} onClick={(event) => {
    if (!runtime || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    runtime.openExternal({ kind: 'external', label: typeof children === 'string' ? children : 'Открыть', url: href });
  }}>{children}</a>;
}

export function HomeBroadcastCard({ content, tournamentSlug, navigate, runtime }) {
  const { match, state, score } = content;
  return <section className={`tg-home-board tg-home-board--${state}`} aria-label="Табло сезона">
    <p className="tg-kicker">{content.label}</p>
    {match && <>
      <p className="tg-home-match-meta">{content.date} · {content.format}</p>
      <div className="tg-home-match-teams"><strong>{match.team1}</strong>
        <span aria-label={score ? `${state === 'technical' ? 'Технический счёт' : 'Счёт серии'} ${score.join(':')}` : 'Против'}>{score ? score.join(' : ') : 'VS'}</span>
        <strong>{match.team2}</strong></div>
    </>}
    {content.note && <p className="tg-home-note">{content.note}</p>}
    {content.casters?.length > 0 && <p className="tg-home-note">Комментатор: {content.casters.map((caster, index) => <React.Fragment key={caster.name}>{index > 0 && ' · '}{caster.url ? <HomeExternalLink href={caster.url} runtime={runtime}>{caster.name}</HomeExternalLink> : caster.name}</React.Fragment>)}</p>}
    {content.links?.map((link) => <HomeExternalLink className="tg-primary" key={link.platform} href={link.href} runtime={runtime}>{link.label} <span aria-hidden="true">↗</span></HomeExternalLink>)}
    <button className={content.links?.length ? 'tg-secondary' : 'tg-primary'} onClick={() => navigate(tournamentRoute(content.actionSection || 'matches', tournamentSlug))}>{content.actionLabel}<span aria-hidden="true">→</span></button>
  </section>;
}

export function HomeFinaleCard({ content, navigate, runtime }) {
  const { featuredTournament: tournament, outcome } = content;
  const final = outcome?.final;
  return <section className="tg-home-board tg-home-board--completed" aria-label="Итоги сезона">
    <p className="tg-kicker">Грандфинал</p>
    {final ? <><p className="tg-finale-score" aria-label={`Счёт серии ${final.score1}:${final.score2}`}>{final.score1} : {final.score2}</p><p>{final.team1} — {final.team2} · {final.bestOf}</p></> : <p>Итог грандфинала ожидает публикации.</p>}
    {outcome?.placements.length > 0 && <ol className="tg-finale-podium">{outcome.placements.filter((place) => place.position <= 3).map((place) => <li key={`${place.position}-${place.team}`} value={place.position}>{place.team}</li>)}</ol>}
    <button className="tg-primary" onClick={() => navigate(tournamentRoute('results', tournament.slug))}>Итоги турнира →</button>
    {tournament.results?.finalMatchId && <HomeExternalLink className="tg-secondary" href={`${websiteOrigin}/tournaments/${tournament.slug}/matches/${tournament.results.finalMatchId}`} runtime={runtime}>Грандфинал ↗</HomeExternalLink>}
    {tournament.discipline === 'Dota 2' && <HomeExternalLink className="tg-secondary" href={`${websiteOrigin}/tournaments/${tournament.slug}?section=mvp`} runtime={runtime}>MVP турнира и расчёт ↗</HomeExternalLink>}
    {content.telegramUrl && <HomeExternalLink className="tg-secondary" href={content.telegramUrl} runtime={runtime}>Следующий анонс — в Telegram ЯКС ↗</HomeExternalLink>}
  </section>;
}

export function HomeSeasonCard({ season, navigate }) {
  const { tournament, match, outcome, finished } = season;
  return <section className="tg-home-season" aria-labelledby="tg-season-title">
    <p className="tg-kicker">{finished ? 'ТУРНИР ЗАВЕРШЁН' : 'СЕЙЧАС В СЕЗОНЕ'}</p>
    <h2 id="tg-season-title">{tournament.title}</h2>
    <p className="tg-home-match-meta">{tournament.dates.display}</p>
    {match && <>
      {outcome?.champion && <p className="tg-home-champion">Чемпион <strong>{outcome.champion}</strong></p>}
      <p className="tg-home-match-meta">{match.dateDisplay}{match.time ? ` · ${match.time}` : ''} · {match.roundLabel} · {match.bestOf}</p>
      <div className="tg-home-match-teams"><strong>{match.team1}</strong><span>{isFinished(match) && hasScore(match) ? `${match.score1}:${match.score2}` : 'VS'}</span><strong>{match.team2}</strong></div>
      <button className="tg-secondary" onClick={() => navigate(tournamentRoute(finished ? 'results' : 'matches', tournament.slug))}>{finished ? 'Итоги турнира' : 'Открыть Matchday'} <span aria-hidden="true">→</span></button>
    </>}
  </section>;
}

export function HomeLegalFooter({ content, navigate, runtime }) {
  return <footer className="tg-home-footer">
    <div><p><strong>{projectLegal.companyName}</strong></p>
      <address>{projectLegal.address[0]}<br />{projectLegal.address[1]}</address>
      <p>{projectLegal.identifiers}</p>
    </div>
    <nav aria-label="Документы и контакты">
      <a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a>
      <HomeExternalLink href={`${websiteOrigin}/about#requisites`} runtime={runtime}>Контакты и реквизиты</HomeExternalLink>
      <HomeExternalLink href={`${websiteOrigin}/webmcp`} runtime={runtime}>Данные для ИИ</HomeExternalLink>
      <HomeExternalLink href={projectLegal.privacyUrl} runtime={runtime}>Политика обработки персональных данных</HomeExternalLink>
      <button type="button" onClick={() => navigate(tournamentRoute('rules', content.featuredTournament.slug))}>Правила участия</button>
    </nav>
    <p className="tg-home-copyright">{projectLegal.copyright}</p>
  </footer>;
}
