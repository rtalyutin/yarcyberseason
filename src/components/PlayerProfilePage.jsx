import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ArrowClockwise, UserCircle, ShieldCheck } from '@phosphor-icons/react';
import { createPlayerClient } from '../lib/player-profile-client.js';
import { unavailablePlayerContext } from '../lib/player-profile-catalog.js';
import { defaultPhotoCrop, drawPlayerCrop, emptyPlayerForm, formFromPlayer, playerPhotoBlob,
  playerSaveRequest, readPlayerDiscipline } from '../lib/player-profile.js';
import '../player-profile.css';

const initialBase = { playerId: null, version: null, profile: null };
const labels = { nickname: 'Никнейм', name: 'ФИО', city: 'Город' };
const defaultClient = () => createPlayerClient({ baseUrl: import.meta.env.VITE_YCS_PLAYER_API_URL || '' });

function ConflictComparison({ record, form, context, api }) {
  const [photo, setPhoto] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let url;
    if (record.profile?.photoAssetId) api.photo(record.profile.photoAssetId, controller.signal).then((blob) => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setPhoto(url); }
    }).catch(() => {});
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [record, api]);
  const roles = (ids) => (ids || []).map((id) => context.discipline.roles?.find((role) => role.id === id)?.label || id).join(', ');
  const rows = [...context.fields.filter((field) => field.scope === 'profile').map((field) => ({
    label: labels[field.id] || field.label || field.id, saved: record.profile?.[field.id], draft: form[field.id] })),
    { label: 'Игровые роли', saved: roles(record.discipline?.roleIds), draft: roles(form.roleIds) },
    { label: 'Steam', saved: record.discipline?.gameAccount?.identifier, draft: form.steam }];
  return <><div className="player-compare-table"><table><caption>Сохранённая версия и черновик</caption>
    <thead><tr><th>Поле</th><th>На сервере</th><th>Твои правки</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.saved || 'Не указано'}</td><td>{row.draft || 'Не указано'}</td></tr>)}</tbody></table></div>
    {photo ? <figure className="player-compare-photo"><img src={photo} alt="Фото в сохранённой версии" /><figcaption>Фото на сервере. Текущий кадр — в карточке предпросмотра.</figcaption></figure>
      : <p>Сохранённое фото пока не удалось показать. Перед заменой перечитайте профиль.</p>}</>;
}

