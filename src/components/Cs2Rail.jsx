import { InternalLink } from './CommunityLinks.jsx';

export function Cs2Rail() {
  return <div className="cs2-rail">
    <InternalLink href="/" aria-label="ЯрКиберСезон — на главную"><img src="/assets/ycs-wordmark.webp" width="620" height="211" alt="" /></InternalLink>
    <span className="cs2-rail-city" aria-hidden="true">Ярославль</span>
    <span className="cs2-rail-game" aria-hidden="true">CS<b>2</b></span>
  </div>;
}
