export const THEMES = Object.freeze([
  { id: "cs2", label: "CS2" },
  { id: "dota2", label: "Dota 2" },
  { id: "corporate", label: "Корпоративная" },
]);

export const THEME_STORAGE_KEY = "ycs-theme";
export const normalizeTheme = (value) => THEMES.some(({ id }) => id === value) ? value : "cs2";

export function readTheme() {
  try { return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY)); }
  catch { return "cs2"; }
}

export function saveTheme(theme) {
  try { window.localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(theme)); }
  catch { /* Switching still works when browser storage is unavailable. */ }
}
