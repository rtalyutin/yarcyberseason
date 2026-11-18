import { ArrowUpRight } from '@phosphor-icons/react';
import { tournaments } from '../data/tournaments/index.js';
import { filterTournamentDirectory } from '../lib/site-navigation.js';
import { InternalLink } from './CommunityLinks.jsx';

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function seasonDate(tournament) {
  const date = tournament.dates?.end || tournament.dates?.start;
  if (!date) return tournament.dates?.display || tournament.season;
  return monthFormat.formatToParts(new Date(date)).filter(part => ['month', 'year'].includes(part.type)).map(part => part.value).join(' ');
}

export function Cs2HomeCover() {
  const recent = filterTournamentDirectory(tournaments).slice(0, 3);
  return <>
    <section className="cs2-cover" aria-labelledby="home-title">
      <img className="cs2-cover-player" src="/assets/ycs-home-jersey.webp" width="928" height="755" alt="Игрок в форме ЯрКиберСезона перед турнирной сценой" fetchPriority="high" />
      <div className="cs2-cover-copy">
        <p>Киберспорт Ярославля</p>
        <h1 id="home-title" aria-label="ЯрКиберСезон"><span>ЯрКибер</span><span>Сезон</span></h1>
        <p>Твой город. Твоя лига.</p>
        <InternalLink href="/tournaments" className="cs2-cover-action">Смотреть турниры <ArrowUpRight aria-hidden="true" /></InternalLink>
      </div>
    </section>
    <section className="cs2-index" aria-labelledby="atlas-tournaments-title">
      <header><h2 id="atlas-tournaments-title">Турниры</h2><InternalLink href="/results">Весь архив ↗</InternalLink></header>
      <ul>{recent.map(t => <li key={t.id}><InternalLink href={`/tournaments/${t.slug}`}>
        <span className="cs2-index-date">{seasonDate(t)}</span>
        <strong>{t.title.replace(/^CS2 · /, '').replace(/^(CS2|Dota 2) \/ YCS$/, 'ЯрКиберСезон')}</strong>
        <span className="cs2-index-game">{t.discipline === 'Counter-Strike 2' ? 'CS2' : t.discipline} <ArrowUpRight aria-hidden="true" /></span>
      </InternalLink></li>)}</ul>
    </section>
  </>;
}
