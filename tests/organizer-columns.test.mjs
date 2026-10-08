import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultColumnOrder, moveOrganizerColumn, organizerColumns, toggleOrganizerColumn } from '../src/lib/organizer-columns.js';

test('drag placements and arrow placements retain stable column identities', () => {
  const before = moveOrganizerColumn(defaultColumnOrder, 'partners', 'match');
  assert.deepEqual(before, ['date', 'tournament', 'partners', 'match', 'status', 'broadcast', 'casters']);
  const after = moveOrganizerColumn(before, 'date', 'casters', 'after');
  assert.deepEqual(after, ['tournament', 'partners', 'match', 'status', 'broadcast', 'casters', 'date']);
  const restored = moveOrganizerColumn(after, 'date', 'tournament', 'before');
  assert.deepEqual(restored, before);
  assert.deepEqual(defaultColumnOrder, ['date', 'tournament', 'match', 'status', 'broadcast', 'casters', 'partners']);
  assert.strictEqual(moveOrganizerColumn(before, 'unknown', 'match'), before);
  assert.strictEqual(moveOrganizerColumn(before, 'match', 'unknown'), before);
  assert.strictEqual(moveOrganizerColumn(before, 'match', 'match'), before);
});

test('all move combinations preserve every column exactly once without mutating input', () => {
  for (const source of defaultColumnOrder) for (const target of defaultColumnOrder) {
    for (const placement of ['before', 'after']) {
      const original = [...defaultColumnOrder];
      const next = moveOrganizerColumn(original, source, target, placement);
      assert.deepEqual(original, defaultColumnOrder);
      assert.equal(next.length, organizerColumns.length);
      assert.deepEqual([...next].sort(), [...defaultColumnOrder].sort());
      if (source !== target) assert.equal(next.indexOf(source) - next.indexOf(target), placement === 'before' ? -1 : 1);
    }
  }
});

test('hiding keeps the final visible column and showing a hidden column restores its position', () => {
  let hidden = [];
  for (const id of defaultColumnOrder) hidden = toggleOrganizerColumn(hidden, id);
  assert.equal(hidden.length, 6);
  assert.deepEqual(defaultColumnOrder.filter((id) => !hidden.includes(id)), ['partners']);
  assert.strictEqual(toggleOrganizerColumn(hidden, 'partners'), hidden);
  assert.strictEqual(toggleOrganizerColumn(hidden, 'unknown'), hidden);
  const order = moveOrganizerColumn(defaultColumnOrder, 'casters', 'date');
  hidden = toggleOrganizerColumn(hidden, 'casters');
  assert.deepEqual(order.filter((id) => !hidden.includes(id)), ['casters', 'partners']);
  assert.equal(hidden.length, 5);
});
