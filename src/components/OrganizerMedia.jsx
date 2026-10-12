import { useCallback, useEffect, useRef, useState } from 'react';
import { createMediaRequestId, formatMediaTime, mediaHttps, parseMediaTime } from '../lib/match-media.js';
import '../organizer-media.css';

const emptyDraft = () => ({ clipId: null, kind: 'clip', url: '', title: '', start: '', end: '' });

export function OrganizerMediaFields({ draft, setDraft, disabled = false }) {
  const field = (key) => (event) => setDraft((previous) => ({ ...previous, [key]: event.target.value }));
  return <div className="orgs-media-fields">
    <label>Материал<select value={draft.kind} onChange={field('kind')} disabled={disabled}>
      <option value="clip">Готовый клип</option><option value="recording">Запись с таймкодом</option>
    </select></label>
    <label>Ссылка HTTPS<input type="url" required maxLength={2048} value={draft.url} onChange={field('url')} disabled={disabled} placeholder="https://…" /></label>
    <label>Название (необязательно)<input maxLength={160} value={draft.title} onChange={field('title')} disabled={disabled} /></label>
    {draft.kind === 'recording' && <>
      <label>Начало<input required inputMode="numeric" placeholder="01:23 или 1:02:03" value={draft.start} onChange={field('start')} disabled={disabled} /></label>
      <label>Конец (необязательно)<input inputMode="numeric" placeholder="01:45" value={draft.end} onChange={field('end')} disabled={disabled} /></label>
      <p className="orgs-missing">Таймкод относится к записи. Здесь сохраняется ссылка; видео автоматически не нарезается.</p>
    </>}
  </div>;
}

