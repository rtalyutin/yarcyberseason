import { createContext, useContext } from 'react';
import { community } from '../data/community.js';
import { matchKey, matchPath, teamPath } from '../lib/community.js';

export const NavigationContext = createContext(null);
export function InternalLink({ href, children, ...props }) {
  const navigate = useContext(NavigationContext);
  return <a {...props} href={href} onClick={(event) => {
    if (navigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(href); }
  }}>{children}</a>;
}
export function TeamLink({ tournamentId, name, children, className = '' }) {
  const team = community.resolveTeam(tournamentId, name);
  return team ? <InternalLink href={teamPath(team.id)} className={`community-team-link ${className}`}>{children || name}</InternalLink> : <span className={className}>{children || name || 'Участник уточняется'}</span>;
}
export function MatchLink({ tournamentId, matchId, className = '', children }) {
  const match = community.matches.get(matchKey(tournamentId, matchId));
  return match ? <InternalLink href={matchPath(match)} className={`community-match-link ${className}`}>{children || <>Страница матча <span aria-hidden="true">↗</span></>}</InternalLink> : null;
}
