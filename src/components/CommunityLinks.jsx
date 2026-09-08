import { createContext, useContext } from 'react';
import { community } from '../data/community.js';
import config from '../data/community-config.json';
import { matchKey, matchPath, safeHttps, teamPath } from '../lib/community.js';

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
export function MatchLink({ tournamentId, matchId, className = '' }) {
  const match = community.matches.get(matchKey(tournamentId, matchId));
  return match ? <InternalLink href={matchPath(match)} className={`community-match-link ${className}`}>Страница матча <span aria-hidden="true">↗</span></InternalLink> : null;
}
export function CommunitySearch() {
  const url = safeHttps(config.teamSearchChatUrl);
  const soloUrl = safeHttps(config.soloRegistrationUrl);
  return <div className="community-search">
    {soloUrl && <p>Нет команды? <a href={soloUrl} target="_blank" rel="noreferrer">Зарегистрироваться как соло-игрок ↗</a></p>}
    <p>Поиск команды и игроков — в чате сообщества</p>
    {url ? <div><a href={url} target="_blank" rel="noreferrer">Найти команду ↗</a><a href={url} target="_blank" rel="noreferrer">Нужен игрок ↗</a></div> : <span>Ссылка на чат появится позже</span>}
  </div>;
}
