import { ArrowUpRight, TwitchLogo } from '@phosphor-icons/react';
import { getMatchBroadcastLinks } from '../lib/broadcast-links.js';

export function MatchBroadcastLinks({ match }) {
  const links = getMatchBroadcastLinks(match);
  if (!links.length) return null;
  return <div className="tn-broadcasts" aria-label="Трансляции матча">
    <span className="tn-broadcasts-label">Трансляции</span>
    <div className="tn-broadcasts-links">{links.map(({ platform, label, href }) => <a className="tn-broadcast-link" href={href} key={platform} target="_blank" rel="noopener noreferrer">
      {platform === 'twitch' ? <TwitchLogo aria-hidden="true" /> : <span className="tn-vk-icon" aria-hidden="true">VK</span>}
      <span>{label}</span><ArrowUpRight aria-hidden="true" />
    </a>)}</div>
  </div>;
}
