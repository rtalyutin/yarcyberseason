import { PHOTO_LIMITS } from './player-profile-catalog.js';

const messages = {
  player_intake_not_configured: 'Загрузка фото ещё не подключена.',
  forbidden_origin: 'Этот адрес сайта ещё не подключён к загрузке.',
  validation_failed: 'Проверьте никнейм и ФИО.',
  invalid_discipline: 'В ссылке указана неизвестная дисциплина.',
  file_too_large: 'Фото превышает допустимый размер.',
  unsupported_content_type: 'Не удалось подготовить JPEG. Выберите фото ещё раз.',
  unsupported_image: 'Хранилище не подтвердило корректное фото. Выберите другой файл.',
  upload_mismatch: 'Загруженный файл не совпадает с подготовленным фото.',
  upload_not_found: 'Фото пока не найдено в хранилище.',
  invalid_ticket: 'Не удалось подтвердить запрос загрузки.',
  ticket_expired: 'Ссылка загрузки устарела. Повторите проверку.',
  storage_unavailable: 'Хранилище сейчас недоступно. Данные остались на странице.',
  save_unknown: 'Сохранение пока не подтверждено. Повторите проверку.',
  read_mismatch: 'Полученное фото не прошло проверку. Повторите получение сохранённого файла.',
  rate_limited: 'Сервис занят. Попробуйте немного позже.',
};
const fail = (code, message) => Object.assign(new Error(message || messages[code] || 'Не удалось подтвердить загрузку.'), { code });
const shaPattern = /^[a-f0-9]{64}$/;
export async function intakeSha256(blob) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
}

// Signed URLs are bearer capabilities. Send them only to the existing S3 host,
// omit cookies and referrers, and never save them in localStorage or logs.
export function checkedIntakeUrl(value, directory) {
  let url, pathname;
  try { url = new URL(value); pathname = decodeURIComponent(url.pathname); } catch { throw fail('invalid_response'); }
  if (url.protocol !== 'https:' || url.username || url.password ||
    url.port || url.hash ||
    !(url.hostname === 's3.twcstorage.ru' || url.hostname.endsWith('.s3.twcstorage.ru')) ||
    !pathname.includes('/private/player-profiles/v1/' + directory + '/')) throw fail('invalid_response');
  return url.href;
}

