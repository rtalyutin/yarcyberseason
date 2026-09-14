import { safeHttps } from '../lib/community.js';
import '../match-map-links.css';

export function MatchMapLinks({ match }) {
  if (match.status !== 'completed' || match.resultConfirmed !== true) return null;
  const links = (match.mapLinks || []).map((link, index) => ({
    ...link, href: safeHttps(link.url), number: index + 1,
  })).filter((link) => link.href);
  if (!links.length) return null;

  return <div className="match-map-links" role="group" aria-label="Статистика карт на OpenDota">
    <span className="match-map-links-label">OpenDota</span>
    {links.map((link) => <a key={link.matchId} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`Карта ${link.number}: статистика на OpenDota, новая вкладка`}>
      Карта {link.number}<span aria-hidden="true">↗</span>
    </a>)}
  </div>;
}
