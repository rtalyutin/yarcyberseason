export const THEMES = Object.freeze([{ id: "rift", label: "Разлом" }]);
export const LANGUAGES = Object.freeze([{ id: "ru", label: "Русский" }]);
export const PREFERENCE_KEY = "ycs-miniapp-preferences-v1";
export const DEFAULT_PREFERENCES = Object.freeze({ theme: "rift", language: "ru" });

export function normalizePreferences(value, themes = THEMES, languages = LANGUAGES) {
  return {
    theme: themes.some((item) => item.id === value?.theme) ? value.theme : themes[0].id,
    language: languages.some((item) => item.id === value?.language) ? value.language : languages[0].id,
  };
}
export function readPreferences(storage) {
  try { return normalizePreferences(JSON.parse(storage?.getItem(PREFERENCE_KEY))); }
  catch { return { ...DEFAULT_PREFERENCES }; }
}
export function savePreferences(storage, value) {
  const preferences = normalizePreferences(value);
  try { storage?.setItem(PREFERENCE_KEY, JSON.stringify(preferences)); } catch { /* device-local storage is optional */ }
  return preferences;
}

// Only interface copy lives here. Published tournament text stays in the shared JSON.
export const messages = Object.freeze({ ru: Object.freeze({
  app: "Мини-приложение", loading: "Загружаем турнир…", error: "Не удалось загрузить турнир.",
  retry: "Попробовать ещё раз", back: "На главную", open: "Открыть турнир", current: "Текущий турнир",
  homeTitle: ["ГОРОД", "ВХОДИТ", "В ИГРУ"], participants: "Заявленные команды", partners: "Партнёры",
  overview: "О турнире", participantSection: "Участники", registered: "Заявлена", unknownStatus: "Статус не опубликован",
  closed: "Регистрация закрыта", openRegistration: "Регистрация открыта", unknownRegistration: "Статус регистрации не опубликован",
  noDates: "Даты не опубликованы", noTeams: "Участники пока не опубликованы", count: "Команд",
  pendingSection: "Этот раздел ещё готовится. Участники уже доступны.", theme: "Тема", language: "Язык",
}) });
export const getMessages = (language) => messages[language] || messages.ru;
