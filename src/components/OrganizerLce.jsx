import { useEffect, useState, useRef } from 'react';
import { lceFixtures } from '../lib/lce-tournament.js';
import './organizer-lce.css';
const time = m => m.scheduledAt ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(m.scheduledAt)) + ' МСК' : 'Время уточняется';
function MatchRow({ match, revision, save }) {
  const [maps, setMaps] = useState(() => Array.from({ length: Number(match.bestOf.slice(2)) }, (_, i) => ({ score1: match.maps?.[i]?.score1 ?? '', score2: match.maps?.[i]?.score2 ?? '', technical: match.maps?.[i]?.technical || false })));
  const [outcome, setOutcome] = useState(match.outcome || 'played');
  const [winnerSide, setWinnerSide] = useState(match.winnerTeamId === match.team2Id ? 2 : 1);
  const [slot, setSlot] = useState(match.scheduledAt?.slice(0, 16) || '2026-11-14T22:30');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const pending = useRef(null);
  async function submit(action = 'result') {
    setBusy(true); setError(''); setNotice('');
    try {
      let payload;
      if (action === 'slot') payload = { action, matchId: match.id, scheduledAt: `${slot}:00+03:00` };
      else {
        const filled = maps.map(m => ({ ...m, score1: m.score1 === '' ? null : Number(m.score1), score2: m.score2 === '' ? null : Number(m.score2) }));
        while (filled.length && filled.at(-1).score1 === null && filled.at(-1).score2 === null) filled.pop();
        payload = { action, matchId: match.id, result: { outcome, maps: outcome === 'played' ? filled : [], ...(outcome === 'series_forfeit' ? { winnerSide } : {}) } };
      }
      const signature = JSON.stringify(payload);
      if (!pending.current || pending.current.signature !== signature) pending.current = { signature, body: { ...payload, expectedRevision: revision, requestId: crypto.randomUUID().replaceAll('-', '') } };
      await save(pending.current.body); pending.current = null; setNotice('Сохранено');
    } catch (e) { if (e.status && e.status < 500) pending.current = null; setError(e.message); }
    finally { setBusy(false); }
  }
  const enabled = Boolean(match.team1Id && match.team2Id);
  return <tr><td>{time(match)}<small>{match.stage || (match.id.includes('sf') ? 'Полуфинал' : 'Финал')} · {match.bestOf}</small>{match.channelNumber && <small>Канал {match.channelNumber}</small>}</td><td><strong>{match.team1}</strong><br />{match.team2}{match.resultConfirmed && <p>{match.note || `${match.score1}:${match.score2}`}</p>}</td><td>
    <fieldset disabled={!enabled || busy} aria-label={`Результат ${match.team1} — ${match.team2}`}>
      <label>Исход<select value={outcome} onChange={e => setOutcome(e.target.value)}><option value="played">Результат по картам</option>{match.bestOf === 'BO1' ? <option value="double_no_show">Обоюдная неявка</option> : <option value="series_forfeit">Техническое поражение в серии</option>}</select></label>
      {outcome === 'played' && maps.map((m, i) => <div className="lce-map" key={i}><span>Карта {i + 1}</span>{[1, 2].map(side => <input key={side} aria-label={`Карта ${i + 1}, ${match[`team${side}`]}`} aria-invalid={Boolean(error)} type="number" min="0" max="1000" value={m[`score${side}`]} onChange={e => setMaps(old => old.map((v, j) => j === i ? { ...v, [`score${side}`]: e.target.value } : v))} />)}<label><input type="checkbox" checked={m.technical} onChange={e => setMaps(old => old.map((v, j) => j === i ? { ...v, technical: e.target.checked } : v))} />Тех. 13:0</label></div>)}
      {outcome === 'series_forfeit' && <label>Победитель<select value={winnerSide} onChange={e => setWinnerSide(Number(e.target.value))}><option value="1">{match.team1}</option><option value="2">{match.team2}</option></select></label>}
      <button type="button" onClick={() => submit()}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
    </fieldset>
    {match.id.startsWith('lce-tb-') && <div><label>Слот, МСК<input type="datetime-local" value={slot} onChange={e => setSlot(e.target.value)} /></label><button disabled={busy} onClick={() => submit('slot')}>Назначить время</button></div>}
    {error && <p role="alert" className="orgs-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  </td></tr>;
}
function Draw({ ids, participants, save, revision }) {
  const [order, setOrder] = useState(ids.join(',')), [error, setError] = useState('');
  return <div><p>Жребий по решению судьи. Укажите ID в порядке мест:</p><p>{participants.filter(p => ids.includes(p.teamId)).map(p => `${p.displayName}: ${p.teamId}`).join('; ')}</p><input aria-label="Порядок жребия" value={order} onChange={e => setOrder(e.target.value)} /><button onClick={async () => { try { await save({ action: 'draw', teamIds: order.split(',').map(s => s.trim()), expectedRevision: revision, requestId: crypto.randomUUID().replaceAll('-', '') }); } catch (e) { setError(e.message); } }}>Сохранить жребий</button>{error && <p role="alert">{error}</p>}</div>;
}
export default function OrganizerLce({ token, api, onSessionExpired }) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => { let active = true; api('lce-results', { token }).then(d => { if (active) setData(d); }).catch(e => { if (active) { setError(e.message); if (e.status === 401) onSessionExpired(); } }); return () => { active = false; }; }, [token]);
  const save = async body => {
    try { const result = await api('lce-results', { token, body }); setData(result); setError(''); }
    catch (e) { if (e.status === 401) onSessionExpired(); if (e.status === 409) { try { setData(await api('lce-results', { token })); } catch {} } throw e; }
  };
  return <section className="lce-editor"><h1>Матчи CS2 · Лига цифровой экономики</h1><p>Счёт вводится в порядке команд. Сохранение публикует подтверждённый судьёй результат.</p><button onClick={() => api('lce-results', { token }).then(setData).catch(e => setError(e.message))}>Обновить</button>{error && <p role="alert">{error}</p>}{data && <><div className="lce-scroll"><table><thead><tr><th>Время / этап</th><th>Команды</th><th>Счёт по раундам</th></tr></thead><tbody>{lceFixtures(data.tournament).map(match => <MatchRow key={`${match.id}/${match.team1Id}/${match.team2Id}`} match={match} revision={data.revision} save={save} />)}</tbody></table></div>{data.unresolved.filter(key => key.includes('|')).map(key => <Draw key={key} ids={key.split('|')} participants={data.tournament.participants} revision={data.revision} save={save} />)}</>}</section>;
}