export function createPlayerIntakeClient({ baseUrl = '', fetchImpl = globalThis.fetch, timeoutMs = 30_000 } = {}) {
  const base = baseUrl.replace(/\/+$/, '') + '/api/player/v1/intake';
  async function timed(url, options = {}, signal, consume = async (response) => response) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetchImpl(url, { ...options, credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'no-referrer', signal: controller.signal });
      const value = await consume(response);
      if (controller.signal.aborted) throw fail('network_error', 'Запрос отменён или превысил время ожидания.');
      return value;
    }
    catch (error) { if (controller.signal.aborted) throw fail('network_error', signal?.aborted ? 'Запрос отменён.' : 'Истекло время ожидания. Повторите проверку.');
      if (typeof error.code === 'string') throw error;
      throw fail('network_error', signal?.aborted ? 'Запрос отменён.' : 'Нет подтверждения от хранилища. Данные остались на странице.'); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  async function json(path, body, signal) {
    return timed(base + path, { method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) }, signal,
    async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok) throw Object.assign(fail(data?.error || 'invalid_response'), { status: response.status });
      if (!data || typeof data !== 'object') throw fail('invalid_response');
      return data;
    });
  }
  return {
    context: (code, signal) => json('/context?Dis=' + encodeURIComponent(code), null, signal),
    async prepare(request, signal) {
      const result = await json('/prepare', request, signal);
      if (result.requestId !== request.requestId || typeof result.ticket !== 'string' || !result.ticket ||
        result.upload?.method !== 'PUT' || !result.upload.headers || typeof result.upload.headers !== 'object' || Array.isArray(result.upload.headers)) throw fail('invalid_response');
      checkedIntakeUrl(result.upload.url, 'staging');
      for (const [key, value] of Object.entries(result.upload.headers)) {
        if (!/^(content-type|if-none-match|x-amz-[a-z0-9-]+)$/i.test(key) || typeof value !== 'string') throw fail('invalid_response');
      }
      const headers = Object.fromEntries(Object.entries(result.upload.headers).map(([key, value]) => [key.toLowerCase(), value]));
      if (headers['if-none-match'] !== '*' || headers['content-type'] !== 'image/jpeg') throw fail('invalid_response');
      return result;
    },
    async upload(prepared, blob, signal) {
      const response = await timed(checkedIntakeUrl(prepared.upload.url, 'staging'),
        { method: 'PUT', headers: prepared.upload.headers, body: blob }, signal);
      // A lost response can follow a successful create. Completion independently
      // checks the object; a precondition failure is never declared success here.
      if (!response.ok && ![409, 412].includes(response.status)) throw Object.assign(fail('upload_failed', 'Не удалось подтвердить отправку фото. Повторите проверку.'), { status: response.status });
    },
    async complete(prepared, signal) {
      const result = await json('/complete', { ticket: prepared.ticket }, signal);
      const p = result.photo;
      if (result.status !== 'finalized' || result.requestId !== prepared.requestId || !p ||
        !shaPattern.test(p.sha256) || !Number.isSafeInteger(p.size) || p.size < 1 || p.size > PHOTO_LIMITS.maxBytes ||
        p.contentType !== 'image/jpeg' || p.width !== 1024 || p.height !== 1024 || typeof p.filename !== 'string') throw fail('invalid_response');
      checkedIntakeUrl(p.readUrl, 'photos');
      return result;
    },
    async read(result, signal) {
      return timed(checkedIntakeUrl(result.photo.readUrl, 'photos'), {}, signal, async (response) => {
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')) throw fail('read_failed', 'Фото сохранено, но ещё не удалось получить его из хранилища. Повторите проверку.');
      const length = Number(response.headers.get('content-length'));
      if (length > PHOTO_LIMITS.maxBytes) throw fail('read_mismatch');
      let blob;
      if (response.body?.getReader) {
        const reader = response.body.getReader(), chunks = []; let size = 0;
        try { while (true) { const next = await reader.read(); if (next.done) break;
          size += next.value.byteLength;
          if (size > PHOTO_LIMITS.maxBytes) throw fail('read_mismatch');
          chunks.push(next.value);
        } } finally { await reader.cancel().catch(() => {}); }
        blob = new Blob(chunks, { type: 'image/jpeg' });
      } else blob = await response.blob();
      if (blob.size !== result.photo.size || await intakeSha256(blob) !== result.photo.sha256) throw fail('read_mismatch');
      return blob;
      });
    },
  };
}

// This operation lives only in this page instance. A retry keeps the same
// immutable input, request ID and photo, including after an ambiguous response.
export async function runPlayerIntake({ api, operation, onChange = () => {}, onProgress = () => {}, signal }) {
  const op = operation;
  const prepare = async () => { onProgress('prepare'); op.prepared = await api.prepare(op.request, signal); onChange(op); };
  if (!op.prepared) await prepare();
  let result;
  if (op.attempted) {
    onProgress('complete');
    try { result = await api.complete(op.prepared, signal); }
    catch (error) {
      if (['ticket_expired', 'invalid_ticket'].includes(error.code)) {
        await prepare();
        try { result = await api.complete(op.prepared, signal); }
        catch (retry) { if (retry.code !== 'upload_not_found') throw retry; }
      } else if (error.code !== 'upload_not_found') throw error;
    }
  }
  if (!result) {
    if (op.refresh || (Number.isFinite(Date.parse(op.prepared.upload.expiresAt)) && Date.now() >= Date.parse(op.prepared.upload.expiresAt))) {
      await prepare(); op.refresh = false;
    }
    op.attempted = true; onChange(op);
    onProgress('upload');
    try { await api.upload(op.prepared, op.blob, signal); }
    catch (error) { if (error.code === 'upload_failed') op.refresh = true; throw error; }
    onProgress('complete'); result = await api.complete(op.prepared, signal);
  }
  onProgress('read'); const photo = await api.read(result, signal);
  return { result, photo };
}
