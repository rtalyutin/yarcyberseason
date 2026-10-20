import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ArrowClockwise, UserCircle, ShieldCheck } from '@phosphor-icons/react';
import { createPlayerIntakeClient, intakeSha256, runPlayerIntake } from '../lib/player-intake-client.js';
import { DEFAULT_PLAYER_DISCIPLINES, PHOTO_LIMITS } from '../lib/player-profile-catalog.js';
import { defaultPhotoCrop, drawPlayerCrop, playerPhotoBlob, readPlayerDiscipline } from '../lib/player-profile.js';
import '../player-profile.css';
import '../player-league.css';

const stages = { prepare: 'Готовим загрузку…', upload: 'Отправляем фото…',
  complete: 'Проверяем сохранение…', read: 'Получаем сохранённое фото…', photo: 'Открываем фото…' };
async function decodeFile(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file, { imageOrientation: 'from-image' });
  const url = URL.createObjectURL(file);
  try { return await new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось открыть фото.')); image.src = url;
  }); } finally { URL.revokeObjectURL(url); }
}
const defaultClient = () => createPlayerIntakeClient({ baseUrl: import.meta.env.VITE_YCS_PLAYER_API_URL || 'https://rtalyutin-tg-mcp-4776.twc1.net' });

export default function PlayerIntakePage({ client, initialSearch = null, photoEncoder = playerPhotoBlob }) {
  const api = useMemo(() => client || defaultClient(), [client]);
  const [search, setSearch] = useState(initialSearch);
  const code = readPlayerDiscipline(search || '');
  const discipline = DEFAULT_PLAYER_DISCIPLINES.find((item) => item.code === code);
  const [available, setAvailable] = useState(false), [contextLoading, setContextLoading] = useState(true);
  const [form, setForm] = useState({ nickname: '', name: '' });
  const [image, setImage] = useState(null), [crop, setCrop] = useState(defaultPhotoCrop);
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [pending, setPending] = useState(false), [completed, setCompleted] = useState(null);
  const canvas = useRef(null), source = useRef(null), selection = useRef(0);
  const operation = useRef(null), active = useRef(null), mounted = useRef(false);
  const locked = Boolean(busy || pending || completed);

  useEffect(() => {
    mounted.current = true;
    const location = () => setSearch(initialSearch ?? window.location.search);
    location(); window.addEventListener('popstate', location);
    return () => { mounted.current = false; window.removeEventListener('popstate', location);
      selection.current++; active.current?.abort(); source.current?.close?.(); };
  }, [initialSearch]);
  useEffect(() => () => { if (completed?.url) URL.revokeObjectURL(completed.url); }, [completed?.url]);
  useEffect(() => {
    const controller = new AbortController();
    active.current?.abort(); active.current = null; operation.current = null;
    selection.current++; source.current?.close?.(); source.current = null;
    setImage(null); setCrop(defaultPhotoCrop()); setForm({ nickname: '', name: '' });
    setPending(false); setCompleted(null); setBusy(''); setError('');
    setAvailable(false); setContextLoading(true);
    if (!discipline) { setContextLoading(false); return () => controller.abort(); }
    api.context(code, controller.signal).then((context) => {
      if (controller.signal.aborted) return;
      setAvailable(context.mode === 'anonymous-direct-s3' && context.discipline?.code === code && context.available === true);
    }).catch(() => {}).finally(() => { if (!controller.signal.aborted) setContextLoading(false); });
    return () => controller.abort();
  }, [code, api]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    try { drawPlayerCrop(canvas.current, image, crop, PHOTO_LIMITS.size); }
    catch (failure) { setError(failure.message); }
  }, [image, crop]);
  useEffect(() => {
    if (completed || !(image || form.nickname || form.name || pending)) return;
    const leave = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [image, form, pending, completed]);

  async function selectPhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || locked) return;
    const version = ++selection.current; setError(''); setBusy('photo');
    try {
      if (!PHOTO_LIMITS.formats.includes(file.type)) throw new Error('Выберите JPEG, PNG или WebP.');
      if (!file.size || file.size > PHOTO_LIMITS.maxBytes) throw new Error('Фото должно быть не больше 10 МБ.');
      const bitmap = await decodeFile(file);
      if (!mounted.current || version !== selection.current) { bitmap.close?.(); return; }
      const width = bitmap.width || bitmap.naturalWidth, height = bitmap.height || bitmap.naturalHeight;
      if (!width || !height || width * height > PHOTO_LIMITS.maxPixels) {
        bitmap.close?.(); throw new Error('У фотографии слишком большое разрешение. Уменьшите её и выберите снова.');
      }
      source.current?.close?.(); source.current = bitmap; setImage(bitmap); setCrop(defaultPhotoCrop());
    } catch (failure) { if (mounted.current && version === selection.current) setError(failure.message); }
    finally { if (mounted.current && version === selection.current) setBusy(''); }
  }
  function cancelPhoto() {
    selection.current++; source.current?.close?.(); source.current = null;
    setImage(null); setCrop(defaultPhotoCrop()); setError('');
  }
  function changeCrop(key, value) { setCrop((previous) => ({ ...previous, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    if (busy || completed || !available || !discipline) return;
    const controller = new AbortController(); active.current = controller;
    setError(''); setBusy('prepare');
    try {
      if (!operation.current) {
        const nickname = form.nickname.trim(), name = form.name.trim();
        if (!nickname || !image || !canvas.current) throw new Error('Нужны никнейм и фотография.');
        drawPlayerCrop(canvas.current, image, crop, PHOTO_LIMITS.size);
        const blob = await photoEncoder(canvas.current);
        const sha256 = await intakeSha256(blob);
        if (controller.signal.aborted) return;
        operation.current = { blob, request: { requestId: crypto.randomUUID(), Dis: code,
          name: name || null, nickname, sha256, size: blob.size, contentType: 'image/jpeg' } };
      }
      const op = operation.current;
      const saved = await runPlayerIntake({ api, operation: op, signal: controller.signal,
        onChange: () => { if (!controller.signal.aborted) setPending(true); },
        onProgress: (stage) => { if (!controller.signal.aborted) setBusy(stage); } });
      if (controller.signal.aborted || !mounted.current) return;
      setForm({ nickname: op.request.nickname, name: op.request.name || '' });
      source.current?.close?.(); source.current = null; setImage(null);
      setCompleted({ ...saved.result, url: URL.createObjectURL(saved.photo) }); setPending(false);
    } catch (failure) {
      if (controller.signal.aborted || !mounted.current) return;
      setError(failure.message || 'Загрузка пока не подтверждена.');
      // An ambiguous prepare keeps its exact ID/body/photo too. Only a definitive
      // input rejection permits editing or choosing another source photo.
      if (!operation.current || ['validation_failed', 'invalid_discipline', 'unsupported_content_type', 'unsupported_image', 'upload_mismatch', 'file_too_large'].includes(failure.code)) {
        operation.current = null; setPending(false);
      } else setPending(true);
    } finally { if (mounted.current && active.current === controller) { setBusy(''); active.current = null; } }
  }

  return <main className="player-page player-page--league">
    <nav className="league-breadcrumbs" aria-label="Хлебные крошки">
      <a href="/">ЯКС</a><span aria-hidden="true">/</span><span>Лига цифровой экономики</span>
      <span aria-hidden="true">/</span><span aria-current="page">Карточка игрока</span>
    </nav>
    <header className="league-heading">
      <div className="league-heading-copy">
        <img className="league-logo" src="/assets/player-league/league-25.svg" width="220" height="70" alt="Лига — 25 лет совместных побед" />
        <p className="player-kicker">ЛИГА ЦИФРОВОЙ ЭКОНОМИКИ</p>
        <h1>В команде.<br /><span>В игре.</span></h1>
        <p className="league-heading-description">Собери свою карточку игрока.<br />Добавь фото и ник — результат сразу перед тобой.</p>
        {discipline && <span className="player-discipline">{discipline.label}</span>}
      </div>
      {code === 'cs' && <img className="league-promo" src="/assets/player-league/cs2-promo.jpg" width="1280" height="720"
        alt="Корпоративный турнир Counter-Strike 2. Лига: 25 лет совместных побед. Синяя игровая экипировка на светлом фоне." />}
    </header>
    {search === null ? <p className="player-message" role="status">Открываем форму…</p>
      : !discipline ? <section className="player-message" role="alert">
        <h2>{code ? 'Неизвестная дисциплина' : 'В ссылке не указана дисциплина'}</h2>
        <p>Для CS2 нужна полная ссылка с параметром <code>?Dis=cs</code>.</p><a href="/">К турнирам</a></section>
      : <>
        <section className="player-access" aria-label="Разовая отправка карточки"><div>
          <strong>Ник. Фото. Готово.</strong><p>Вход не нужен. После отправки открыть и изменить карточку здесь нельзя.</p></div></section>
        {contextLoading ? <p className="player-message" role="status">Проверяем доступность загрузки…</p>
          : !available && <p className="player-message" role="status">Загрузка фото ещё не подключена. Можно подготовить карточку, но отправить её пока нельзя.</p>}
        {error && <div className="player-message player-message--error" role="alert"><p>{error}</p></div>}
        {completed && <section className="player-message player-message--success" role="status">
          <h2>Карточка отправлена</h2><p>Сохранённое фото получено из хранилища и проверено. Редактирование завершено.</p></section>}
        <div className="player-workspace">
          <aside className="player-card-rail" aria-label="Предпросмотр карточки">
            <p className="league-section-label">ТВОЯ КАРТОЧКА</p><article className="player-card">
            <div className="player-card-top"><span>ЛИГА / ИГРОК</span><span>{discipline.label}</span></div>
            <div className="player-portrait">{completed ? <img src={completed.url} alt="Фото, полученное после сохранения" />
              : image ? <canvas ref={canvas} aria-label="Выбранный кадр фотографии" />
                : <div className="player-photo-empty"><UserCircle weight="thin" aria-hidden="true" /><span>Здесь будет твоё фото</span></div>}</div>
            <div className="player-card-identity"><p>{form.name || 'ПРОФИЛЬ ИГРОКА'}</p><h2>{form.nickname || 'ТВОЙ НИК'}</h2><span>{discipline.label}</span></div>
            <div className="player-card-foot"><img src="/assets/player-league/league-25.svg" width="110" height="35" alt="Лига — 25 лет совместных побед" />
              <span>{completed ? 'КАРТОЧКА ОТПРАВЛЕНА' : 'ПРЕДПРОСМОТР'}</span></div></article>
            <p className="player-preview-note">{completed ? 'На карточке показано сохранённое фото.' : 'Текст и кадр сразу видны на карточке.'}</p></aside>
          <form className="player-form" onSubmit={submit}>
            <fieldset disabled={locked}><legend><span>01</span> Лицо команды — ты</legend>
              <label className="player-upload"><Camera size={24} aria-hidden="true" /><span>{image ? 'Заменить фото' : 'Выбрать фото'}
                <small>JPEG, PNG или WebP · до 10 МБ</small></span>
                <input type="file" accept={PHOTO_LIMITS.formats.join(',')} onChange={selectPhoto} aria-label="Выбрать фотографию игрока" /></label>
              {image && <div className="player-crop"><button type="button" onClick={() => changeCrop('rotation', (crop.rotation + 90) % 360)}>
                <ArrowClockwise aria-hidden="true" /> Повернуть на 90°</button>
                {[['zoom', 'Масштаб', 1, 3, .05], ['horizontal', 'Кадр по горизонтали', -100, 100, 1], ['vertical', 'Кадр по вертикали', -100, 100, 1]].map(([key, label, min, max, step]) =>
                  <label key={key}>{label}<input type="range" min={min} max={max} step={step} value={crop[key]} onChange={(event) => changeCrop(key, Number(event.target.value))} /></label>)}
                <button type="button" className="player-quiet" onClick={() => setCrop(defaultPhotoCrop())}>Сбросить кадр</button>
                <button type="button" className="player-quiet" onClick={cancelPhoto}>Отменить выбор фото</button></div>}
              <p className="player-help">Фото обязательно. ФИО можно оставить пустым.</p></fieldset>
            <fieldset disabled={locked}><legend><span>02</span> Как тебя узнают</legend>
              <div className="player-fields">{[['nickname', 'Никнейм', 64], ['name', 'ФИО', 200]].map(([key, label, max]) =>
                <label key={key} className="player-field-wide">{label}{key === 'nickname' ? ' *' : <small>Необязательно</small>}
                  <input type="text" name={key} value={form[key]} required={key === 'nickname'} maxLength={max}
                    autoComplete={key === 'name' ? 'name' : 'nickname'} placeholder={key === 'nickname' ? 'Ник, который запомнят' : ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} /></label>)}</div></fieldset>
            <section className="player-privacy"><ShieldCheck size={25} aria-hidden="true" /><div><strong>Отправляй готовую карточку</strong>
              <p>Фото и данные сохраняются у организатора. Эта форма не публикует карточку на сайте и не заменяет заявку на турнир.</p></div></section>
            <div className="player-save"><div><strong>{completed ? 'Карточка отправлена' : busy ? stages[busy] : pending ? 'Проверим исход загрузки' : 'Нужны ник и фото'}</strong>
              <p>{completed ? 'Возврат и редактирование не предусмотрены.' : pending ? 'Продолжим тот же запрос, без новой карточки.' : 'Проверь фото и написание ника перед отправкой.'}</p></div>
              {!completed && <button type="submit" className="player-save-button"
                disabled={Boolean(busy || !available || (!pending && (!image || !form.nickname.trim())))}>
                <Check aria-hidden="true" />{busy ? stages[busy] : pending ? 'Проверить загрузку' : 'Отправить карточку'}</button>}</div>
          </form></div></>}
  </main>;
}
