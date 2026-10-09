import { useCallback, useEffect, useRef, useState } from 'react';

const moscowFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
});
function moscowTime(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? `${moscowFormat.format(date)} МСК` : 'Время не указано';
}
function usernameValue(value) { return value.trim().replace(/^@/, '').toLowerCase(); }

export function CaptainActivity({ matches = [] }) {
  if (!matches.length) return <p className="orgs-empty">Матчи для кабинета ещё не опубликованы.</p>;
  return <div className="orgs-captain-activity">{matches.map(({ match, proposal, agreed, resultClaims = [] }) => {
    const teamName = (id) => [match.team1, match.team2].find((team) => team.id === id)?.name || 'Команда';
    const pending = proposal && proposal.confirmedTeamIds.length < 2;
    return <article className="orgs-captain-match" key={match.id}>
      <header><small>{match.round} · {match.bestOf || 'Формат уточняется'}</small><h3>{match.team1.name} <span>×</span> {match.team2.name}</h3></header>
      <div className="orgs-captain-time">
        {agreed ? <><span className="orgs-status orgs-status--completed">Время согласовано</span><strong>{moscowTime(agreed.startsAt)}</strong><small>Согласовано {moscowTime(agreed.agreedAt)}</small></> : <><span className="orgs-status">Время не согласовано</span>{match.scheduledAt && <small>В расписании: {moscowTime(match.scheduledAt)}</small>}</>}
        {pending && <div className="orgs-captain-pending"><span>Ожидает подтверждения · {proposal.confirmedTeamIds.length}/2</span><strong>{moscowTime(proposal.startsAt)}</strong><small>{proposal.confirmedTeamIds.length ? `Подтвердили: ${proposal.confirmedTeamIds.map(teamName).join(', ')}` : 'Подтверждений пока нет'}</small></div>}
      </div>
      <div className="orgs-captain-claims"><h4>Заявки на результат</h4>{resultClaims.length ? <ul>{resultClaims.map((claim) => <li key={claim.id}>
        <div><strong>{claim.score.join(' : ')}</strong><span>{teamName(claim.teamId)}</span></div><small>{moscowTime(claim.createdAt)}</small>{claim.comment && <p>{claim.comment}</p>}
      </li>)}</ul> : <p className="orgs-missing">Заявок пока нет.</p>}</div>
    </article>;
  })}</div>;
}

