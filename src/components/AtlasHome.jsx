import { useEffect, useRef, useState } from 'react';
import { loadHomeContent } from '../data/home-content.js';
import { community } from '../data/community.js';
import { getTournamentOutcome, hasScore, isFinished } from '../lib/tournament.js';
import { safeHttps } from '../lib/community.js';
import { InternalLink, TeamLink } from './CommunityLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import { ClickHighlight } from './ClickHighlight.jsx';
import { TechiesEgg } from './TechiesEgg.jsx';
import { BroadcastLinks, MatchCasters } from './BroadcastLinks.jsx';
import '../atlas-home.css';

function SectionHeading({ number, title, id, children }) {
  return <div className="atlas-home-section-heading"><span aria-hidden="true">{number}</span><h2 id={id}>{title}</h2>{children}</div>;
}

function TournamentCard({ tournament }) {
  const root = `/tournaments/${tournament.slug}`;
  const outcome = getTournamentOutcome(tournament);
  return <article className="atlas-home-tournament atlas-home-panel">
    <div className="atlas-home-tournament-copy">
      <p className="atlas-home-kicker">{tournament.discipline}</p>
      <h3>{tournament.title}</h3>
      <p className="atlas-home-date">{tournament.dates.display}</p>
      <p className="atlas-home-status">{tournament.statusLabel}</p>
      {outcome?.champion && <p className="atlas-home-champion"><span>Чемпион</span><TeamLink tournamentId={tournament.id} name={outcome.champion} /></p>}
    </div>
    <div className="atlas-home-card-scene" aria-hidden="true" />
    <div className="atlas-home-card-actions"><InternalLink className="atlas-home-button" href={root}>Открыть турнир</InternalLink><InternalLink className="atlas-home-text-link" href={`${root}?section=matches`}>Матчи <span aria-hidden="true">→</span></InternalLink></div>
  </article>;
}

function FinalTeam({ tournament, name, side }) {
  return <div className={`atlas-home-final-team atlas-home-final-team--${side}`}>
    <TeamLogo team={community.resolveTeam(tournament.id, name)} logo={tournament.teamLogos?.[name]} />
    <TeamLink tournamentId={tournament.id} name={name} />
  </div>;
}

