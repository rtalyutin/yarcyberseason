import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher.jsx';
import { normalizeTheme, readTheme, saveTheme, THEME_STORAGE_KEY } from '../lib/theme.js';
import { useThemeMotion } from '../lib/use-theme-motion.js';
import '../atlas-utility.css';

const UtilityThemeContext = createContext(null);

// Utility routes share only presentation preferences. Their API state stays in
// the original page, so switching the skin never remounts a form or session.
export function ThemedUtilityShell({ children }) {
  const [theme, setTheme] = useState('cs2');
  const shellRef = useRef(null);
  useThemeMotion(shellRef, theme, 'utility');
  useEffect(() => {
    setTheme(readTheme());
    const sync = (event) => { if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(readTheme()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const changeTheme = (next) => { const value = normalizeTheme(next); setTheme(value); saveTheme(value); };
  return <UtilityThemeContext.Provider value={{ theme, changeTheme }}>
    <div ref={shellRef} className="site-shell atlas-utility-shell" data-theme={theme} data-ycs-theme={theme}>{children}</div>
  </UtilityThemeContext.Provider>;
}

export function UtilityThemeSwitcher() {
  const state = useContext(UtilityThemeContext);
  if (!state) return null;
  return <div className="atlas-utility-theme"><ThemeSwitcher theme={state.theme} onChange={state.changeTheme} /></div>;
}
