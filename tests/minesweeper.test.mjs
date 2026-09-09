import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, openCell, toggleWard, neighbours, seconds, formatTime, loadRecord, saveRecord, RECORD_KEY } from '../src/lib/minesweeper.js';

function fixture(mines) {
  const game = newGame(); game.status = 'playing'; game.startedAt = 1000;
  for (let i = 0; i < 64; i++) {
    game.cells[i].mine = mines.includes(i);
    // Deliberately independent coordinate calculation, not neighbours().
    game.cells[i].count = mines.filter(m => m !== i && Math.abs(m % 8 - i % 8) <= 1 && Math.abs(Math.floor(m / 8) - Math.floor(i / 8)) <= 1).length;
  }
  return game;
}
test('every first cell is safe, exact mine count, state immutable', () => {
  for (let i = 0; i < 64; i++) for (let seed = 1; seed <= 20; seed++) {
    let s = seed; const random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const before = newGame(), result = openCell(before, i, 1000, random);
    assert.equal(result.cells[i].mine, false); assert.equal(result.cells[i].open, true);
    assert.equal(result.cells.filter(c => c.mine).length, 10);
    assert.equal(before.startedAt, null); assert.equal(before.opened, 0);
  }
});
test('corner and edge neighbours never wrap', () => {
  assert.deepEqual(neighbours(0), [1,8,9]); assert.deepEqual(neighbours(7), [6,14,15]);
  assert.equal(neighbours(27).length, 8);
});
test('fixed field counts, flood stops at wards, removal does not open', () => {
  let g = fixture([0,1,2,3,4,5,6,7,8,9]);
  assert.equal(g.cells[10].count,4); assert.equal(g.cells[15].count,2);
  g = toggleWard(g, 63); const result = openCell(g, 62, 11000);
  assert.equal(result.cells[63].open, false); assert.equal(result.opened,53);
  assert.equal(result.status,'playing');
  const unflagged = toggleWard(result,63); assert.equal(unflagged.cells[63].open,false);
  const won = openCell(unflagged,63,12000); assert.equal(won.status,'won'); assert.equal(won.opened,54);
  assert.equal(seconds(won),11);
});
test('wards before start, limit, flags cannot win, first-open blockers', () => {
  let g = newGame(); for(let i=0;i<10;i++)g=toggleWard(g,i);
  assert.equal(g.flags,10); assert.equal(g.status,'ready'); assert.equal(g.startedAt,null);
  assert.equal(toggleWard(g,10),g); assert.equal(openCell(g,0),g);
  g=toggleWard(g,0); assert.equal(g.flags,9);
  g=openCell(g,0,5000,()=>0); assert.equal(g.cells[0].mine,false);
});
test('mine ends game, terminal operations and repeated open are no-ops', () => {
  const g=fixture([0,1,2,3,4,5,6,7,8,9]);
  const lost=openCell(g,0,21000); assert.equal(lost.status,'lost'); assert.equal(lost.hit,0);
  assert.equal(seconds(lost,1000000),20); assert.equal(openCell(lost,20),lost); assert.equal(toggleWard(lost,20),lost);
  const safe=openCell(g,10,2000); assert.equal(openCell(safe,10),safe);
  assert.equal(openCell(g,-1),g); assert.equal(toggleWard(g,64),g);
});
test('timer includes elapsed wall time, zero timestamp and rounding', () => {
  const g=openCell(newGame(),0,0,()=>0);
  assert.equal(seconds(g,10999),10); assert.equal(formatTime(84),'01:24'); assert.equal(formatTime(6000),'100:00');
});
test('record improves only, handles invalid and unavailable storage', () => {
  const data=new Map(), storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(loadRecord(storage).best,null);
  assert.equal(saveRecord(storage,84,null).best,84);
  assert.equal(saveRecord(storage,80,84).best,80);
  assert.equal(saveRecord(storage,90,80).best,80);
  data.set(RECORD_KEY,'broken'); assert.equal(loadRecord(storage).best,null);
  data.set(RECORD_KEY,'{"version":1,"bestSeconds":-1}'); assert.equal(loadRecord(storage).best,null);
  assert.deepEqual(loadRecord(null),{best:null,persistent:false});
  assert.deepEqual(saveRecord(null,70,80),{best:70,persistent:false});
});
