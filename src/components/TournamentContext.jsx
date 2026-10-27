import { InternalLink } from './CommunityLinks.jsx';
import { ArrowRight } from '@phosphor-icons/react';

export function TournamentContext({ tournament, home = false }) {
  if (!tournament) return null;
  const root = `/tournaments/${tournament.slug}`;
  return <aside className="site-tournament-context" aria-label="Навигация по турниру">
    <div><span>{home ? 'Турнир сезона' : 'Вы в турнире'}</span><InternalLink href={root}>{tournament.title} <ArrowRight aria-hidden="true" /></InternalLink><small>{tournament.dates?.display}</small></div>
    <nav aria-label="Быстрые переходы"><InternalLink href={root}>Открыть турнир</InternalLink><InternalLink href={`${root}?section=matches&phase=all`}>Все матчи</InternalLink><InternalLink href="/tournaments">Все турниры</InternalLink></nav>
  </aside>;
}
