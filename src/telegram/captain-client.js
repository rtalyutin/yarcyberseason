// Private data and signed Telegram launch data stay in memory only.
export const CAPTAIN_TOURNAMENT = "dota2-autumn-2026";
const endpointCodes = new Set(["unauthorized", "forbidden", "not_found", "invalid_request", "conflict", "chat_reset", "idempotency_conflict", "captain_not_configured", "window_unavailable", "outside_window", "too_late", "match_closed", "storage_unavailable", "capacity_reached", "too_many_requests"]);
const serviceError = (code) => endpointCodes.has(code)
  ? new CaptainError(code, code === "storage_unavailable")
  : new CaptainError("connection", true);

export class CaptainError extends Error {
  constructor(code, uncertain = false) {
    super(code);
    this.code = code;
    this.uncertain = uncertain;
  }
}

export function createCaptainClient(webApp, { timeoutMs = 15000 } = {}) {
  const available = Boolean(webApp?.initData && typeof webApp?.Serverless?.call === "function");
  const closedChats = new Set();
  return {
    available,
    closedChats,
    // Retain an unresolved mutation when navigating away and returning in this session.
    pendingCommands: new Map(),
    // Unsent recovery drafts survive route changes, never a page reload or archive.
    messageDrafts: new Map(),
    call(action, input = {}) {
      if (!available) return Promise.reject(new CaptainError("unavailable"));
      if (action === "message" && closedChats.has(input.matchId)) return Promise.reject(new CaptainError("match_closed"));
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error) reject(error); else resolve(result);
        };
        const timer = setTimeout(() => finish(new CaptainError("timeout", true)), timeoutMs);
        try {
          webApp.Serverless.call("captain", { ...input, action, initData: webApp.initData }, (error, result) => {
            if (error) {
              finish(error.type === "UNAUTHORIZED" ? new CaptainError("unauthorized") : serviceError(error.type === "ENDPOINT_ERROR" ? error.parameters?.code : null));
            } else if (result?.error) finish(serviceError(result.error));
            else if (!result || typeof result !== "object") finish(new CaptainError("connection", true));
            else finish(null, result);
          });
        } catch { finish(new CaptainError("connection", true)); }
      });
    },
  };
}

export function moscowInput(startsAt) {
  if (!startsAt || !Number.isFinite(Date.parse(startsAt))) return { date: "", time: "" };
  const shifted = new Date(Date.parse(startsAt) + 3 * 60 * 60 * 1000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

export function moscowToIso(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const timestamp = Date.parse(`${date}T${time}:00+03:00`);
  if (!Number.isFinite(timestamp)) return null;
  const value = new Date(timestamp).toISOString();
  const normalized = moscowInput(value);
  return normalized.date === date && normalized.time === time ? value : null;
}

export function formatMoscow(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Время пока не выбрано";
  return `${new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value))} МСК`;
}

export function agreementOutcomeMessage(detail, submittedStartsAt) {
  const proposal = detail.proposal;
  const confirmsSubmittedTime = proposal && Date.parse(proposal.startsAt) === Date.parse(submittedStartsAt) &&
    proposal.confirmedTeamIds.includes(detail.viewerTeamId);
  if (!confirmsSubmittedTime) return "Запрос обработан. Предложение уже изменилось — проверьте актуальное время.";
  return proposal.confirmedTeamIds.length === 2
    ? "Оба капитана подтвердили время. Оно сохранено для организатора."
    : "Ваше подтверждение сохранено. Ожидаем второго капитана.";
}

export const hasCaptainChatEpoch = (detail) => typeof detail?.chatEpoch === "string" && /^[a-f0-9]{64}$/i.test(detail.chatEpoch);

export function captainMessageInput(detail, text, awaitingChatRefresh = false) {
  if (detail?.chatClosed) throw new CaptainError("match_closed");
  if (awaitingChatRefresh || !hasCaptainChatEpoch(detail)) throw new CaptainError("chat_reset");
  return { text: text.trim(), expectedChatEpoch: detail.chatEpoch };
}

export function recoverCaptainCommand(command, error) {
  const chatReset = command.action === "message" && error.code === "chat_reset";
  const chatClosed = command.action === "message" && error.code === "match_closed";
  return {
    pending: error.uncertain && !chatReset && !chatClosed ? { ...command, uncertain: true } : null,
    draft: chatReset ? command.input.text : null,
    awaitingChatRefresh: chatReset,
  };
}

// Closure is final within this runtime too: a stale response cannot restore chat
// text or an old pending send. Result claims and scheduling state stay intact.
export function reconcileCaptainChat(client, matchId, detail) {
  if (!detail?.chatClosed && !client.closedChats.has(matchId)) return detail;
  client.closedChats.add(matchId);
  if (client.pendingCommands.get(matchId)?.action === "message") client.pendingCommands.delete(matchId);
  client.messageDrafts.delete(matchId);
  return { ...detail, chatClosed: true, chatEpoch: null, messages: [] };
}

export function captainErrorMessage(error) {
  return ({
    unauthorized: "Вход Telegram истёк. Закройте и снова откройте мини-приложение.",
    forbidden: "Доступ капитана изменён. Уточните назначение у организатора.",
    not_found: "Этот матч больше недоступен.",
    conflict: "Время или назначение изменилось. Проверьте обновлённые данные и подтвердите ещё раз.",
    chat_reset: "Переписка обновилась. Этот запрос отклонён. Текст остался в черновике: после обновления чата отправьте его заново, если нужно.",
    idempotency_conflict: "Запрос уже использован. Обновите кабинет перед новой попыткой.",
    invalid_request: "Проверьте введённые данные. Счёт должен соответствовать формату матча.",
    window_unavailable: "Организатор ещё не задал допустимый период игры.",
    outside_window: "Выберите время внутри указанного периода игры.",
    too_late: "Согласование требуется не позднее чем за 2 часа до матча.",
    match_closed: "Матч закрыт для изменений.",
    captain_not_configured: "Кабинет ещё не подключён. Обратитесь к организатору.",
    storage_unavailable: "Хранилище временно недоступно. Повторите запрос позже.",
    capacity_reached: "Хранилище заполнено. Сообщите организатору.",
    too_many_requests: "Слишком много запросов. Подождите немного и повторите.",
    unavailable: "Кабинет доступен в Telegram после назначения капитаном.",
  })[error?.code] || "Ответ сервиса не получен. Проверьте соединение и повторите запрос.";
}

export function newCaptainRequestId(cryptoObject = globalThis.crypto) {
  if (typeof cryptoObject?.randomUUID !== "function") throw new CaptainError("unavailable");
  return cryptoObject.randomUUID();
}
