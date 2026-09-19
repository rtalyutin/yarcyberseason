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
  swiss: "Swiss", playoffs: "Плей-офф", team: "Команда", seed: "Посев", placeLocked: "Место зафиксировано",
  noSwissTable: "Таблица Swiss ещё не опубликована", noPlayoffPairs: "Пары плей-офф ещё не опубликованы",
  stageRules: "Правила этапа", slot: "Пара", emptyPair: "Пара ещё не определена",
  roundEmpty: "Пары раунда ещё не опубликованы", winnerAdvance: "Победитель", loserAdvance: "Проигравший",
  targetSide: "участник", bracketScroll: "Сетка турнира — горизонтальная прокрутка", tableScroll: "Таблица — горизонтальная прокрутка",
  publishedEdges: "Показаны только опубликованные переходы между парами.", noEdges: "Переходы между парами ещё не опубликованы.",
  app: "Мини-приложение", loading: "Загружаем турнир…", error: "Не удалось загрузить турнир.",
  retry: "Попробовать ещё раз", back: "На главную", open: "Открыть турнир", current: "Текущий турнир",
  close: "Закрыть", closeApp: "Закрыть приложение", website: "На сайт",
  homeTitle: ["ГОРОД", "ВХОДИТ", "В ИГРУ"], participants: "Заявленные команды", partners: "Партнёры",
  overview: "О турнире", participantSection: "Участники", registered: "Заявлена", unknownStatus: "Статус не опубликован",
  closed: "Регистрация закрыта", openRegistration: "Регистрация открыта", unknownRegistration: "Статус регистрации не опубликован",
  noDates: "Даты не опубликованы", noTeams: "Участники пока не опубликованы", count: "Команд",
  rules: "Формат", schedule: "Расписание", matchSchedule: "Расписание матчей",
  noRules: "Регламент ещё не опубликован", noSchedule: "Расписание ещё не опубликовано",
  noMatches: "Матчи ещё не опубликованы", unknownTeam: "Соперник ещё не определён",
  datePending: "Дата уточняется", resultPending: "Результат ожидает подтверждения",
  matches: "Матчи", maps: "Карты", showDetails: "Подробнее", hideDetails: "Свернуть",
  noConfirmedScore: "Подтверждённого счёта пока нет", unknownScore: "Счёт не опубликован",
  draw: "Ничья", noMaps: "Сведения о картах ещё не опубликованы",
  noMapScore: "Счёт карты не опубликован", publishedMapsOnly: "Показаны только опубликованные сведения о картах. Счёт карт указан в порядке команд выше.",
  technicalNoMaps: "Технический результат — без сыгранных карт.", matchLinks: "Материалы матча",
  timelineStates: Object.freeze({ completed: "Завершено", upcoming: "Запланировано", active: "Идёт" }),
  matchStates: Object.freeze({ scheduled: "Запланирован", live: "Идёт", completed: "Завершён", walkover: "Техническая победа", bye: "Проход без игры", cancelled: "Отменён", postponed: "Перенесён" }),
  pendingSection: "Этот раздел ещё готовится. Участники уже доступны.", theme: "Тема", language: "Язык",
}) });
export const getMessages = (language) => messages[language] || messages.ru;
