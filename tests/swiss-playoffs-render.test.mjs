import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import tournament from '../src/data/tournaments/dota2-autumn-2026.json' with { type: 'json' };

const bundle = await build({ entryPoints: ['src/components/SwissPlayoffs.jsx'], bundle: true, write: false,
  platform: 'node', format: 'cjs', external: ['react', 'react-dom/server'], mainFields: ['module', 'main'], jsx: 'automatic', loader: { '.css': 'empty' } });
const output = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
const render = (source) => renderToStaticMarkup(React.createElement(output.exports.SwissPlayoffs, {
  tournament: source, stage: source.stages.find((stage) => stage.id === 'playoffs'),
}));

test('SSR exposes eight seed rows and fourteen matches with truthful forecast/qualification labels', () => {
  const html = render(tournament);
  assert.match(html, /Текущий прогноз посева/);
  assert.match(html, /Бухгольц/);
  assert.match(html, /Жребий/);
  assert.equal((html.match(/class="sp-seed-row /g) || []).length, 8);
  assert.equal((html.match(/class="sp-status">В плей-офф/g) || []).length, 2);
  assert.equal((html.match(/data-bracket-match=/g) || []).length, 14);
  assert.equal((html.match(/scope="row"/g) || []).length, 8);
  assert.match(html, /Проигравший В6/);
  assert.match(html, /Проигравший В5/);
  assert.match(html, /[Пп]оражение → 3-е место/);
  assert.doesNotMatch(html, /class="sp-match-score"|community-match-link/, 'No scores or real match links for predictions');
  assert.equal((html.match(/role="region"/g) || []).length, 2);
});

test('missing draw keeps the full graph but never invents team assignments', () => {
  const source = structuredClone(tournament);
  delete source.stages[0].rounds[0].matches[0].seed1;
  const html = render(source);
  assert.match(html, /полный исходный жребий/);
  assert.equal((html.match(/data-bracket-match=/g) || []).length, 14);
  assert.doesNotMatch(html, /sp-slot-projected|scope="row"/);
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) assert.match(html, new RegExp(`Посев ${seed}`));
});
