import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWebMcpDataVersion, WEBMCP_DATA_FILES } from '../scripts/data-version.mjs';

test('WebMCP data version is stable and changes when only a public roster changes', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ycs-data-version-'));
  try {
    for (const file of WEBMCP_DATA_FILES) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(new URL(`../${file}`, import.meta.url)));
    }
    const first = createWebMcpDataVersion(root);
    const rosterPath = path.join(root, 'src/data/team-rosters.json');
    writeFileSync(rosterPath, `${readFileSync(rosterPath, 'utf8')}\n`);
    const changed = createWebMcpDataVersion(root);
    assert.notEqual(changed, first);
    assert.equal(createWebMcpDataVersion(root), changed);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