export default function OrganizerCaptains({ token, api, onSessionExpired }) {
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(null);
  const [filter, setFilter] = useState('all');
  const active = useRef(false);
  const readRequest = useRef(null);
  const writeRequest = useRef(null);
  const writing = useRef(false);
  const expired = useRef(onSessionExpired);
  expired.current = onSessionExpired;

  const load = useCallback(async ({ preserveError = false } = {}) => {
    if (!active.current || writing.current) return;
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setLoading(true);
    try {
      const result = await api('captains', { token, signal: controller.signal });
      if (active.current && readRequest.current === controller && !controller.signal.aborted) {
        setData(result);
        if (!preserveError) setError('');
      }
    } catch (failure) {
      if (active.current && readRequest.current === controller) {
        if (failure.status === 401) expired.current();
        else if (!preserveError) setError(failure.name === 'AbortError' ? 'Сервис не ответил вовремя. Обновите данные.' : failure.message);
      }
    } finally {
      window.clearTimeout(timeout);
      if (active.current && readRequest.current === controller) { setLoading(false); readRequest.current = null; }
    }
  }, [api, token]);

  useEffect(() => {
    active.current = true;
    load();
    const refresh = () => load({ preserveError: true });
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      active.current = false;
      readRequest.current?.abort(); writeRequest.current?.abort();
      window.clearInterval(timer); window.removeEventListener('focus', refresh);
    };
  }, [load]);

  async function save(body) {
    if (writing.current) return;
    writing.current = true;
    readRequest.current?.abort(); readRequest.current = null;
    const controller = new AbortController();
    writeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setSaving(true); setLoading(false); setError(''); setNotice(''); setRetry(body);
    let reread = false;
    try {
      const result = await api('captains', { token, body, signal: controller.signal });
      if (!active.current || controller.signal.aborted) return;
      setData(result); setRetry(null);
      setDrafts((previous) => { const next = { ...previous }; delete next[body.teamId]; return next; });
      setNotice(body.username === null ? 'Доступ капитана отозван.' : 'Капитан сохранён. После входа ему будет доступен кабинет.');
    } catch (failure) {
      if (!active.current) return;
      if (failure.status === 401) { expired.current(); return; }
      const definite = failure.status >= 400 && failure.status < 500;
      if (definite) setRetry(null);
      setError(definite ? failure.message : `${failure.name === 'AbortError' ? 'Сервис не ответил вовремя.' : failure.message} Результат сохранения неизвестен. Повторите запрос: дубль не появится.`);
      reread = true;
    } finally {
      window.clearTimeout(timeout);
      writing.current = false; writeRequest.current = null;
      if (active.current) { setSaving(false); if (reread) load({ preserveError: true }); }
    }
  }

  function submit(event, teamId) {
    event.preventDefault();
    if (!data || retry || writing.current) return;
    const username = usernameValue(drafts[teamId] ?? data.bindings.find((binding) => binding.teamId === teamId)?.username ?? '');
    if (!/^[a-z0-9_]{1,32}$/.test(username)) { setError('Введите Telegram-ник: до 32 латинских букв, цифр и подчёркиваний.'); return; }
    save({ requestId: crypto.randomUUID(), expectedRevision: data.revision, teamId, username });
  }
  const matches = (data?.matches || []).filter((detail) => filter === 'all' || (filter === 'pending' ? detail.proposal && detail.proposal.confirmedTeamIds.length < 2 : detail.resultClaims.length > 0));

  return <section className="orgs-captains" aria-labelledby="orgs-captains-title">
    <div className="orgs-title"><div><p className="orgs-eyebrow">Dota 2 · осень 2026</p><h1 id="orgs-captains-title">Капитаны</h1><p>Доступ команд, согласованное время и заявки на результат</p></div><div className="orgs-sync"><button type="button" disabled={loading || saving} onClick={() => load()}>{loading ? 'Обновляем…' : 'Обновить'}</button><small>Время в МСК</small></div></div>
    {error && <p className="orgs-error" role="alert">{error}{data && ' Ниже — последние полученные данные.'}</p>}
    {retry && <div className="orgs-captain-retry"><span>{saving ? 'Сохраняем назначение…' : 'Не меняйте назначение до проверки этого запроса.'}</span><button type="button" disabled={saving} onClick={() => save(retry)}>{saving ? 'Сохраняем…' : 'Повторить сохранение'}</button></div>}
    {notice && <p className="orgs-captain-notice" role="status">{notice}</p>}
    {!data ? <p className="orgs-empty" role="status">{loading ? 'Загружаем капитанов…' : 'Данные кабинета пока недоступны.'}</p> : <>
      <section aria-labelledby="orgs-captain-registry-title"><div className="orgs-captain-heading"><h2 id="orgs-captain-registry-title">Доступ к кабинету</h2><p>Укажите Telegram-ник капитана напротив команды. Первый вход закрепляет доступ за его аккаунтом. Смена назначения или отзыв закрывает прежний доступ.</p></div>
        <div className="orgs-captain-registry">{data.teams.map((team) => {
          const binding = data.bindings.find((entry) => entry.teamId === team.id);
          const value = drafts[team.id] ?? binding?.username ?? '';
          const dirty = usernameValue(value) !== (binding?.username || '');
          return <form key={team.id} className="orgs-captain-row" onSubmit={(event) => submit(event, team.id)}>
            <div className="orgs-captain-team"><strong>{team.name}</strong><small>{binding?.username ? binding.linked ? 'Аккаунт подтверждён входом' : 'Ожидает первого входа' : 'Капитан не назначен'}</small></div>
            <label><span>Telegram-ник · {team.name}</span><input name="username" aria-label={`Telegram-ник капитана ${team.name}`} placeholder="@username" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={33} value={value} disabled={saving || Boolean(retry)} onChange={(event) => { setDrafts((previous) => ({ ...previous, [team.id]: event.target.value })); setNotice(''); }} /></label>
            <div className="orgs-captain-actions"><button type="submit" disabled={!dirty || !usernameValue(value) || saving || Boolean(retry)}>Сохранить</button><button type="button" disabled={!binding?.username || saving || Boolean(retry)} aria-label={`Отозвать доступ капитана ${team.name}`} onClick={() => save({ requestId: crypto.randomUUID(), expectedRevision: data.revision, teamId: team.id, username: null })}>Отозвать</button></div>
          </form>;
        })}</div>
      </section>
      <section className="orgs-captain-results" aria-labelledby="orgs-captain-results-title"><div className="orgs-captain-heading"><div><h2 id="orgs-captain-results-title">Согласования и результаты</h2><p>Заявка капитана не меняет официальный счёт. Счёт указан в порядке команд карточки.</p></div><label>Показать<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Все матчи</option><option value="pending">Ожидают согласования</option><option value="claims">С заявками на результат</option></select></label></div>
        {!matches.length && data.matches.length ? <p className="orgs-empty">По выбранному фильтру матчей нет.</p> : <CaptainActivity matches={matches} />}
      </section>
    </>}
  </section>;
}