function Partner({ partner, official = false }) {
  const url = safeHttps(partner.homeUrl || partner.url);
  const Tag = url ? 'a' : 'div';
  const logo = official ? partner.logoUrl : partner.homeLogoUrl || partner.logoUrl;
  return <Tag className={`atlas-home-partner atlas-home-partner--${partner.id}${official ? ' atlas-home-partner--official' : ''}`}
    {...(url ? { href: url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${partner.name} — сайт партнёра (новая вкладка)` } : {})}>
    {logo ? <span className="atlas-home-partner-logo"><img src={logo} alt={partner.name} loading="lazy" decoding="async" /></span> : <strong>{partner.name}</strong>}
    <span>{official ? partner.name : partner.homeRole || partner.description}</span>
  </Tag>;
}

export function AtlasHome({ theme = 'cs2' }) {
  const heroImageRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const home = loadHomeContent(now);
  const tournament = home.featuredTournament;
  const root = `/tournaments/${tournament.slug}`;
  const featured = [...new Map([tournament, home.season.tournament].map((entry) => [entry.id, entry])).values()];
  const final = home.outcome?.final;
  const finalScore = final && isFinished(final) && hasScore(final);
  const board = home.broadcast;
  const scene = theme === 'cs2' ? '/assets/home-team-stage.webp' : `/assets/atlas/backgrounds/${theme === 'dota2' ? 'dota2' : 'corporate'}-river.webp`;

  return <main className="atlas-home container">
    <section className="atlas-home-intro" aria-labelledby="home-title">
      <div><p className="atlas-home-kicker">ЯрКиберСезон · Ярославль</p><h1 id="home-title">Твой город. Твоя лига.</h1><p>Турниры Ярославля. Команды, эфиры и история каждого сезона.</p></div>
      <div className="atlas-home-miniature"><img ref={heroImageRef} src={scene} alt="" width="1672" height="941" />{theme === 'cs2' && <ClickHighlight key="cs2-highlight" imageRef={heroImageRef} />}{theme === 'dota2' && <TechiesEgg />}</div>
    </section>

    <section className="atlas-home-section" aria-labelledby="atlas-tournaments-title">
      <SectionHeading number="01" title="Турниры" id="atlas-tournaments-title"><InternalLink href="/tournaments">Все сезоны <span aria-hidden="true">→</span></InternalLink></SectionHeading>
      <div className="atlas-home-tournaments">{featured.map((entry) => <TournamentCard key={entry.id} tournament={entry} />)}</div>
      <ul className="atlas-home-facts" aria-label={`${tournament.title}: турнир в цифрах`}>{home.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
    </section>

    <section className="atlas-home-section" aria-labelledby="atlas-final-title">
      <SectionHeading number="02" title="Финал сезона" id="atlas-final-title" />
      <article className="atlas-home-final atlas-home-panel">
        <p className="atlas-home-kicker">{tournament.discipline} · Грандфинал{final?.bestOf ? ` · ${final.bestOf}` : ''}{finalScore ? ' · Счёт серии' : ''}</p>
        {final ? <div className="atlas-home-final-scoreboard"><FinalTeam tournament={tournament} name={final.team1} side="first" /><strong className="atlas-home-score" aria-label={finalScore ? `Счёт серии ${final.score1}:${final.score2}` : 'Счёт пока не опубликован'}>{finalScore ? <>{final.score1}<span>:</span>{final.score2}</> : 'VS'}</strong><FinalTeam tournament={tournament} name={final.team2} side="second" /></div> : <p className="atlas-home-pending">{home.completed ? 'Итог грандфинала ожидает публикации.' : 'Участники финала определятся по ходу турнира.'}</p>}
        <div className="atlas-home-final-bottom"><span>{finalScore ? 'Завершён' : home.completed ? 'Итог уточняется' : 'Впереди'}</span><div>{final && <InternalLink className="atlas-home-text-link" href={`${root}/matches/${final.id}`}>Страница матча <span aria-hidden="true">→</span></InternalLink>}<InternalLink className="atlas-home-text-link" href={`${root}?section=results`}>Итоги турнира <span aria-hidden="true">→</span></InternalLink></div></div>
      </article>
      {home.outcome?.placements.length > 0 && <ol className="atlas-home-podium" aria-label="Подтверждённые призовые места">{home.outcome.placements.filter((place) => place.position <= 3).map((place) => <li key={`${place.position}-${place.team}`} value={place.position}><span>{String(place.position).padStart(2, '0')}</span><TeamLink tournamentId={tournament.id} name={place.team} /></li>)}</ol>}
      {tournament.discipline === 'Dota 2' && <InternalLink className="atlas-home-text-link atlas-home-mvp-link" href={`${root}?section=mvp`}>MVP турнира и расчёт <span aria-hidden="true">→</span></InternalLink>}
    </section>

    <section className="atlas-home-section" aria-labelledby="atlas-calendar-title">
      <SectionHeading number="03" title="Календарь и эфиры" id="atlas-calendar-title" />
      <div className="atlas-home-calendar atlas-home-panel">
        {home.completed ? <><h3>Следующий сезон — после анонса</h3><p>Новые даты ещё не объявлены. {home.telegramUrl && <a href={home.telegramUrl} target="_blank" rel="noopener noreferrer">Следить за новостями в Telegram <span aria-hidden="true">↗</span></a>}</p></> : <><p className="atlas-home-kicker">{board.label}</p><h3>{board.match ? `${board.match.team1} — ${board.match.team2}` : tournament.title}</h3>{board.date && <p>{board.date} · {board.format}</p>}{board.note && <p>{board.note}</p>}<MatchCasters match={board.match} /><div className="atlas-home-card-actions">{board.state !== 'completed' && <BroadcastLinks match={board.match} className="atlas-home-button" />}<InternalLink className="atlas-home-text-link" href={tournament.matchday?.route || `${root}?section=matches`}>Расписание матчей →</InternalLink></div></>}
        <div className="atlas-home-calendar-links"><InternalLink href={tournament.matchday?.route || `${root}?section=matches`}>Программа матчей →</InternalLink><InternalLink href="/broadcasts">Все эфиры →</InternalLink><InternalLink href="/results">Архив результатов →</InternalLink></div>
      </div>
    </section>

    <section className="atlas-home-section atlas-home-partners-section" aria-labelledby="atlas-partners-title">
      <SectionHeading number="04" title="Партнёры сезона" id="atlas-partners-title"><InternalLink href="/partners">Проект в цифрах <span aria-hidden="true">→</span></InternalLink></SectionHeading>
      <div className="atlas-home-partners" aria-label="Партнёры турнира">{home.partners.map((partner) => <Partner key={partner.id || partner.name} partner={partner} />)}</div>
      {home.finalPartners.length > 0 && <div className="atlas-home-final-partners"><h3>Спасибо партнёрам финала</h3><ul>{home.finalPartners.map((partner) => { const url = safeHttps(partner.homeUrl || partner.url); return <li key={partner.id}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{partner.name} ↗</a> : partner.name}</li>; })}</ul></div>}
      {home.officialSupport.length > 0 && <div className="atlas-home-official-support"><h3>При поддержке</h3><div>{home.officialSupport.map((partner) => <Partner key={partner.id || partner.name} partner={partner} official />)}</div></div>}
    </section>
  </main>;
}
