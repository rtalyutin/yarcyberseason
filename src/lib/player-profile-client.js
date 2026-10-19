const messages = {
  auth_provider_not_configured: 'Этот способ входа ещё не подключён.',
  auth_provider_unavailable: 'Сервис входа сейчас не отвечает. Попробуйте ещё раз.',
  auth_provider_rejected: 'Сервис не подтвердил вход. Попробуйте ещё раз.',
  auth_cancelled: 'Вход отменён. Черновик остался на странице.',
  auth_state_invalid: 'Попытка входа устарела. Начните вход ещё раз.',
  storage_not_configured: 'Хранилище профилей ещё не подключено.',
  storage_unavailable: 'Хранилище профилей сейчас недоступно. Данные остались на странице.',
  save_unknown: 'Сервер пока не подтвердил сохранение. Проверьте статус запроса.',
  csrf_failed: 'Сессия обновилась. Войдите снова перед сохранением.',
  forbidden_origin: 'Этот адрес страницы ещё не подключён к сервису профилей.',
  photo_staging_limit: 'Слишком много незавершённых загрузок. Обратитесь к организатору.',
  upload_busy: 'Сервис занят обработкой фото. Попробуйте загрузить чуть позже.',
  invalid_discipline: 'В ссылке не указана поддерживаемая дисциплина. Получите ссылку у организатора.',
  unauthenticated: 'Войдите снова. Введённые данные остались на странице.',
  forbidden: 'Нет доступа к этому действию.', validation_failed: 'Проверьте заполненные поля.',
  file_too_large: 'Фотография превышает допустимый размер.', unsupported_image: 'Выберите исправный JPEG, PNG или WebP.',
  version_conflict: 'Профиль изменён в другой вкладке. Сравните версии перед сохранением.',
  identity_already_linked: 'Этот аккаунт уже связан с другим профилем.',
  idempotency_conflict: 'Запрос уже использован для другого изменения. Перечитайте профиль.',
  dependency_unavailable: 'Сервис профиля пока недоступен. Введённые данные остались на странице.',
  player_not_configured: 'Сервис профиля ещё не подключён.', provider_unavailable: 'Этот способ входа ещё не подключён.',
  rate_limited: 'Слишком много запросов. Подождите немного и повторите.',
  permission_text_outdated: 'Условия использования обновились. Перечитайте их перед сохранением.',
};

export function createPlayerClient({ baseUrl = '', fetchImpl = globalThis.fetch, timeoutMs = 25_000 } = {}) {
  const base = baseUrl.replace(/\/+$/, '');
  let csrfToken = null;
  const url = (path) => `${base}/api/player/v1/${path}`;
  async function request(path, { method = 'GET', body, signal, image = false } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
      const response = await fetchImpl(url(path), { method, credentials: 'include', cache: 'no-store',
        signal: controller.signal,
        headers: { ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
          ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
        ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
      if (response.ok && image) return response.blob();
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) throw Object.assign(new Error(messages[data?.error] || 'Не удалось выполнить запрос.'),
        { status: response.status, code: data?.error || 'invalid_response', fields: data?.fields });
      if (!data && response.status !== 204) throw new Error('Сервис вернул непонятный ответ.');
      if (data?.csrfToken) csrfToken = data.csrfToken;
      return data;
    } catch (error) {
      if (error.status) throw error;
      throw Object.assign(new Error(signal?.aborted ? 'Запрос отменён.' : 'Нет подтверждения от сервера. Проверьте соединение.'),
        { code: 'network_error', cause: error });
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  }
  return { request, url,
    context: (discipline, signal) => request(`context?Dis=${encodeURIComponent(discipline)}`, { signal }),
    session: (signal) => request('session', { signal }),
    me: (discipline, signal) => request(`me?Dis=${encodeURIComponent(discipline)}`, { signal }),
    start: (body) => request('auth/start', { method: 'POST', body }),
    logout: () => request('logout', { method: 'POST', body: {} }),
    upload: (blob) => { const form = new FormData(); form.append('file', blob, 'photo.jpg');
      return request('photos', { method: 'POST', body: form }); },
    photo: (id, signal) => request(`photos/${encodeURIComponent(id)}`, { image: true, signal }),
    save: (body) => request('me', { method: 'PUT', body }),
    operation: (id) => request(`operations/${encodeURIComponent(id)}`),
  };
}
