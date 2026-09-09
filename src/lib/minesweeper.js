export const SIZE = 8;
export const MINES = 10;
export const RECORD_KEY = 'ycs.techies-minesweeper.record.v1.8x8.10.first-cell-safe';
export const terminal = (game) => game.status === 'won' || game.status === 'lost';

export function neighbours(index) {
  const x = index % SIZE, y = Math.floor(index / SIZE), result = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && x + dx >= 0 && x + dx < SIZE && y + dy >= 0 && y + dy < SIZE) result.push((y + dy) * SIZE + x + dx);
  }
  return result;
}

export function newGame() {
  return { status: 'ready', cells: Array.from({ length: SIZE * SIZE }, () => ({ mine: false, count: 0, open: false, flagged: false })), flags: 0, opened: 0, startedAt: null, endedAt: null, hit: null };
}

export function toggleWard(game, index) {
  if (!Number.isInteger(index) || !game.cells[index] || terminal(game) || game.cells[index].open) return game;
  const cell = game.cells[index];
  if (!cell.flagged && game.flags >= MINES) return game;
  return { ...game, flags: game.flags + (cell.flagged ? -1 : 1), cells: game.cells.map((c, i) => i === index ? { ...c, flagged: !c.flagged } : c) };
}

export function openCell(game, index, now = Date.now(), random = Math.random) {
  if (!Number.isInteger(index) || !game.cells[index] || terminal(game) || game.cells[index].open || game.cells[index].flagged) return game;
  const next = { ...game, cells: game.cells.map(c => ({ ...c })) };
  if (next.status === 'ready') {
    const candidates = next.cells.map((_, i) => i).filter(i => i !== index);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const i of candidates.slice(0, MINES)) next.cells[i].mine = true;
    next.cells.forEach((cell, i) => { cell.count = neighbours(i).filter(n => next.cells[n].mine).length; });
    next.status = 'playing'; next.startedAt = now;
  }
  if (next.cells[index].mine) {
    next.cells[index].open = true;
    return { ...next, status: 'lost', hit: index, endedAt: now };
  }
  const queue = [index];
  while (queue.length) {
    const i = queue.pop(), cell = next.cells[i];
    if (cell.open || cell.flagged || cell.mine) continue;
    cell.open = true; next.opened++;
    if (!cell.count) queue.push(...neighbours(i));
  }
  if (next.opened === SIZE * SIZE - MINES) { next.status = 'won'; next.endedAt = now; }
  return next;
}

export function seconds(game, now = Date.now()) {
  return game.startedAt === null ? 0 : Math.max(0, Math.floor(((game.endedAt ?? now) - game.startedAt) / 1000));
}
export const formatTime = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export function loadRecord(storage) {
  try {
    const raw = storage.getItem(RECORD_KEY);
    if (raw === null) return { best: null, persistent: true };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return { best: null, persistent: true }; }
    return { best: parsed?.version === 1 && Number.isSafeInteger(parsed.bestSeconds) && parsed.bestSeconds >= 0 ? parsed.bestSeconds : null, persistent: true };
  } catch { return { best: null, persistent: false }; }
}

export function saveRecord(storage, value, previous) {
  const disk = loadRecord(storage);
  const best = Math.min(value, previous ?? Infinity, disk.best ?? Infinity);
  try { storage.setItem(RECORD_KEY, JSON.stringify({ version: 1, bestSeconds: best })); return { best, persistent: true }; }
  catch { return { best, persistent: false }; }
}
