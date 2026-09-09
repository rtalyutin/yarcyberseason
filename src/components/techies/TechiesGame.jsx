import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { SIZE, MINES, newGame, openCell, toggleWard, terminal, seconds, formatTime, loadRecord, saveRecord } from '../../lib/minesweeper.js';
import './game.css';

const asset = name => `/assets/techies/${name}.webp`;
const browserStorage = () => { try { return window.localStorage; } catch { return null; } };

export default function TechiesGame({ onClose }) {
  const [game, setGame] = useState(newGame), [mode, setMode] = useState('open');
  const [clock, setClock] = useState(Date.now), [record, setRecord] = useState(() => loadRecord(browserStorage()));
  const [isBest, setIsBest] = useState(false), [message, setMessage] = useState(''), [focusIndex, setFocusIndex] = useState(0);
  const dialog = useRef(null), cells = useRef([]), pointer = useRef(null), completed = useRef(null), closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = oldOverflow; };
  }, []);
  useEffect(() => {
    if (game.status !== 'playing') return;
    const tick = () => setClock(Date.now());
    tick(); const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [game.status]);
  useEffect(() => {
    if (game.status !== 'won' || completed.current === game) return;
    completed.current = game;
    const value = seconds(game), stored = loadRecord(browserStorage());
    const previous = Math.min(record.best ?? Infinity, stored.best ?? Infinity);
    setIsBest(value < previous);
    setRecord(saveRecord(browserStorage(), value, record.best));
  }, [game]);

  const act = (index, action = mode) => {
    if (terminal(game)) return;
    if (action === 'ward' && !game.cells[index].open && !game.cells[index].flagged && game.flags === MINES) setMessage('Сначала сними один вард');
    else setMessage('');
    setGame(previous => action === 'ward' ? toggleWard(previous, index) : openCell(previous, index));
  };
  const restart = () => { setGame(newGame()); setMode('open'); setIsBest(false); setMessage(''); setFocusIndex(0); completed.current = null; };
  const key = (event, index) => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (directions[event.key]) {
      event.preventDefault();
      const [dx, dy] = directions[event.key];
      const x = Math.min(SIZE - 1, Math.max(0, index % SIZE + dx));
      const y = Math.min(SIZE - 1, Math.max(0, Math.floor(index / SIZE) + dy));
      const next = y * SIZE + x;
      setFocusIndex(next); cells.current[next]?.focus();
    } else if (event.code === 'KeyF') { event.preventDefault(); act(index, 'ward'); }
  };
  const ended = terminal(game);
  const time = formatTime(seconds(game, clock));
  return createPortal(<dialog className="techies-dialog" ref={dialog} aria-labelledby="techies-title" aria-describedby="techies-help" onCancel={e => { e.preventDefault(); closeCallback.current(); }} onClick={e => { if (e.target === dialog.current) closeCallback.current(); }}>
    <div className="techies-game">
      <button className="techies-close" type="button" onClick={onClose} aria-label="Закрыть сапёр" autoFocus><X size={22} weight="bold" /></button>
      <header className="techies-heading">
        <img className="techies-mascot" src={asset(game.status === 'won' ? 'won' : game.status === 'lost' ? 'lost' : 'ready')} alt="" width="170" height="240" />
        <div><p className="techies-eyebrow">ТЫ НАШЁЛ ПАСХАЛКУ</p><h2 id="techies-title"><img src={asset('title')} alt="Минное поле Течиса" width="360" height="212" /></h2><p className="techies-subtitle">8 × 8 клеток. 10 поводов подумать.</p></div>
      </header>
      <div className="techies-stats">
        <div><img src={asset('ward-icon')} alt="" /><span>Варды<strong>{MINES - game.flags}</strong></span></div>
        <div><img src={asset('timer-icon')} alt="" /><span>Время<strong data-testid="techies-time">{time}</strong></span></div>
        <div><img src={asset('trophy-icon')} alt="" /><span>Рекорд<strong>{record.best === null ? '—' : formatTime(record.best)}</strong></span></div>
      </div>
      <div className="techies-switch" style={{ backgroundImage: `url(${asset(mode === 'open' ? 'switch-open' : 'switch-ward')})` }} role="group" aria-label="Действие по нажатию">
        <button type="button" aria-label="Открыть клетку" aria-pressed={mode === 'open'} disabled={ended} onClick={() => { setMode('open'); setMessage(''); }} />
        <button type="button" aria-label="Поставить вард" aria-pressed={mode === 'ward'} disabled={ended} onClick={() => { setMode('ward'); setMessage(''); }} />
      </div>
      <div className="techies-board-frame">
        <div className="techies-board" role="group" aria-label="Поле сапёра: 8 строк, 8 столбцов" data-testid="techies-board">
          {game.cells.map((cell, i) => {
            let face = 'closed', description = 'закрыто';
            if (game.status === 'lost' && cell.mine) { face = game.hit === i ? 'exploded' : 'mine'; description = 'мина'; }
            else if (game.status === 'lost' && cell.flagged && !cell.mine) { face = 'wrong'; description = 'ошибочный вард'; }
            else if (cell.flagged) { face = 'ward'; description = 'вард'; }
            else if (cell.open) { face = cell.count ? `n${cell.count}` : 'empty'; description = cell.count ? `соседних мин: ${cell.count}` : 'пусто'; }
            return <button type="button" key={i} className={`techies-cell${face === 'closed' && !ended ? ' techies-cell--closed' : ''}`} data-testid={`techies-cell-${i}`} data-open={cell.open} ref={el => { cells.current[i] = el; }} tabIndex={focusIndex === i ? 0 : -1} aria-label={`Строка ${Math.floor(i / SIZE) + 1}, столбец ${i % SIZE + 1}: ${description}`} aria-disabled={ended || (mode === 'open' && cell.flagged)} onFocus={() => setFocusIndex(i)} onKeyDown={e => key(e, i)}
              onPointerDown={e => { pointer.current = { x: e.clientX, y: e.clientY, cancelled: false }; }}
              onPointerMove={e => { if (pointer.current && Math.hypot(e.clientX - pointer.current.x, e.clientY - pointer.current.y) > 8) pointer.current.cancelled = true; }}
              onPointerCancel={() => { if (pointer.current) pointer.current.cancelled = true; }}
              onClick={e => { if (e.detail === 0 || !pointer.current?.cancelled) act(i); pointer.current = null; }}
              onContextMenu={e => { e.preventDefault(); act(i, 'ward'); }}>
              <img src={asset(face)} alt="" draggable="false" width="96" height="96" />
            </button>;
          })}
        </div>
      </div>
      <div className="techies-result" role="status" aria-live="polite" aria-atomic="true">
        {game.status === 'won' ? <><strong>Поле чистое!</strong><span>Твоё время: {time}{isBest ? ' · Новый личный рекорд!' : ''}</span></> : game.status === 'lost' ? <><strong>Теперь тут точно нет невидимых.</strong><span>Течис доволен. Попробуешь ещё раз?</span></> : <span>{message || (game.status === 'ready' ? 'Первое открытие безопасно.' : `Открыто ${game.opened} из 54 безопасных клеток.`)}</span>}
      </div>
      <button type="button" className="techies-restart" aria-label="Ещё раз — новая партия" onClick={restart}><img src={asset('restart')} alt="Ещё раз" width="280" height="110" /></button>
      {!record.persistent && <p className="techies-storage-note">Рекорд — до закрытия страницы</p>}
      <p className="techies-help" id="techies-help">Цифры показывают мины вокруг клетки. Подозреваешь мину — поставь вард.<span>На компьютере: правая кнопка — вард. Стрелки — движение, F — вард, Esc — выход.</span></p>
    </div>
  </dialog>, document.body);
}
