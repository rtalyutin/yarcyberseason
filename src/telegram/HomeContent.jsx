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
  const { match, state, score, previous } = content;
  return <section className={`tg-home-board tg-home-board--${state}`} aria-label="Табло сезона">
    <p className="tg-kicker">{content.label}</p>
    {match && <>
      <p className="tg-home-match-meta">{content.date} · {content.format}</p>
      <div className="tg-home-match-teams"><strong>{match.team1}</strong>
        <span aria-label={score ? `${state === 'technical' ? 'Технический счёт' : 'Счёт серии'} ${score.join(':')}` : 'Против'}>{score ? score.join(' : ') : 'VS'}</span>
        <strong>{match.team2}</strong></div>
    </>}
    {content.note && <p className="tg-home-note">{content.note}</p>}
    {previous && <p className="tg-home-note">{previous.technical ? 'Предыдущий технический результат' : 'Предыдущий эфир'}: {previous.match.team1} {previous.score.join(':')} {previous.match.team2}</p>}
    {content.streamUrl && <HomeExternalLink className="tg-primary" href={content.streamUrl} runtime={runtime}>Смотреть эфир <span aria-hidden="true">↗</span></HomeExternalLink>}
    <button className={content.streamUrl ? 'tg-secondary' : 'tg-primary'} onClick={() => navigate(tournamentRoute('matches', tournamentSlug))}>{content.actionLabel}<span aria-hidden="true">→</span></button>
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
