import { useEffect, useId, useRef, useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { ThemeSwitcher } from "./ThemeSwitcher.jsx";
import "../site-header.css";

export function SiteHeader({ path, navigate, theme, onThemeChange, matchdayRoute, fixedTheme = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const panelId = useId();
  const currentPath = path.replace(/\/$/, "") || "/";
  const links = [
    { label: "Турниры", href: "/", active: currentPath === "/" || (currentPath.startsWith("/tournaments/") && currentPath !== matchdayRoute) },
    { label: "Matchday", href: matchdayRoute },
    { label: "Архив", href: "/results" },
    { label: "Трансляции", href: "/broadcasts" },
    { label: "Партнёры", href: "/partners" },
    { label: "О проекте", href: "/about" },
  ];

  useEffect(() => { setMenuOpen(false); }, [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const outside = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1200px)");
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", outside);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", outside);
      desktop.removeEventListener("change", resize);
    };
  }, [menuOpen]);

  const follow = (event, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setMenuOpen(false);
    navigate(href);
  };
  const navigation = () => links.map(({ label, href, active }) => (
    <a key={href} href={href} className="ycs-header-link"
      aria-current={currentPath === href ? "page" : active ? "location" : undefined}
      onClick={(event) => follow(event, href)}>{label}</a>
  ));

  return <header className="ycs-header" ref={headerRef}>
    <div className="ycs-header-row">
      <a className="ycs-header-brand" href="/" onClick={(event) => follow(event, "/")} aria-label="YCS — на главную">
        <img src="/assets/ycs-logo.jpg" alt="ЯКС" width="92" height="42" />
        <span>YAR CYBER<br />SEASON</span>
      </a>
      <nav className="ycs-header-desktop" aria-label="Основная навигация">{navigation()}</nav>
      {!fixedTheme && <div className="ycs-header-theme"><ThemeSwitcher theme={theme} onChange={onThemeChange} /></div>}
      <button ref={toggleRef} className="ycs-header-toggle" type="button"
        onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}
        aria-controls={panelId} aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}>
        <span>Меню</span>{menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
      </button>
    </div>
    <div className="ycs-header-panel" id={panelId} hidden={!menuOpen}>
      <nav className="ycs-header-mobile" aria-label="Мобильная навигация">{navigation()}</nav>
      {!fixedTheme && <ThemeSwitcher theme={theme} onChange={onThemeChange} />}
    </div>
  </header>;
}
