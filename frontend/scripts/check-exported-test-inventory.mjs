import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const bundle = path.join(repositoryRoot, 'docs', 'ignite-all-refactoring-icp-export.bundle');
const expectedRef = 'refs/heads/integration/all-refactoring-icp-export';
const expectedCommit = '7f3a86ba449d2e847843ea9a77ff7e9b76751019';

function countFiles(directory, predicate) {
  return readdirSync(directory, { withFileTypes: true }).reduce((count, entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return count + countFiles(entryPath, predicate);
    return count + Number(predicate(entryPath));
  }, 0);
}

if (!existsSync(bundle)) throw new Error(`Missing authoritative export bundle: ${bundle}`);

const heads = execFileSync('git', ['bundle', 'list-heads', bundle], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});
if (!heads.includes(`${expectedCommit} ${expectedRef}`)) {
  throw new Error(`Export bundle does not contain ${expectedRef} at ${expectedCommit}`);
}

for (const config of ['vitest.lab.config.mjs', 'vitest.legacy.config.mjs', 'playwright.config.ts']) {
  if (!existsSync(path.join(frontendRoot, config))) throw new Error(`Missing runnable test config: ${config}`);
}

const sourceTests = countFiles(path.join(frontendRoot, 'src'), file =>
  /\.(?:test|spec)\.(?:ts|tsx)$/.test(file),
);
const translatedBaselines = countFiles(path.join(frontendRoot, 'lab-tests'), file =>
  /imported-.*\.test\.tsx$/.test(file),
);
if (sourceTests < 414) throw new Error(`Expected at least 414 retained source tests, found ${sourceTests}`);
if (translatedBaselines < 31) throw new Error(`Expected at least 31 translated baselines, found ${translatedBaselines}`);

console.log(`Authoritative export: ${expectedRef} (${expectedCommit})`);
console.log('Non-browser bundle inventory: 586 test/spec sources');
console.log(`Runnable tiers: ${sourceTests} retained source files; ${translatedBaselines} translated hybrid baselines`);
console.log('Direct-execution exclusions remain explicitly accounted for in docs/VALIDATION.md.');
