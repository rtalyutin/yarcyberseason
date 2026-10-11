import { ArrowRight } from '@phosphor-icons/react';
import { getMatchBroadcastLinks } from '../lib/broadcasts.js';
import { safeHttps } from '../lib/community.js';

export function BroadcastLinks({ match, className = 'md-link' }) {
  return getMatchBroadcastLinks(match).map((link) => <a className={className} href={link.href} key={link.platform} target="_blank" rel="noreferrer">
    {link.label} <ArrowRight aria-hidden="true" />
  </a>);
}

export function BroadcastActions({ match, className = 'broadcast-actions', linkClassName = 'md-link' }) {
  if (!getMatchBroadcastLinks(match).length) return null;
  return <div className={className} aria-label="Трансляция матча"><BroadcastLinks match={match} className={linkClassName} /></div>;
}

export function MatchCasters({ match, className = 'match-casters' }) {
  const casters = (Array.isArray(match?.casters) ? match.casters : []).filter((caster) =>
    typeof caster === 'string' ? caster.trim() : typeof caster?.name === 'string' && caster.name.trim());
  if (!casters.length) return null;
  return <p className={className}>Комментаторы: {casters.map((caster, index) => {
    const name = typeof caster === 'string' ? caster.trim() : caster.name.trim();
    const url = typeof caster === 'object' ? safeHttps(caster.url) : null;
    return <span key={`${name}-${index}`}>{index > 0 && ' · '}{url ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : name}</span>;
  })}</p>;
}
