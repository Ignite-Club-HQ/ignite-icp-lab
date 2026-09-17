import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(
  readFileSync(new URL('../exported-test-mapping.json', import.meta.url), 'utf8'),
);

test('maps every authoritative source exactly once', () => {
  assert.equal(manifest.entries.length, 597);
  assert.equal(new Set(manifest.entries.map((entry) => entry.source)).size, 597);
  assert.equal(manifest.entries.filter((entry) => entry.scope === 'non-browser').length, 586);
  assert.equal(manifest.entries.filter((entry) => entry.scope === 'browser-native').length, 11);
});

test('uses exact dispositions and documents the sole irreducible boundary', () => {
  const counts = Object.groupBy(manifest.entries, (entry) => entry.disposition);
  assert.equal(counts['direct-retained'].length, 412);
  assert.equal(counts['local-equivalent'].length, 184);
  assert.equal(counts['irreducible-boundary'].length, 1);
  assert.equal(
    counts['irreducible-boundary'][0].source,
    'tests/ios-os/resume.e2e.mjs',
  );
  assert.match(counts['irreducible-boundary'][0].reason, /iOS device\/simulator/);
});