export default function OrganizerMedia({ token, api, onSessionExpired }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [selection, setSelection] = useState({ match: '', map: '' }), [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [retry, setRetry] = useState(null);
  const active = useRef(false), readRequest = useRef(null), writeRequest = useRef(null), writing = useRef(false);
  const expired = useRef(onSessionExpired); expired.current = onSessionExpired;
  const load = useCallback(async ({ preserveError = false } = {}) => {
    if (!active.current || writing.current) return;
    readRequest.current?.abort(); const controller = new AbortController(); readRequest.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 20_000); setLoading(true);
    try {
      const next = await api('media', { token, signal: controller.signal });
      if (!active.current || readRequest.current !== controller || controller.signal.aborted) return;
      setData(next); if (!preserveError) setError('');
      setSelection((current) => {
        if (next.matches.some((match) => `${match.tournamentId}/${match.id}` === current.match)) return current;
        const first = next.matches.find((match) => match.maps.length) || next.matches[0];
        return first ? { match: `${first.tournamentId}/${first.id}`, map: first.maps[0]?.mapKey || '' } : { match: '', map: '' };
      });
    } catch (failure) {
      if (!active.current || readRequest.current !== controller) return;
      if (failure.status === 401) expired.current();
      else if (!preserveError) setError(failure.name === 'AbortError' ? 'Сервис не ответил вовремя. Обновите данные.' : failure.message);
    } finally { window.clearTimeout(timer); if (active.current && readRequest.current === controller) { setLoading(false); readRequest.current = null; } }
  }, [api, token]);
  useEffect(() => { active.current = true; load(); return () => { active.current = false; readRequest.current?.abort(); writeRequest.current?.abort(); }; }, [load]);
  const match = data?.matches.find((item) => `${item.tournamentId}/${item.id}` === selection.match);
  const map = match?.maps.find((item) => item.mapKey === selection.map);
  const clips = (data?.clips || []).filter((clip) => clip.tournamentId === match?.tournamentId && clip.matchId === match?.id && clip.mapKey === map?.mapKey);
  const disabled = saving || loading || Boolean(retry);
  function selectMatch(value) {
    const next = data.matches.find((item) => `${item.tournamentId}/${item.id}` === value);
    setSelection({ match: value, map: next?.maps[0]?.mapKey || '' }); setDraft(emptyDraft()); setError(''); setNotice('');
  }
  async function save(body) {
    if (writing.current) return;
    writing.current = true; readRequest.current?.abort(); readRequest.current = null;
    const controller = new AbortController(); writeRequest.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    setSaving(true); setLoading(false); setError(''); setNotice(''); setRetry(body);
    let reread = false;
    try {
      const next = await api('media', { token, body, signal: controller.signal });
      if (!active.current || controller.signal.aborted) return;
      setData(next); setDraft(emptyDraft()); setRetry(null);
      setNotice(body.action === 'delete' ? 'Клип удалён.' : 'Материал сохранён и доступен на странице этой карты.');
    } catch (failure) {
      if (!active.current) return;
      if (failure.status === 401) { expired.current(); return; }
      const definite = failure.status >= 400 && failure.status < 500;
      if (definite) setRetry(null);
      setError(definite ? failure.message : `${failure.name === 'AbortError' ? 'Сервис не ответил вовремя.' : failure.message} Результат сохранения неизвестен. Повторите тот же запрос: дубль не появится.`);
      reread = true;
    } finally {
      window.clearTimeout(timer); writing.current = false; writeRequest.current = null;
      if (active.current) { setSaving(false); if (reread) load({ preserveError: true }); }
    }
  }
  function mutation(action, clipId) {
    return { action, requestId: createMediaRequestId(), expectedRevision: data.revision,
      tournamentId: match.tournamentId, matchId: match.id, mapKey: map.mapKey, ...(clipId ? { clipId } : {}) };
  }
  function submit(event) {
    event.preventDefault(); if (!map || disabled || writing.current) return;
    const url = mediaHttps(draft.url.trim());
    const startSeconds = draft.kind === 'recording' ? parseMediaTime(draft.start) : null;
    const endSeconds = draft.kind === 'recording' && draft.end.trim() ? parseMediaTime(draft.end) : null;
    if (!url || draft.kind === 'recording' && (startSeconds === null || draft.end.trim() && (endSeconds === null || endSeconds <= startSeconds))) {
      setError('Укажите ссылку HTTPS и корректный таймкод. Конец должен быть позже начала.'); return;
    }
    save({ ...mutation('upsert', draft.clipId), kind: draft.kind, url, title: draft.title.trim(), startSeconds, endSeconds });
  }
  return <section className="orgs-media" aria-labelledby="orgs-media-title">
    <div className="orgs-title"><div><p className="orgs-eyebrow">Карта матча</p><h1 id="orgs-media-title">Клипы и записи</h1><p>Готовый клип или запись с таймкодом — для конкретной сыгранной карты.</p></div>
      <button type="button" disabled={loading || saving} onClick={() => load()}>Обновить</button></div>
    {error && <p className="orgs-error" role="alert">{error}</p>}{notice && <p className="orgs-captain-notice" role="status">{notice}</p>}
    {retry && <div className="orgs-captain-retry"><span>Запрос можно безопасно повторить.</span><button disabled={saving} onClick={() => save(retry)}>Повторить {retry.action === 'delete' ? 'удаление' : 'сохранение'}</button></div>}
    {!data ? <p role="status">{loading ? 'Получаем материалы…' : 'Материалы недоступны. Попробуйте обновить.'}</p> : <>
      <div className="orgs-media-selectors"><label>Матч<select value={selection.match} disabled={disabled} onChange={(event) => selectMatch(event.target.value)}>
        {!data.matches.length && <option value="">Матчи не опубликованы</option>}
        {data.matches.map((item) => <option key={`${item.tournamentId}/${item.id}`} value={`${item.tournamentId}/${item.id}`}>{item.tournamentTitle} · {item.team1 || 'Участник уточняется'} — {item.team2 || 'Участник уточняется'} · {item.id}</option>)}
      </select></label><label>Карта<select value={selection.map} disabled={disabled || !match?.maps.length} onChange={(event) => { setSelection((previous) => ({ ...previous, map: event.target.value })); setDraft(emptyDraft()); setError(''); setNotice(''); }}>
        {!match?.maps.length && <option value="">Нет опубликованных сыгранных карт</option>}
        {match?.maps.map((item) => <option key={item.mapKey} value={item.mapKey}>Карта {item.mapNumber} · {item.name}{item.mapId ? ` · ${item.mapId}` : ''}</option>)}
      </select></label></div>
      {map ? <><div className="orgs-media-list">{clips.length ? clips.map((clip) => <article className="orgs-media-item" key={clip.id}>
        <div><a href={clip.href} target="_blank" rel="noopener noreferrer">{clip.title || (clip.kind === 'clip' ? 'Клип' : 'Запись с таймкодом')} ↗</a>
          {clip.kind === 'recording' && <small>{formatMediaTime(clip.startSeconds)}{clip.endSeconds !== null ? ` — ${formatMediaTime(clip.endSeconds)}` : ''}</small>}</div>
        <div><button type="button" disabled={disabled} onClick={() => { setDraft({ clipId: clip.id, kind: clip.kind, url: clip.url, title: clip.title, start: formatMediaTime(clip.startSeconds), end: formatMediaTime(clip.endSeconds) }); setNotice(''); }}>Изменить</button>
          <button type="button" disabled={disabled} onClick={() => save(mutation('delete', clip.id))}>Удалить</button></div>
      </article>) : <p className="orgs-missing">У этой карты пока нет клипов. Пустой блок не показывается на сайте.</p>}</div>
      <form className="orgs-media-form" onSubmit={submit}><h2>{draft.clipId ? 'Изменить материал' : 'Добавить материал'}</h2>
        <OrganizerMediaFields draft={draft} setDraft={setDraft} disabled={disabled} />
        <div className="orgs-media-actions"><button className="orgs-primary" disabled={disabled}>{saving ? 'Сохраняем…' : 'Сохранить'}</button>
          {draft.clipId && <button type="button" disabled={disabled} onClick={() => setDraft(emptyDraft())}>Отменить изменение</button>}</div>
      </form></> : <p className="orgs-missing">Добавление станет доступно, когда будет опубликована сыгранная карта. Пустые и технические карты не получают клипы.</p>}
    </>}
  </section>;
}