export default function PlayerProfilePage({ client, initialSearch = null }) {
  const api = useMemo(() => client || defaultClient(), [client]);
  const [search, setSearch] = useState(initialSearch ?? '');
  const [context, setContext] = useState(null);
  const [session, setSession] = useState(null);
  const [base, setBase] = useState(initialBase);
  const [form, setForm] = useState(emptyPlayerForm);
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState(defaultPhotoCrop);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [remotePhoto, setRemotePhoto] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('loading');
  const [authBusy, setAuthBusy] = useState('');
  const [error, setError] = useState('');
  const [fieldsError, setFieldsError] = useState({});
  const [notice, setNotice] = useState('');
  const [unknown, setUnknown] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [readFailed, setReadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const canvas = useRef(null);
  const source = useRef(null);
  const owner = useRef(null);
  const state = useRef({});
  const mounted = useRef(false);
  const photoRead = useRef(null);
  const authRun = useRef(null);
  const staged = useRef(null);
  const selectionRevision = useRef(0);
  const discipline = readPlayerDiscipline(search);
  state.current = { dirty, form, base, context };

  useEffect(() => {
    mounted.current = true;
    const location = () => setSearch(initialSearch ?? window.location.search);
    location(); window.addEventListener('popstate', location);
    return () => { mounted.current = false; window.removeEventListener('popstate', location);
      authRun.current?.cancel(); photoRead.current?.abort(); source.current?.close?.(); };
  }, [initialSearch]);

  // This document is also the registered popup return page. It sends no tokens
  // or identity; its opener independently re-reads the authenticated session.
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (window.opener && window.name === 'ycs-player-auth' && params.has('auth') && params.has('authAttempt')) {
      window.opener.postMessage({ type: 'ycs-player-auth', attemptId: params.get('authAttempt'),
        status: params.get('auth') }, window.location.origin);
      window.close();
    }
  }, [search]);

  function clearLocalPhoto() {
    selectionRevision.current += 1;
    source.current?.close?.(); source.current = null; setImage(null);
    setPhotoChanged(false); setCrop(defaultPhotoCrop()); staged.current = null;
    photoRead.current?.abort(); setRemotePhoto('');
  }

  async function showRecord(record, config) {
    clearLocalPhoto(); setBase(record); setForm(formFromPlayer(record, config));
    setDirty(false); setConflict(null); setUnknown(null); setFieldsError({});
    if (record.profile?.photoAssetId) {
      const controller = new AbortController(); photoRead.current = controller;
      try {
        const blob = await api.photo(record.profile.photoAssetId, controller.signal);
        if (!controller.signal.aborted && mounted.current) setRemotePhoto(URL.createObjectURL(blob));
      } catch (failure) {
        if (!controller.signal.aborted && mounted.current) setError('Сохранённое фото пока не загрузилось. Данные профиля сохранены.');
      }
    }
  }

  useEffect(() => () => { if (remotePhoto) URL.revokeObjectURL(remotePhoto); }, [remotePhoto]);

  useEffect(() => {
    if (initialSearch === null && !search && typeof window !== 'undefined' && window.location.search) return;
    const controller = new AbortController();
    const previous = { ownerId: owner.current, dirty: state.current.dirty, context: state.current.context };
    let contextResolved = false;
    setContext(null); setError(''); setNotice(''); setReadFailed(false); setBusy('loading');
    if (!discipline) { setBusy(''); return () => controller.abort(); }
    (async () => {
      try {
        const config = await api.context(discipline, controller.signal);
        contextResolved = true;
        const signedIn = config.available === false ? { authenticated: false } : await api.session(controller.signal);
        if (controller.signal.aborted) return;
        setContext(config); setSession(signedIn);
        if (signedIn.authenticated) {
          const record = await api.me(discipline, controller.signal);
          if (controller.signal.aborted) return;
          const preserve = previous.ownerId === signedIn.ownerId && previous.dirty && previous.context?.discipline.code === discipline;
          owner.current = signedIn.ownerId;
          if (!preserve) await showRecord(record, config);
        } else if (owner.current && !state.current.dirty) {
          owner.current = null; clearLocalPhoto(); setBase(initialBase); setForm(emptyPlayerForm());
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          if (!contextResolved) {
            const unavailable = unavailablePlayerContext(discipline);
            if (unavailable) setContext(unavailable);
          }
          setError(failure.message); setReadFailed(true);
          if (failure.status === 401) setSession((previous) => ({ ...previous, authenticated: false }));
        }
      } finally { if (!controller.signal.aborted) setBusy(''); }
    })();
    return () => controller.abort();
  }, [discipline, api, reload, initialSearch]);

  useEffect(() => {
    if (!image || !canvas.current) return;
    try { drawPlayerCrop(canvas.current, image, crop, context?.photo?.size || 1024); }
    catch (failure) { setError(failure.message); }
  }, [image, crop, context?.photo?.size]);

  useEffect(() => {
    if (!dirty && !unknown) return;
    const leave = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty, unknown]);

  function change(key, value) {
    setForm((previous) => ({ ...previous, [key]: value })); setDirty(true); setNotice('');
    setFieldsError((previous) => ({ ...previous, [key]: null }));
  }
  function changeCrop(key, value) {
    setCrop((previous) => ({ ...previous, [key]: value })); setPhotoChanged(true);
    staged.current = null; setDirty(true); setNotice('');
  }

  function cancelPhoto() {
    selectionRevision.current += 1; source.current?.close?.(); source.current = null;
    setImage(null); setCrop(defaultPhotoCrop()); setPhotoChanged(false); staged.current = null;
    setDirty(JSON.stringify(form) !== JSON.stringify(formFromPlayer(base, context)));
    setNotice('Выбор фото отменён. Остальные поля остались на странице.');
  }

  async function selectPhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const revision = ++selectionRevision.current;
    setError(''); setBusy('photo');
    try {
      if (!context.photo.formats.includes(file.type)) throw new Error('Выберите JPEG, PNG или WebP.');
      if (file.size > context.photo.maxBytes) throw new Error(`Фото должно быть не больше ${Math.floor(context.photo.maxBytes / 1024 / 1024)} МБ.`);
      let bitmap;
      if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      else {
        const url = URL.createObjectURL(file);
        try { bitmap = await new Promise((resolve, reject) => {
          const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error('Не удалось открыть фото.'));
          element.src = url;
        }); } finally { URL.revokeObjectURL(url); }
      }
      if (!mounted.current || revision !== selectionRevision.current) { bitmap.close?.(); return; }
      if ((bitmap.width || bitmap.naturalWidth) * (bitmap.height || bitmap.naturalHeight) > context.photo.maxPixels) {
        bitmap.close?.(); throw new Error('У фотографии слишком большое разрешение. Уменьшите её и выберите снова.');
      }
      source.current?.close?.(); source.current = bitmap; setImage(bitmap);
      setCrop(defaultPhotoCrop()); setPhotoChanged(true); staged.current = null; setDirty(true); setNotice('');
    } catch (failure) {
      if (mounted.current && revision === selectionRevision.current) setError(failure.message || 'Не удалось открыть фото.');
    } finally { if (mounted.current && revision === selectionRevision.current) setBusy(''); }
  }

  async function finishAuth() {
    const signedIn = await api.session();
    if (!signedIn.authenticated) throw new Error('Вход не завершён. Попробуйте ещё раз.');
    if (!mounted.current) return;
    const previousOwner = owner.current;
    const changedOwner = previousOwner !== signedIn.ownerId;
    if (changedOwner) {
      clearLocalPhoto(); setBase(initialBase); setForm(emptyPlayerForm()); setDirty(false);
      setUnknown(null); setConflict(null); setFieldsError({});
    }
    setSession(signedIn); owner.current = signedIn.ownerId;
    if (changedOwner || !state.current.dirty) {
      try {
        const record = await api.me(discipline);
        if (!mounted.current) return;
        await showRecord(record, context); setReadFailed(false);
        if (previousOwner && changedOwner) setNotice('Выполнен вход в другой профиль. Прежний черновик очищен.');
      } catch (failure) { if (mounted.current) setReadFailed(true); throw failure; }
    }
    setError('');
  }

  async function login(provider, intent = 'login') {
    const popup = window.open('', 'ycs-player-auth', 'popup,width=560,height=740');
    if (!popup) { setError('Браузер заблокировал окно входа. Разрешите всплывающее окно и нажмите вход ещё раз.'); return; }
    authRun.current?.cancel(); setAuthBusy(provider); setError('');
    let timer; let stopped = false; let polling = false;
    const originalSession = session;
    const stop = (unlock = true) => {
      stopped = true; window.clearInterval(timer); window.removeEventListener('message', message);
      if (unlock && mounted.current) setAuthBusy('');
    };
    const complete = async () => { if (stopped) return; stop(false);
      try { await finishAuth(); } catch (failure) { if (mounted.current) setError(failure.message); }
      finally { if (mounted.current) setAuthBusy(''); } };
    let attemptId;
    const message = (event) => {
      if (event.origin !== window.location.origin || event.source !== popup ||
        event.data?.type !== 'ycs-player-auth' || event.data.attemptId !== attemptId) return;
      if (event.data.status === 'success') complete();
      else { stop(); popup.close(); setError('Вход или привязка не завершены. Профиль не изменён.'); }
    };
    authRun.current = { cancel: () => { stop(); popup.close(); } };
    try {
      const result = await api.start({ provider, intent, Dis: discipline });
      if (stopped || !mounted.current) { popup.close(); return; }
      const target = new URL(result.authorizationUrl);
      const allowedHosts = provider === 'telegram' ? ['oauth.telegram.org'] : ['id.vk.com', 'id.vk.ru', 'oauth.vk.com', 'oauth.vk.ru'];
      if (target.protocol !== 'https:' || !allowedHosts.includes(target.hostname)) throw new Error('Сервис вернул неверный адрес входа.');
      attemptId = result.attemptId; window.addEventListener('message', message); popup.location.href = target.href;
      const deadline = Date.now() + 5 * 60_000;
      timer = window.setInterval(async () => {
        if (stopped || polling) return;
        if (Date.now() > deadline) { stop(); popup.close(); setError('Время входа истекло. Попробуйте ещё раз.'); return; }
        if (!popup.closed) return;
        polling = true;
        try {
          const current = await api.session();
          const changed = current.authenticated && (!originalSession?.authenticated || current.ownerId !== originalSession.ownerId ||
            (intent === 'link' && !originalSession.providers?.includes(provider) && current.providers?.includes(provider)));
          if (changed) await complete();
          else { stop(); setError('Окно входа закрыто. Черновик остался на странице.'); }
        } catch (failure) { stop(); if (mounted.current) setError(failure.message); }
        finally { polling = false; }
      }, 1200);
    } catch (failure) { stop(); popup.close(); if (mounted.current) setError(failure.message); }
  }

  function failedSession(failure) {
    if (failure.status === 401 || failure.code === 'csrf_failed') setSession((previous) => ({ ...previous, authenticated: false }));
    setError(failure.message); setFieldsError(failure.fields || {});
  }

  async function committed(result) {
    if (!mounted.current) return;
    await showRecord(result.profile ? result : await api.me(discipline), context);
    setNotice('Профиль сохранён.'); setError('');
  }
  async function sendSave(operation) {
    try { await committed(await api.save(operation.body)); }
    catch (failure) {
      if (!mounted.current) return;
      if (failure.status >= 400 && failure.status < 500 && failure.status !== 401) setUnknown(null);
      if (failure.code === 'network_error' || failure.status >= 500) {
        setUnknown(operation); setError('Сервер пока не подтвердил сохранение. Проверьте его статус перед повтором.');
      } else if (failure.code === 'permission_text_outdated') {
        try {
          const fresh = await api.context(discipline); setContext(fresh);
          setForm((previous) => ({ ...previous, usagePermissions: fresh.usagePermissions.map((permission) => ({
            purpose: permission.purpose, textVersion: permission.textVersion,
            allowed: Boolean(previous.usagePermissions.find((item) => item.purpose === permission.purpose && item.textVersion === permission.textVersion)?.allowed),
          })) }));
        } catch { /* The unchanged draft remains available when configuration cannot be re-read. */ }
        failedSession(failure);
      } else if (failure.code === 'version_conflict') {
        try { setConflict(await api.me(discipline)); } catch { /* Keep the draft and explain the original conflict. */ }
        failedSession(failure);
      } else failedSession(failure);
    }
  }
  async function save(event) {
    event.preventDefault(); if (busy || unknown || conflict) return;
    setBusy('save'); setError(''); setNotice(''); setFieldsError({});
    try {
      let photoAssetId = base.profile?.photoAssetId;
      if (photoChanged) {
        if (!staged.current) staged.current = await api.upload(await playerPhotoBlob(canvas.current));
        photoAssetId = staged.current.assetId;
      }
      const body = playerSaveRequest({ form, context, base, photoAssetId, requestId: crypto.randomUUID() });
      await sendSave({ body, firstSentAt: Date.now() });
    } catch (failure) { if (mounted.current) failedSession(failure); }
    finally { if (mounted.current) setBusy(''); }
  }
  async function resolveSave(retry = false) {
    if (!unknown || busy) return;
    setBusy('save'); setError('');
    try {
      const receipt = await api.operation(unknown.body.requestId);
      if (receipt.status === 'committed') await committed(await api.me(discipline));
      else if (receipt.status === 'rejected') { setUnknown(null); setError('Сохранение отклонено сервером. Проверьте поля и сохраните снова.'); }
      else if (Date.now() - unknown.firstSentAt >= context.retryWindowMs) {
        setConflict(await api.me(discipline)); setUnknown(null);
        setError('Время безопасного повтора закончилось. Сравните сохранённый профиль со своим черновиком.');
      } else if (receipt.status === 'not_found' && retry) await sendSave(unknown);
      else setError(receipt.status === 'not_found' ? 'Квитанция пока не найдена. Можно повторить тот же запрос.' : 'Сохранение ещё обрабатывается. Проверьте статус позже.');
    } catch (failure) { if (mounted.current) failedSession(failure); }
    finally { if (mounted.current) setBusy(''); }
  }
  async function logout() {
    setBusy('logout'); setError('');
    try {
      await api.logout(); owner.current = null; clearLocalPhoto(); setBase(initialBase);
      setForm(emptyPlayerForm()); setDirty(false); setUnknown(null); setConflict(null); setNotice('');
      setSession(await api.session());
    } catch (failure) { if (mounted.current) failedSession(failure); }
    finally { if (mounted.current) setBusy(''); }
  }

  const editable = session?.authenticated && context?.available !== false;
  const locked = Boolean(busy || authBusy || unknown || conflict || readFailed || !editable);
  const photoReady = Boolean(image || base.profile?.photoAssetId);
  const hasMandatoryFields = (context?.fields || []).filter((field) => field.scope === 'profile' && field.required && field.id !== 'photoAssetId')
    .every((field) => String(form[field.id] ?? '').trim());
  const canSave = Boolean(form.nickname.trim() && photoReady && hasMandatoryFields && !locked && dirty);
  const formFields = context?.fields?.filter((field) => field.scope === 'profile' && field.id !== 'photoAssetId') || [];
  const providers = context?.providers || {};
  const displayRoles = context?.discipline.roles?.filter((role) => form.roleIds.includes(role.id)).map((role) => role.label) || [];

  return <main className="player-page">
    <header className="player-heading">
      <p className="player-kicker">ЯРКИБЕРСЕЗОН / ИГРОК</p>
      <div><h1>Мой профиль<br /><span>игрока</span></h1>
        <div className="player-heading-note"><span className="player-discipline">{context?.discipline.label || 'Дисциплина из ссылки'}</span>
          <p>Твой ник. Твоё лицо.<br />Твоя карточка ЯКС.</p></div></div>
    </header>
    {!discipline ? <section className="player-message" role="alert"><h2>В ссылке не указана дисциплина</h2>
      <p>Откройте полную ссылку от организатора — например, с параметром <code>?Dis=cs</code> для CS2.</p><a href="/">К турнирам</a></section>
      : <>
        {busy === 'loading' && <p className="player-message" role="status">Загружаем профиль…</p>}
        {error && <div className="player-message player-message--error" role="alert"><p>{error}</p>
          {(!context || readFailed) && !busy && <button type="button" onClick={() => setReload((value) => value + 1)}>Попробовать ещё раз</button>}</div>}
        {notice && <p className="player-message player-message--success" role="status">{notice}</p>}
        {context && <>
          <section className="player-access" aria-label="Вход в профиль">
            <div><strong>{session?.authenticated ? 'Это твой профиль' : owner.current ? 'Сессия закончилась' : 'Один вход — свой профиль'}</strong>
              <p>{session?.authenticated ? 'Ник и фото общие для всех дисциплин.' : 'Войди через Telegram или VK, чтобы заполнить и сохранить карточку.'}</p></div>
            <div className="player-auth-buttons">{['telegram', 'vk'].map((provider) => {
              const linked = session?.authenticated && session.providers?.includes(provider);
              return <button key={provider} type="button" disabled={Boolean(busy || authBusy || linked || !providers[provider] || context.available === false)}
                onClick={() => login(provider, session?.authenticated ? 'link' : 'login')}>
                {authBusy === provider ? 'Открываем вход…' : linked ? `${provider === 'vk' ? 'VK' : 'Telegram'} подключён ✓` :
                  `${session?.authenticated ? 'Привязать' : 'Войти через'} ${provider === 'vk' ? 'VK' : 'Telegram'}`}</button>;
            })}{session?.authenticated && <button className="player-quiet" type="button" disabled={Boolean(busy || authBusy || unknown)} onClick={logout}>Выйти</button>}</div>
            {(context.available === false || (!providers.telegram && !providers.vk)) && <p className="player-access-note">Сервис профиля ещё не подключён. Вход и сохранение станут доступны после настройки.</p>}
          </section>
          <div className="player-workspace">
            <aside className="player-card-rail" aria-label="Предпросмотр карточки">
              <article className="player-card">
                <div className="player-card-top"><span>YCS / PLAYER</span><span>{context.discipline.label}</span></div>
                <div className="player-portrait">{image ? <canvas ref={canvas} aria-label="Выбранный кадр фотографии" />
                  : remotePhoto ? <img src={remotePhoto} alt="Ваше фото игрока" /> : <div className="player-photo-empty"><UserCircle weight="thin" aria-hidden="true" /><span>Здесь будет твоё фото</span></div>}</div>
                <div className="player-card-identity"><p>{form.name || 'ПРОФИЛЬ ИГРОКА'}</p><h2>{form.nickname || 'ТВОЙ НИК'}</h2>
                  <span>{[form.city, ...displayRoles].filter(Boolean).join(' / ') || context.discipline.label}</span></div>
                <div className="player-card-foot"><img src="/assets/ycs-logo.jpg" width="58" height="32" alt="ЯКС" /><span>{dirty ? 'ПРЕДПРОСМОТР' : base.playerId ? 'ПРОФИЛЬ СОХРАНЁН' : 'ТВОЯ КАРТОЧКА'}</span></div>
              </article>
              <p className="player-preview-note">Изменения сразу видны на карточке.<br />Сохранение не публикует её на сайте.</p>
            </aside>
            <form className="player-form" onSubmit={save}>
              <fieldset disabled={locked}><legend><span>01</span> Лицо команды — ты</legend>
                <label className="player-upload"><Camera size={24} aria-hidden="true" /><span>{image || base.profile?.photoAssetId ? 'Заменить фото' : 'Выбрать фото'}<small>JPEG, PNG или WebP · до {Math.floor(context.photo.maxBytes / 1024 / 1024)} МБ</small></span>
                  <input type="file" accept={context.photo.formats.join(',')} onChange={selectPhoto} aria-label="Выбрать фотографию игрока" /></label>
                {image && <div className="player-crop"><button type="button" onClick={() => changeCrop('rotation', (crop.rotation + 90) % 360)}><ArrowClockwise aria-hidden="true" /> Повернуть на 90°</button>
                  {[['zoom', 'Масштаб', 1, 3, .05], ['horizontal', 'Кадр по горизонтали', -100, 100, 1], ['vertical', 'Кадр по вертикали', -100, 100, 1]].map(([key, label, min, max, step]) =>
                    <label key={key}>{label}<input type="range" min={min} max={max} step={step} value={crop[key]} onChange={(event) => changeCrop(key, Number(event.target.value))} /></label>)}
                  <button type="button" className="player-quiet" onClick={() => { setCrop(defaultPhotoCrop()); staged.current = null; setPhotoChanged(true); setDirty(true); }}>Сбросить кадр</button>
                  <button type="button" className="player-quiet" onClick={cancelPhoto}>{base.profile?.photoAssetId ? 'Отменить замену фото' : 'Отменить выбор фото'}</button></div>}
                <p className="player-help">Фото обязательно. ФИО можно оставить пустым.</p>
              </fieldset>
              <fieldset disabled={locked}><legend><span>02</span> Как тебя узнают</legend>
                <div className="player-fields">{formFields.map((field) => <label key={field.id} className={field.id === 'nickname' ? 'player-field-wide' : ''}>
                  {labels[field.id] || field.label || field.id}{field.required ? ' *' : <small>Необязательно</small>}
                  <input type="text" name={field.id} value={form[field.id] ?? ''} required={field.required} maxLength={field.maxLength || 160}
                    autoComplete={field.id === 'name' ? 'name' : field.id === 'city' ? 'address-level2' : 'nickname'}
                    placeholder={field.id === 'nickname' ? 'Ник, который запомнят' : ''}
                    aria-invalid={Boolean(fieldsError[field.id])} aria-describedby={fieldsError[field.id] ? `player-error-${field.id}` : undefined}
                    onChange={(event) => change(field.id, event.target.value)} />
                  {fieldsError[field.id] && <span id={`player-error-${field.id}`} className="player-field-error">Проверьте значение поля.</span>}</label>)}</div>
              </fieldset>
              <fieldset disabled={locked}><legend><span>03</span> В игре</legend>
                <p className="player-help">Эти сведения относятся к {context.discipline.label}. Их можно добавить позже.</p>
                {context.discipline.roles?.length > 0 && <div className="player-roles" role="group" aria-label="Игровые роли">
                  {context.discipline.roles.map((role) => <label key={role.id}><input type="checkbox" checked={form.roleIds.includes(role.id)}
                    onChange={(event) => change('roleIds', event.target.checked ? [...form.roleIds, role.id] : form.roleIds.filter((id) => id !== role.id))} /><span>{role.label}</span></label>)}</div>}
                <label className="player-steam">Steam ID <small>Необязательно</small><input type="text" name="steam" value={form.steam} maxLength="100" onChange={(event) => change('steam', event.target.value)} placeholder="Идентификатор игрового аккаунта" /></label>
                <p className="player-help">Указание Steam ID не подтверждает владение аккаунтом. Команда связывается отдельно по подтверждённой заявке.</p>
              </fieldset>
              <section className="player-privacy"><ShieldCheck size={25} aria-hidden="true" /><div><strong>Сначала — твой профиль</strong>
                <p>Данные и фото доступны тебе и уполномоченному организатору. Профиль существует отдельно от заявки на турнир.</p>
                {context.usagePermissions?.map((permission) => <label key={permission.purpose}><input type="checkbox" disabled={locked}
                  checked={Boolean(form.usagePermissions.find((item) => item.purpose === permission.purpose)?.allowed)}
                  onChange={(event) => change('usagePermissions', form.usagePermissions.map((item) => item.purpose === permission.purpose ? { ...item, allowed: event.target.checked } : item))} />
                  <span>{permission.text || permission.label}</span></label>)}</div></section>
              {conflict && <section className="player-message" aria-label="Сравнение версий"><h3>На сервере уже есть другая версия</h3>
                <ConflictComparison record={conflict} form={form} context={context} api={api} />
                <div className="player-conflict-actions"><button type="button" onClick={() => showRecord(conflict, context)}>Загрузить сохранённый профиль</button>
                  <button type="button" onClick={() => { setBase(conflict); setConflict(null); setDirty(true); setError(''); setNotice('Черновик сохранён на странице. Проверьте все поля и нажмите «Сохранить профиль».'); }}>Оставить мои правки для следующего сохранения</button></div></section>}
              {unknown && <section className="player-message" aria-label="Статус сохранения"><h3>Проверим, сохранился ли профиль</h3><p>Введённые данные и исходный запрос удерживаются на странице.</p>
                <div className="player-conflict-actions"><button type="button" disabled={Boolean(busy)} onClick={() => resolveSave()}>Проверить сохранение</button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => resolveSave(true)}>Проверить и повторить тот же запрос</button></div></section>}
              <div className="player-save"><div><strong>{busy === 'save' ? 'Сохраняем…' : dirty ? 'Есть несохранённые изменения' : base.playerId ? 'Все изменения сохранены' : 'Начни с ника и фото'}</strong>
                <p>{!session?.authenticated ? 'Для сохранения нужен вход.' : !photoReady || !form.nickname.trim() ? 'Обязательны никнейм и фотография.' : 'Общие ник и фото обновятся во всех дисциплинах.'}</p></div>
                <button type="submit" className="player-save-button" disabled={!canSave}>{busy === 'save' ? 'Сохраняем…' : <><Check aria-hidden="true" /> Сохранить профиль</>}</button></div>
            </form>
          </div>
        </>}
      </>}
  </main>;
}
