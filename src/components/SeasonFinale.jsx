import React from 'react';
import { InternalLink, TeamLink } from './CommunityLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import { community } from '../data/community.js';
import { getConfirmedPartners } from '../data/project-content.js';
import { safeHttps } from '../lib/community.js';

export function SeasonFinale({ content }) {
  const { featuredTournament: tournament, outcome, telegramUrl } = content;
  const champion = outcome?.placements.find((entry) => entry.position === 1);
  const final = outcome?.final;
  const root = `/tournaments/${tournament.slug}`;
  return <div className="home-victory container">
    <div className="home-victory-identity">
      <p className="home-kicker">{champion ? 'ПОБЕДИТЕЛЬ ТУРНИРА' : 'ТУРНИР ЗАВЕРШЁН'} · {tournament.discipline}</p>
      {champion && <div className="home-victory-emblem"><TeamLogo team={community.resolveTeam(tournament.id, champion.team)} logo={tournament.teamLogos?.[champion.team]} /></div>}
      <h1 id="home-title">{champion?.team || 'GG. Турнир завершён.'}</h1>
      <p className="home-victory-caption">{tournament.season}<br />{tournament.dates.display}</p>
      <ul className="home-victory-facts" aria-label="Турнир в цифрах">{content.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
    </div>
    <div className="home-victory-results">
      <p className="home-kicker">ГРАНДФИНАЛ</p>
      {final ? <><p className="home-victory-score" aria-label={`Счёт серии ${final.score1}:${final.score2}`}>{final.score1}<span>:</span>{final.score2}</p><p className="home-victory-match">{final.team1} — {final.team2}<span>{final.bestOf}</span></p></> : <p className="home-victory-pending">Итог грандфинала ожидает публикации.</p>}
      {outcome?.placements.length > 0 && <ol className="home-victory-podium" aria-label="Подтверждённые призовые места">{outcome.placements.filter((place) => place.position <= 3).map((place) => <li key={`${place.position}-${place.team}`} value={place.position}><span>{String(place.position).padStart(2, '0')}</span><TeamLink tournamentId={tournament.id} name={place.team} /></li>)}</ol>}
      <div className="home-victory-actions">
        <InternalLink className="button button--primary" href={`${root}?section=results`}>Итоги турнира</InternalLink>
        {tournament.results?.finalMatchId && <InternalLink className="button button--secondary" href={`${root}/matches/${tournament.results.finalMatchId}`}>Грандфинал</InternalLink>}
        {tournament.discipline === 'Dota 2' && <InternalLink className="home-victory-link" href={`${root}?section=mvp`}>MVP турнира и расчёт →</InternalLink>}
      </div>
      {telegramUrl && <a className="home-victory-follow" href={telegramUrl} target="_blank" rel="noopener noreferrer">Следующий анонс — в Telegram ЯКС ↗</a>}
    </div>
  </div>;
}

// The same scoped acknowledgements stay with the archived event and its home.
export function TournamentThanks({ tournament }) {
  const partners = getConfirmedPartners(tournament);
  const groups = [['tournament', 'Партнёры турнира'], ['final', 'Партнёры финала'], ['official', 'При поддержке']]
    .map(([scope, title]) => ({ scope, title, entries: partners.filter((entry) => entry.scope === scope) }))
    .filter((group) => group.entries.length);
  if (!groups.length) return null;
  return <section className="season-thanks" aria-label="Благодарность партнёрам">
    <h2>Спасибо за этот сезон.</h2>
    <p>За поддержку турнира, грандфинала и наших игроков.</p>
    <div className="season-thanks-groups">{groups.map(({ scope, title, entries }) => <div key={scope}><h3>{title}</h3><ul>{entries.map((entry) => {
      const href = safeHttps(entry.homeUrl || entry.url);
      return <li key={entry.id}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{entry.name} ↗</a> : <span>{entry.name}</span>}{entry.id === 'torrefacto' && <small>{entry.homeRole}</small>}</li>;
    })}</ul></div>)}</div>
  </section>;
}
