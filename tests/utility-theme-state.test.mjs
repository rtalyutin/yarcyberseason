import test from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { create, act } from 'react-test-renderer';
import { createServer } from 'vite';

// Switching presentation must not discard an in-progress form or replace the
// existing shared preference with a route-specific default.
test('utility themes preserve child state, shared preferences and storage failure fallback', async () => {
  const vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, preTransformRequests: false }, appType: 'custom' });
  const previousWindow = global.window;
  const previousAct = global.IS_REACT_ACT_ENVIRONMENT;
  const listeners = new Map();
  let stored = 'dota2';
  const writes = [];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.window = {
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    localStorage: { getItem: () => stored, setItem: (key, value) => { writes.push([key, value]); stored = value; } },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
  };
  let root;
  try {
    const { ThemedUtilityShell, UtilityThemeSwitcher } = await vite.ssrLoadModule('/src/components/ThemedUtilityShell.jsx');
    function Draft() {
      const [value, setValue] = useState('');
      return React.createElement('form', null,
        React.createElement(UtilityThemeSwitcher),
        React.createElement('input', { value, onChange: (e) => setValue(e.target.value) }));
    }
    await act(async () => { root = create(React.createElement(ThemedUtilityShell, null, React.createElement(Draft))); });
    const shell = () => root.root.findByProps({ className: 'site-shell atlas-utility-shell' });
    assert.equal(shell().props['data-theme'], 'dota2');
    assert.equal(shell().props['data-ycs-theme'], 'dota2');
    assert.deepEqual(writes, [], 'mounting a service route must not overwrite the saved theme');
    await act(async () => root.root.findByType('input').props.onChange({ target: { value: 'unsent local draft' } }));
    await act(async () => root.root.findAllByType('button').find((button) => button.children.includes('Корпоративная')).props.onClick());
    assert.equal(shell().props['data-theme'], 'corporate');
    assert.equal(root.root.findByType('input').props.value, 'unsent local draft');
    assert.deepEqual(writes, [['ycs-theme', 'corporate']]);
    stored = 'cs2';
    await act(async () => listeners.get('storage')({ key: 'ycs-theme' }));
    assert.equal(shell().props['data-theme'], 'cs2');
    assert.equal(root.root.findByType('input').props.value, 'unsent local draft');
    global.window.localStorage.setItem = () => { throw new Error('storage disabled'); };
    await act(async () => root.root.findAllByType('button').find((button) => button.children.includes('Dota 2')).props.onClick());
    assert.equal(shell().props['data-theme'], 'dota2');
    assert.equal(root.root.findByType('input').props.value, 'unsent local draft');
    await act(async () => root.unmount()); root = null;
    assert.equal(listeners.size, 0);
  } finally {
    if (root) await act(async () => root.unmount());
    global.window = previousWindow;
    global.IS_REACT_ACT_ENVIRONMENT = previousAct;
    await vite.close();
  }
});
