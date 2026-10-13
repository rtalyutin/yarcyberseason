import { useState } from 'react';
import heroes from '../data/dota-heroes.json';

/** The selected map's validated hero ID is the only pick source. */
export function DotaHero({ heroId, children, className = '' }) {
  const hero = Number.isSafeInteger(heroId) && heroId > 0 ? heroes[String(heroId)] : null;
  return <span className={`mc-player-hero ${className}`}>
    {hero && <HeroPortrait key={heroId} hero={hero} />}
    <span className="mc-player-identity">{children}<span className="mc-hero-name">{hero?.name || 'Герой не указан'}</span></span>
  </span>;
}

function HeroPortrait({ hero }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : <img className="mc-hero-portrait" src={hero.portrait} alt="" width="128" height="72" loading="lazy" onError={() => setFailed(true)} />;
}
