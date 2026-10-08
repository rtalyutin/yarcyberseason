import { useEffect, useMemo, useRef, useState } from 'react';
import { filterOrganizerRows, organizerDate, organizerTimeNote } from '../lib/organizer-table.js';
import { matchStates } from '../lib/community.js';
import { defaultColumnOrder, moveOrganizerColumn, organizerColumns, toggleOrganizerColumn } from '../lib/organizer-columns.js';
import '../organizer.css';

const apiBase = (import.meta.env.VITE_YCS_ORGS_API_URL || '').replace(/\/+$/, '');
const errors = {
  invalid_credentials: 'Неверный логин или пароль.', unauthorized: 'Сессия закончилась. Войдите снова.',
  too_many_attempts: 'Слишком много попыток. Повторите вход через минуту.',
  orgs_not_configured: 'Доступ для организаторов ещё не настроен.',
  data_unavailable: 'Не удалось получить данные матчей. Попробуйте обновить таблицу.',
};
async function api(path, { token, signal, body } = {}) {
  const response = await fetch(`${apiBase}/api/orgs/${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return null;
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Сервис организаторов недоступен.'); }
  if (!response.ok) throw Object.assign(new Error(errors[result.error] || 'Сервис организаторов недоступен.'), { status: response.status });
  return result;
}

function Names({ items, empty }) {
  if (!items.length) return empty ? <span className="orgs-missing">{empty}</span> : null;
  return <ul className="orgs-names">{items.map((person, i) => <li key={`${person.name}/${i}`}>
    {person.url ? <a href={person.url} target="_blank" rel="noopener noreferrer">{person.name} ↗</a> : person.name}
    {person.role && <small>{person.role}</small>}
  </li>)}</ul>;
}

export function OrganizerCell({ column, row }) {
  switch (column) {
    case 'date': return <>{organizerDate(row)}{organizerTimeNote(row) && <small>{organizerTimeNote(row)}</small>}</>;
    case 'tournament': return <><strong>{row.tournamentTitle}</strong><small>{row.season}</small><span>{row.roundTitle}</span></>;
    case 'match': return <><a href={row.team1 || row.team2 ? `/tournaments/${encodeURIComponent(row.tournamentSlug)}/matches/${encodeURIComponent(row.id)}` : `/tournaments/${encodeURIComponent(row.tournamentSlug)}?section=matches`} target="_blank" rel="noopener noreferrer"><strong>{row.team1 || 'Участник уточняется'}</strong><span className="orgs-vs">×</span><strong>{row.team2 || 'Участник уточняется'}</strong></a><small>{row.bestOf || 'Формат уточняется'} · {row.id}</small>{row.note && <small className="orgs-note">{row.note}</small>}</>;
    case 'status': return <><span className={`orgs-status orgs-status--${row.status}`}>{matchStates[row.status] || matchStates.unknown}</span>{row.score ? <strong className="orgs-score">{row.score.join(' : ')}{row.technical && <small>Технический результат</small>}</strong> : ['completed', 'walkover', 'bye'].includes(row.status) && <small>Счёт не подтверждён</small>}</>;
    case 'broadcast': return <>{row.broadcast.url ? <a href={row.broadcast.url} target="_blank" rel="noopener noreferrer" className="orgs-air">Открыть эфир ↗</a> : row.broadcast.planned ? <><strong className="orgs-air">Эфир запланирован</strong><small className="orgs-missing">Ссылка не назначена</small></> : <span className="orgs-missing">Не назначена</span>}{row.replayUrl && <a href={row.replayUrl} target="_blank" rel="noopener noreferrer">Запись ↗</a>}</>;
    case 'casters': return <Names items={row.casters} empty="Не назначены" />;
    case 'partners': return <><span className="orgs-cell-label">Матч</span><Names items={row.partners} empty="Не назначены" />{row.tournamentPartners.length > 0 && <div className="orgs-common"><span className="orgs-cell-label">Турнир</span><Names items={row.tournamentPartners} /></div>}</>;
    default: return null;
  }
}

export default function OrganizerPage() {
  const [token, setToken] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState({ tournament: '', round: '', broadcast: '', query: '' });
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [columnMessage, setColumnMessage] = useState('');
  const dragSource = useRef(null);
  const loginRequest = useRef(null);
  useEffect(() => () => loginRequest.current?.abort(), []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    let current;
    let running = false;
    const load = async () => {
      if (running || !active) return;
      running = true;
      current = new AbortController();
      setBusy(true);
      try {
        const result = await api('matches', { token, signal: current.signal });
        if (active) { setData(result); setError(''); }
      } catch (failure) {
        if (active && failure.name !== 'AbortError') {
          setError(failure.message);
          if (failure.status === 401) { setToken(null); setData(null); }
        }
      } finally { running = false; if (active) setBusy(false); }
    };
    load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener('focus', load);
    return () => { active = false; current?.abort(); window.clearInterval(timer); window.removeEventListener('focus', load); };
  }, [token, refresh]);

  async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    loginRequest.current?.abort();
    const controller = new AbortController();
    loginRequest.current = controller;
    setBusy(true); setError('');
    try {
      const result = await api('login', { signal: controller.signal,
        body: { login: fields.get('login'), password: fields.get('password') } });
      form.reset();
      setToken(result.token);
    } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function logout() {
    const previous = token;
    setToken(null); setData(null); setError(''); setBusy(false);
    // Clear the screen immediately; the token lives only in this mounted page.
    api('logout', { token: previous, body: {} }).catch(() => {});
  }
  const rounds = useMemo(() => [...new Map((data?.rows || [])
    .filter((row) => !filters.tournament || row.tournamentId === filters.tournament)
    .map((row) => [`${row.tournamentId}/${row.stageId}/${row.roundId}`, {
      id: `${row.tournamentId}/${row.stageId}/${row.roundId}`,
      label: `${row.roundTitle} · ${row.tournamentTitle}${filters.tournament ? '' : ` · ${row.season}`}`,
    }])).values()], [data, filters.tournament]);
  const rows = useMemo(() => filterOrganizerRows(data?.rows || [], filters), [data, filters]);
  const setFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value,
    ...(key === 'tournament' ? { round: '' } : {}) }));
  const orderedColumns = columnOrder.map((id) => organizerColumns.find((column) => column.id === id));
  const visibleColumns = orderedColumns.filter((column) => !hiddenColumns.includes(column.id));

  function moveColumn(source, target, placement) {
    setColumnOrder((previous) => moveOrganizerColumn(previous, source, target, placement));
    setColumnMessage(`Столбец «${organizerColumns.find((column) => column.id === source).label}» перемещён.`);
  }
  function endColumnDrag() {
    dragSource.current = null;
    setDraggedColumn(null); setDropTarget(null);
  }
  function dragOverColumn(event, id) {
    if (!dragSource.current || dragSource.current === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({ id, placement: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' });
  }

  return <main className="orgs-page">
    <header className="orgs-header">
      <a href="/" className="orgs-brand"><img src="/assets/ycs-logo.jpg" width="44" height="44" alt="ЯрКиберСезон" /><span>ЯРКИБЕРСЕЗОН<small>ДЛЯ ОРГАНИЗАТОРОВ</small></span></a>
      <div className="orgs-header-actions"><a href="/">На сайт ↗</a>{token && <button type="button" onClick={logout}>Выйти</button>}</div>
    </header>
    {!token ? <section className="orgs-login" aria-labelledby="orgs-login-title">
      <p className="orgs-eyebrow">Доступ организаторов</p><h1 id="orgs-login-title">Все матчи.<br />Один стол.</h1>
      <p>Трансляции, кастеры и партнёры — рядом с каждым матчем.</p>
      <form onSubmit={login}>
        <label>Логин<input name="login" autoComplete="username" maxLength={128} required /></label>
        <label>Пароль<input name="password" type="password" autoComplete="current-password" maxLength={512} required /></label>
        <button className="orgs-primary" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
      {error && <p className="orgs-error" role="alert">{error}</p>}
    </section> : <>
      <section className="orgs-title"><div><p className="orgs-eyebrow">Рабочая таблица</p><h1>Матчи и эфиры</h1><p>Только просмотр · время в МСК · обновление каждую минуту</p></div>
        <div className="orgs-sync"><button type="button" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>{busy ? 'Обновляем…' : 'Обновить'}</button>
          {data && <small>Получено {new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(new Date(data.generatedAt))} МСК</small>}
        </div>
      </section>
      <div className="orgs-filters" aria-label="Фильтры матчей">
        <label>Турнир<select value={filters.tournament} onChange={(e) => setFilter('tournament', e.target.value)}><option value="">Все турниры</option>{data?.tournaments.map((t) => <option value={t.id} key={t.id}>{t.title} · {t.season || t.id}</option>)}</select></label>
        <label>Тур / стадия<select value={filters.round} onChange={(e) => setFilter('round', e.target.value)}><option value="">Все туры</option>{rounds.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
        <label>Трансляция<select value={filters.broadcast} onChange={(e) => setFilter('broadcast', e.target.value)}><option value="">Все матчи</option><option value="planned">Эфир запланирован</option><option value="unassigned">Эфир не назначен</option></select></label>
        <label>Поиск<input type="search" placeholder="Команда, кастер, партнёр…" value={filters.query} onChange={(e) => setFilter('query', e.target.value)} /></label>
      </div>
      {error && <p className="orgs-error" role="alert">{error}{data && ' Показаны последние полученные данные.'}</p>}
      {data?.results.availability === 'unavailable' && <p className="orgs-notice" role="status">Обновление результатов задерживается. {data.results.revision ? 'Сохранены последние подтверждённые результаты.' : 'Показаны опубликованные данные турниров.'}</p>}
      <div className="orgs-table-caption"><span aria-live="polite">{rows.length} из {data?.rows.length || 0} матчей</span><div className="orgs-table-tools"><span>Назначения и общая поддержка указаны отдельно</span><button type="button" aria-expanded={columnsOpen} aria-controls="orgs-columns" onClick={() => setColumnsOpen((open) => !open)}>Столбцы · {visibleColumns.length}/{organizerColumns.length}</button></div></div>
      {columnsOpen && <section id="orgs-columns" className="orgs-columns" aria-label="Настройка столбцов">
        <div className="orgs-columns-heading"><p>Перетаскивайте заголовки таблицы или меняйте порядок кнопками. Оставьте хотя бы один столбец.</p><button type="button" onClick={() => { setColumnOrder(defaultColumnOrder); setHiddenColumns([]); endColumnDrag(); setColumnMessage('Восстановлены все столбцы и исходный порядок.'); }}>Сбросить</button></div>
        <ol className="orgs-columns-list">{orderedColumns.map((column, index) => <li key={column.id}>
          <label><input type="checkbox" checked={!hiddenColumns.includes(column.id)} disabled={visibleColumns.length === 1 && visibleColumns[0].id === column.id} onChange={() => setHiddenColumns((previous) => toggleOrganizerColumn(previous, column.id))} />{column.label}</label>
          <div><button type="button" disabled={index === 0} aria-label={`Передвинуть «${column.label}» влево`} onClick={() => moveColumn(column.id, columnOrder[index - 1], 'before')}>←</button><button type="button" disabled={index === columnOrder.length - 1} aria-label={`Передвинуть «${column.label}» вправо`} onClick={() => moveColumn(column.id, columnOrder[index + 1], 'after')}>→</button></div>
        </li>)}</ol>
      </section>}
      <p className="orgs-sr-only" role="status">{columnMessage}</p>
      <div className="orgs-table-scroll" tabIndex={0} role="region" aria-label="Таблица матчей, прокручивается по горизонтали">
        <table className="orgs-table" style={{ minWidth: visibleColumns.reduce((width, column) => width + column.width, 0) }}><caption className="orgs-sr-only">Матчи, трансляции, кастеры и партнёры ЯрКиберСезона. Порядок и видимость настраиваются кнопкой «Столбцы».</caption>
          <colgroup>{visibleColumns.map((column) => <col key={column.id} style={{ width: column.width }} />)}</colgroup>
          <thead><tr>{visibleColumns.map((column) => <th key={column.id} scope="col" draggable title="Перетащите столбец. Для управления с клавиатуры откройте «Столбцы»."
            className={`${draggedColumn === column.id ? 'orgs-column-dragging' : ''} ${dropTarget?.id === column.id ? `orgs-column-drop--${dropTarget.placement}` : ''}`}
            onDragStart={(event) => { dragSource.current = column.id; setDraggedColumn(column.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', column.id); }}
            onDragOver={(event) => dragOverColumn(event, column.id)}
            onDragLeave={() => setDropTarget((current) => current?.id === column.id ? null : current)}
            onDrop={(event) => { event.preventDefault(); if (dragSource.current && dragSource.current !== column.id) { const bounds = event.currentTarget.getBoundingClientRect(); moveColumn(dragSource.current, column.id, event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after'); } endColumnDrag(); }}
            onDragEnd={endColumnDrag}><span className="orgs-drag-grip" aria-hidden="true">⠿</span>{column.label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.key} className={row.broadcast.planned ? 'orgs-row-broadcast' : ''}>
            {visibleColumns.map((column) => <td key={column.id} className={column.className}><OrganizerCell column={column.id} row={row} /></td>)}
          </tr>)}{!rows.length && <tr><td colSpan={visibleColumns.length} className="orgs-empty" role="status">{busy && !data ? 'Загружаем матчи…' : data ? 'По выбранным фильтрам матчей нет.' : 'Данные матчей пока недоступны.'}</td></tr>}</tbody>
        </table>
      </div>
    </>}
  </main>;
}
