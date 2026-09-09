import { THEMES } from "../lib/theme.js";

export function ThemeSwitcher({ theme, onChange }) {
  return <div className="theme-toolbar">
    <div className="theme-toolbar-inner">
      <span id="theme-label">Тема:</span>
      <div className="theme-switcher" role="group" aria-labelledby="theme-label">
        {THEMES.map(({ id, label }) => <button key={id} type="button"
          aria-pressed={theme === id} onClick={() => onChange(id)}>{label}</button>)}
      </div>
    </div>
  </div>;
}

export function ThemeArtwork({ theme, imageRef }) {
  if (theme === "cs2") return <img ref={imageRef} className="home-conversion-art"
    src="/assets/home-team-stage.webp" alt="" aria-hidden="true" />;

  if (theme === "dota2") return <div className="theme-artwork dota-home-artwork" aria-hidden="true">
    <img ref={imageRef} className="theme-city" src="/assets/themes/yaroslavl-dota-1672.webp"
      srcSet="/assets/themes/yaroslavl-dota-768.webp 768w, /assets/themes/yaroslavl-dota-1200.webp 1200w, /assets/themes/yaroslavl-dota-1672.webp 1672w"
      sizes="(max-width: 1800px) 100vw, 1800px"
      alt="" fetchPriority="high" decoding="async" />
    <img className="dota-fracture-frame" src="/assets/themes/dota-fracture-frame-lite.webp" alt="" />
  </div>;

  return <div className="theme-artwork" aria-hidden="true">
    <img className="theme-city" src="/assets/themes/yaroslavl-strelka.webp" alt="" fetchPriority="high" />
    <div className="theme-city-shade" />
    {theme === "corporate" && <img className="theme-decoration theme-brand-mark"
      src="/assets/ycs-logo.jpg" alt="" />}
  </div>;
}
