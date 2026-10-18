import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, CaretLeft, CaretRight, CheckCircle, Circle, CornersOut, CornersIn, Info, X } from '@phosphor-icons/react';
import { community } from '../data/community.js';
import { formatBuchholz, getPlayoffView } from '../lib/swiss-seeding.js';
import { getSwissRecordState } from '../lib/swiss-presentation.js';
import { getPlayoffRoute } from '../lib/playoff-route.js';
import { displayMatchDate } from '../lib/tournament.js';
import { matchTimeLabel } from './TournamentMatchCard.jsx';
import { TeamLink, MatchLink } from './CommunityLinks.jsx';
import { TeamLogo } from './TeamLogo.jsx';
import '../swiss-playoffs.css';

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return reduced;
}

function BracketLines({ canvas, rounds, route, selectionKey, reduced }) {
  const [paths, setPaths] = useState([]);
  const svg = useRef(null);
  useEffect(() => {
    const root = canvas.current;
    if (!root) return;
    let pending = 0, alive = true;
    const measure = () => {
      if (!alive) return;
      const bounds = root.getBoundingClientRect();
      const cards = new Map([...root.querySelectorAll('[data-bracket-match]')].map((node) => [node.dataset.bracketMatch, node]));
      const next = [];
      for (const round of rounds) for (const match of round.matches) for (const field of ['winnerTo', 'loserTo']) {
        const target = match[field], from = cards.get(match.id), to = cards.get(target?.matchId);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const x1 = a.right - bounds.left, y1 = a.top + a.height / 2 - bounds.top;
        const x2 = b.left - bounds.left, y2 = b.top + b.height * (target.slot === 1 ? .25 : .75) - bounds.top;
        const loser = field === 'loserTo';
        const lane = x1 + 8 + Number(match.id.replace(/\D/g, '')) * 2;
        const middle = x1 + Math.max(10, (x2 - x1) / 2);
        const d = loser ? `M${x1},${y1} H${lane} V${b.top - bounds.top - 12} H${x2 - 10} V${y2} H${x2}` : `M${x1},${y1} H${middle} V${y2} H${x2}`;
        next.push({ key: `${match.id}-${field}`, d, loser });
      }
      setPaths(next);
    };
    const schedule = () => { if (!alive) return; cancelAnimationFrame(pending); pending = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    for (const card of root.querySelectorAll('[data-bracket-match]')) observer.observe(card);
    document.fonts?.ready.then(schedule); measure();
    return () => { alive = false; observer.disconnect(); cancelAnimationFrame(pending); };
  }, [canvas, rounds]);
  useEffect(() => {
    if (reduced || !selectionKey) return;
    const animations = [];
    for (const node of svg.current?.querySelectorAll('[data-active="true"]') || []) {
      if (!node.animate) continue;
      const length = node.getTotalLength();
      animations.push(node.animate([{ strokeDasharray: `${length}`, strokeDashoffset: length, opacity: .3 }, { strokeDasharray: `${length}`, strokeDashoffset: 0, opacity: 1 }], { duration: 440, easing: 'cubic-bezier(.2,.7,.2,1)' }));
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [selectionKey, reduced, paths.length]);
  return <svg ref={svg} className="sp-lines" aria-hidden="true" focusable="false">{paths.map((path) => <path key={path.key} d={path.d} data-active={route.edges.has(path.key)} className={`${path.loser ? 'sp-line-loss' : 'sp-line-win'}${route.edges.has(path.key) ? ' is-active' : ''}`} />)}</svg>;
}

export function SwissPlayoffs({ stage, tournament }) {
  const view = useMemo(() => getPlayoffView(tournament, stage), [tournament, stage]);
  const allMatches = useMemo(() => view.rounds.flatMap((round) => round.matches), [view]);
  const byId = useMemo(() => new Map(allMatches.map((match) => [match.id, match])), [allMatches]);
  const [mode, setMode] = useState('all'), [roundIndex, setRoundIndex] = useState(0);
  const [selection, setSelection] = useState(null), [pendingFocus, setPendingFocus] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false), [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState('');
  const section = useRef(null), canvas = useRef(null), panel = useRef(null), tableArea = useRef(null), rules = useRef(null);
  const previous = useRef(null), focusRules = useRef(false);
  const reduced = useReducedMotion();
  const prefix = `${tournament.id}-${stage.id}`;
  const activeMatch = byId.get(selection?.matchId);
  const selectedRow = view.entrants.find((row) => row.teamId === selection?.teamId);
  const route = useMemo(() => getPlayoffRoute(allMatches, selection?.matchId, selection?.teamId), [allMatches, selection]);
  const currentRound = view.rounds[Math.min(roundIndex, view.rounds.length - 1)];
  const visibleRounds = mode === 'all' ? view.rounds : currentRound ? [currentRound] : [];
  const seedMatch = (seed) => allMatches.find((match) => [match.seed1, match.seed2].includes(seed));
  const jump = (id, teamId = null) => {
    if (!byId.has(id)) return;
    setRoundIndex(view.rounds.findIndex((round) => round.matches.some((match) => match.id === id)));
    setSelection({ matchId: id, teamId }); setPendingFocus(id);
  };
  useEffect(() => {
    if (!pendingFocus) return;
    const node = document.getElementById(`${prefix}-${pendingFocus}`);
    node?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'nearest', inline: 'center' });
    node?.focus({ preventScroll: true }); setPendingFocus(null);
  }, [pendingFocus, prefix, mode, roundIndex, reduced]);
  useEffect(() => {
    if (rulesOpen && focusRules.current) {
      rules.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
      rules.current?.focus({ preventScroll: true }); focusRules.current = false;
    }
  }, [rulesOpen, reduced]);
  useEffect(() => {
    if (reduced || !panel.current?.animate) return;
    const animation = panel.current.animate([{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: 'ease-out' });
    return () => animation.cancel();
  }, [mode, roundIndex, reduced]);
  useEffect(() => {
    const rows = new Map(view.entrants.map((row) => [row.teamId, row]));
    const elements = new Map([...(tableArea.current?.querySelectorAll('[data-seed-team]') || [])].map((node) => [node.dataset.seedTeam, node]));
    const tableBounds = tableArea.current?.getBoundingClientRect();
    const bounds = new Map([...elements].map(([id, node]) => [id, { top: node.getBoundingClientRect().top - tableBounds.top, left: node.getBoundingClientRect().left - tableBounds.left }]));
    const animations = [], changed = [];
    if (previous.current) for (const [id, row] of rows) {
      const old = previous.current.rows.get(id), node = elements.get(id);
      if (!old) continue;
      if (old.buchholz !== row.buchholz) {
        changed.push(row.team);
        const cell = node?.querySelector('.sp-buchholz');
        if (!reduced && cell?.animate) animations.push(cell.animate([{ opacity: .35, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'ease-out' }));
      }
      const oldBounds = previous.current.bounds.get(id), currentBounds = bounds.get(id);
      if (!reduced && previous.current.width === tableBounds?.width && old.seed !== row.seed && oldBounds && currentBounds && node?.animate) animations.push(node.animate([{ transform: `translate(${oldBounds.left - currentBounds.left}px, ${oldBounds.top - currentBounds.top}px)` }, { transform: 'translate(0, 0)' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }));
    }
    if (changed.length) setMessage(`Обновлён Бухгольц: ${changed.join(', ')}.`);
    previous.current = { rows, bounds, width: tableBounds?.width };
    return () => animations.forEach((animation) => animation.cancel());
  }, [view, reduced]);
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === section.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === section.current) await document.exitFullscreen();
      else if (section.current?.requestFullscreen) await section.current.requestFullscreen();
      else setMessage('Полноэкранный режим недоступен в этом браузере. Сетку можно прокручивать.');
    } catch { setMessage('Не удалось открыть полный экран. Сетку можно прокручивать.'); }
  };
  const showRules = () => { focusRules.current = true; if (rulesOpen) { rules.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' }); rules.current?.focus({ preventScroll: true }); focusRules.current = false; } else setRulesOpen(true); };
  const renderMatch = (match, round) => {
    const settled = match.resultConfirmed === true && ['completed', 'walkover'].includes(match.status);
    const time = matchTimeLabel(match);
    return <article className={`sp-match${route.nodes.has(match.id) ? ' is-on-route' : ''}${activeMatch?.id === match.id ? ' is-selected' : ''}`} id={`${prefix}-${match.id}`} data-bracket-match={match.id} tabIndex={-1} key={match.id} aria-label={`Матч ${match.sourceLabel}`}>
      <header><button type="button" className="sp-match-code" onClick={() => setSelection({ matchId: match.id })} aria-label={`Матч ${match.sourceLabel}: показать переходы`} aria-pressed={activeMatch?.id === match.id}>{match.sourceLabel}</button><span>{match.bestOf}</span></header>
      <ol>{match.slots.map((slot, index) => <li key={index} className={`${slot.projected && slot.team ? 'sp-slot-projected' : ''}${slot.teamId === selection?.teamId ? ' is-team-selected' : ''}`}>
        {slot.team ? <button type="button" className="sp-team-pick" onClick={() => setSelection({ matchId: match.id, teamId: slot.teamId })} aria-pressed={slot.teamId === selection?.teamId && activeMatch?.id === match.id} aria-label={`${slot.team}: показать путь${slot.projected ? slot.qualified ? ', вышли; посев предварительный' : ', прогноз' : ''}`}>
          {slot.seed && <span className="sp-slot-seed">{slot.seed}</span>}<TeamLogo team={community.getTeam(slot.teamId)} logo={tournament.teamLogos?.[slot.team]} /><span className="sp-slot-name">{slot.team}</span>
          {slot.projected && (slot.qualified ? <CheckCircle className="sp-slot-status" weight="fill" aria-hidden="true" /> : <Circle className="sp-slot-status" aria-hidden="true" />)}
        </button> : slot.matchId ? <button type="button" className="sp-source" onClick={() => jump(slot.matchId)}>{slot.label}</button> : <span className="sp-source">{slot.label}</span>}
        {settled ? <b className="sp-match-score">{match[`score${index + 1}`] ?? '—'}</b> : <span className="sp-unplayed" aria-label="Матч не сыгран">—</span>}
      </li>)}</ol>
      <p className="sp-match-schedule"><span>{displayMatchDate(match)}</span><span>{time ? `${time} МСК` : 'Время уточняется'}</span></p>
      {round.bracket === 'final' && <p className="sp-final-note">BO5 · с 0:0 · без сброса сетки</p>}
    </article>;
  };
  return <section className={`swiss-playoffs${fullscreen ? ' is-fullscreen' : ''}`} ref={section} id={stage.id} aria-labelledby={`${prefix}-title`}>
    <header className="sp-intro"><div><h1 id={`${prefix}-title`}>Плей-офф</h1><p>{view.count} команд · Double Elimination <span className="sp-provisional">{view.complete ? 'Swiss завершён' : 'Предварительный посев'}</span></p></div><div className="sp-qualified"><p><strong>{view.qualifiedCount} <span>из {view.count}</span></strong> вышли в плей-офф</p><div aria-hidden="true" className="sp-pips">{Array.from({ length: view.count }, (_, index) => <Circle key={index} weight={index < view.qualifiedCount ? 'fill' : 'regular'} />)}</div></div></header>
    <div className="sp-toolbar"><div className="sp-view-switch" role="group" aria-label="Отображение сетки"><button type="button" aria-pressed={mode === 'all'} onClick={() => setMode('all')}>Вся сетка</button><button type="button" aria-pressed={mode === 'rounds'} onClick={() => setMode('rounds')}>По раундам</button></div><button type="button" className="sp-help-toggle" aria-expanded={rulesOpen} aria-controls={`${prefix}-rules`} onClick={() => setRulesOpen(!rulesOpen)}><Info aria-hidden="true" />Как устроена сетка</button><button type="button" className="sp-icon-button" onClick={() => { tableArea.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); tableArea.current?.focus({ preventScroll: true }); }} aria-label="Перейти к таблице посева"><ArrowDown aria-hidden="true" /></button><button type="button" className="sp-icon-button sp-expand" onClick={toggleFullscreen} aria-label={fullscreen ? 'Выйти из полного экрана' : 'Развернуть сетку на весь экран'}>{fullscreen ? <CornersIn aria-hidden="true" /> : <CornersOut aria-hidden="true" />}</button></div>
    <div ref={rules} className="sp-rules" id={`${prefix}-rules`} hidden={!rulesOpen} tabIndex={-1}>
      <p><strong>14 матчей.</strong> 13 серий BO3 и гранд-финал BO5 с 0:0, без переигровки. Первое поражение переводит команду в нижнюю сетку, второе — завершает участие. В финале нижней сетки: поражение → 3-е место. Исключение: проигравший единственной серии гранд-финала занимает 2-е место даже с одним поражением.</p>
      <p>Четвертьфиналы: 1–8, 4–5, 2–7, 3–6. Перекрёстный переход: проигравший В6 попадает в Н3, проигравший В5 — в Н4. Это откладывает повторные встречи внутри плей-офф; встречи из Swiss могут повториться.</p>
      <p>Порядок: победы ↓, поражения ↑, Бухгольц ↓, номер первоначального жребия ↑. Бухгольц — сумма текущих разниц побед и поражений всех соперников по Swiss. Личная встреча не участвует в сравнении. Жребий выбранной команды доступен под сеткой.</p>
    </div>
    {mode === 'rounds' && <nav className="sp-round-nav" aria-label="Раунды плей-офф"><button type="button" className="sp-icon-button" aria-label="Предыдущий раунд" disabled={roundIndex === 0} onClick={() => setRoundIndex(roundIndex - 1)}><CaretLeft /></button><label className="sp-round-select"><span className="sp-sr-only">Выбрать раунд</span><select value={Math.min(roundIndex, view.rounds.length - 1)} onChange={(event) => setRoundIndex(Number(event.target.value))}>{view.rounds.map((round, index) => <option key={round.id} value={index}>{round.label}</option>)}</select></label><button type="button" className="sp-icon-button" aria-label="Следующий раунд" disabled={roundIndex >= view.rounds.length - 1} onClick={() => setRoundIndex(roundIndex + 1)}><CaretRight /></button></nav>}
    <div ref={panel} className={`sp-bracket-scroll sp-mode-${mode}`} role="region" aria-label={mode === 'all' ? 'Сетка Double Elimination, горизонтальная прокрутка' : 'Матчи выбранного раунда'} tabIndex={0}><div className="sp-canvas" ref={canvas}>
      {mode === 'all' && <BracketLines canvas={canvas} rounds={view.rounds} route={route} selectionKey={selection ? `${selection.matchId}:${selection.teamId || ''}` : ''} reduced={reduced} />}
      {['upper', 'lower', 'final'].map((track) => {
        const rounds = visibleRounds.filter((round) => round.bracket === track);
        if (!rounds.length) return null;
        return <section key={track} className={`sp-track sp-track--${track}`} aria-label={track === 'upper' ? 'Верхняя сетка' : track === 'lower' ? 'Нижняя сетка' : 'Гранд-финал'}>
          {track !== 'final' && <h2 className="sp-track-title">{track === 'upper' ? 'Верхняя сетка' : 'Нижняя сетка'}<span>{track === 'upper' ? 'Победа приближает к финалу' : 'Второе поражение — вылет'}</span></h2>}
          {track === 'final' && <img className="sp-aegis" src="/assets/playoffs/aegis.webp" alt="" />}
          {rounds.map((round) => <div className="sp-round" key={round.id}><h3>{round.label.replace(/^(Верхняя|Нижняя) · /i, '')}<span>{round.matches[0]?.bestOf}</span></h3><div className="sp-round-matches">{round.matches.map((match) => renderMatch(match, round))}</div></div>)}
        </section>;
      })}
    </div></div>
    <div className="sp-board-footer"><span><CheckCircle weight="fill" aria-hidden="true" />Вышли <Circle aria-hidden="true" />Прогноз</span>{mode === 'all' && <span className="sp-mobile-hint">Листайте сетку или выберите «По раундам»</span>}<span>{selection ? 'Подсвечены возможные переходы' : 'Выберите команду, чтобы увидеть её путь'}</span></div>
    {activeMatch && <div className="sp-inspector" aria-label={`Переходы матча ${activeMatch.sourceLabel}`}><div><strong>{selectedRow?.team || activeMatch.sourceLabel}</strong><span>{selectedRow ? `${activeMatch.sourceLabel} · посев ${selectedRow.seed} · жребий ${selectedRow.initialSeed}` : activeMatch.bestOf}</span>{selectedRow && <TeamLink tournamentId={tournament.id} name={selectedRow.team} />}</div><div className="sp-inspector-routes">{['winnerTo', 'loserTo'].map((field) => activeMatch[field] && <button type="button" className={field === 'winnerTo' ? 'sp-route' : 'sp-route sp-route-loss'} key={field} onClick={() => jump(activeMatch[field].matchId)}>{field === 'winnerTo' ? 'Победа' : 'Поражение'}<ArrowRight aria-hidden="true" />{byId.get(activeMatch[field].matchId)?.sourceLabel}</button>)}{view.rounds.find((round) => round.matches.some((match) => match.id === activeMatch.id))?.bracket === 'lower' && <span>{activeMatch.id === 'lower-6' ? 'Поражение → 3-е место' : 'Поражение → вылет'}</span>}{activeMatch.id === 'final-1' && <span>Победитель — чемпион · проигравший — 2-е место</span>}{activeMatch.slots.every((slot) => slot.published) && <MatchLink tournamentId={tournament.id} matchId={activeMatch.id} />}</div><button type="button" className="sp-icon-button" aria-label="Сбросить выделение пути" onClick={() => setSelection(null)}><X aria-hidden="true" /></button></div>}
    <div className="sp-table-area" ref={tableArea} tabIndex={-1}><div className="sp-table-heading"><h2>Текущий посев <span>· {view.complete ? 'Swiss завершён' : 'предварительно'}</span></h2><span>Бухгольц обновляется вместе с результатами</span></div><p className="sp-seeding-note">{view.complete ? 'Посев рассчитан по итогам Swiss. Пары матчей публикуются организатором.' : 'Состав и номера посева могут измениться до завершения Swiss.'}</p><div className="sp-table-scroll" role="region" aria-label="Текущий посев плей-офф" tabIndex={0}>
      {[view.entrants.slice(0, 4), view.entrants.slice(4)].map((rows, group) => <table className="sp-seeding" key={group}><caption className="sp-sr-only">{group === 0 ? view.complete ? 'Посев по итогам Swiss' : 'Текущий прогноз посева' : 'Места с пятого по восьмое'}</caption><thead><tr><th scope="col">Место</th><th scope="col">Команда</th><th scope="col">В : П</th><th scope="col"><abbr title="Коэффициент Бухгольца">БХ</abbr></th><th scope="col">Статус</th></tr></thead><tbody>{rows.map((row) => {
        const match = seedMatch(row.seed);
        return <tr key={row.teamId} data-seed-team={row.teamId} className={`sp-seed-row sp-seed-row--${getSwissRecordState(row.won, row.lost).kind}${selection?.teamId === row.teamId ? ' is-selected' : ''}`}><td className="sp-seed-number"><button type="button" onClick={() => jump(match?.id, row.teamId)} aria-label={`Посев ${row.seed}: показать путь ${row.team}`}>{row.seed}</button></td><th scope="row"><div className="sp-team"><TeamLogo team={community.getTeam(row.teamId)} logo={tournament.teamLogos?.[row.team]} /><TeamLink tournamentId={tournament.id} name={row.team} /></div></th><td className="sp-numeric">{row.won} : {row.lost}</td><td className="sp-buchholz">{formatBuchholz(row.buchholz)}</td><td className="sp-status">{row.qualified ? 'В плей-офф' : 'Прогноз'}</td></tr>;
      })}</tbody></table>)}
    </div>{!view.entrants.length && <p className="sp-empty">Для расчёта посева нужны участники и полный исходный жребий Swiss.</p>}<p className="sp-table-hint">Нажмите место команды, чтобы выделить её путь в сетке. <button type="button" onClick={showRules}>Правила посева<ArrowUpRight aria-hidden="true" /></button></p></div>
    <p className="sp-sr-only" role="status" aria-live="polite">{message}</p>
  </section>;
}
