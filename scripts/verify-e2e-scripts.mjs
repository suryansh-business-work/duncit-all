#!/usr/bin/env node
/**
 * Rule: EVERY workspace declares an `e2e` script.
 *
 * This exists because the e2e gate runs `pnpm e2e`, not
 * `pnpm run --if-present e2e`. `--if-present` is how an e2e gate rots: a
 * workspace loses its script, the step exits 0, and the check stays green while
 * nothing runs. Making a missing script a hard error only works if a missing
 * script is impossible to miss — that is this script's job.
 *
 * A workspace that drives a browser must run Cypress. A workspace that has no
 * browser surface must use scripts/e2e-no-surface.mjs, which carries its own
 * allowlist so a portal cannot quietly opt out.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Directories in pnpm-workspace.yaml that contain a browser app. */
const BROWSER_GLOBS = ['portals', 'app'];
const NO_OP_RUNNER = 'scripts/e2e-no-surface.mjs';
const CYPRESS_RUNNER = 'cypress run';

function workspaceDirs() {
  const dirs = [];
  for (const group of ['portals', 'packages', 'website']) {
    const abs = path.join(ROOT, group);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      if (fs.existsSync(path.join(abs, entry, 'package.json'))) {
        dirs.push(`${group}/${entry}`);
      }
    }
  }
  for (const solo of ['app/mweb', 'server', 'docs-site']) {
    if (fs.existsSync(path.join(ROOT, solo, 'package.json'))) dirs.push(solo);
  }
  return dirs.sort((a, b) => a.localeCompare(b));
}

const problems = [];
const rows = [];

for (const dir of workspaceDirs()) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'package.json'), 'utf8'));
  const script = pkg.scripts?.e2e;

  if (!script) {
    problems.push(`${dir} has no "e2e" script.`);
    rows.push([dir, '*** MISSING ***']);
    continue;
  }

  const isBrowserWorkspace = BROWSER_GLOBS.includes(dir.split('/')[0]);

  if (isBrowserWorkspace && !script.includes(CYPRESS_RUNNER)) {
    problems.push(
      `${dir} is a browser app but its "e2e" script does not run Cypress: ${script}`,
    );
  }

  if (isBrowserWorkspace) {
    const config = path.join(ROOT, dir, '__tests__/e2e/cypress.config.ts');
    if (!fs.existsSync(config)) {
      problems.push(`${dir} has an "e2e" script but no __tests__/e2e/cypress.config.ts.`);
    }
    const specDir = path.join(ROOT, dir, '__tests__/e2e/specs');
    const specs = fs.existsSync(specDir)
      ? fs.readdirSync(specDir).filter((f) => f.endsWith('.cy.ts') || f.endsWith('.cy.tsx'))
      : [];
    if (specs.length === 0) {
      problems.push(`${dir} has an "e2e" script but no specs under __tests__/e2e/specs.`);
    }
    rows.push([dir, `cypress (${specs.length} spec${specs.length === 1 ? '' : 's'})`]);
    continue;
  }

  rows.push([dir, script.includes(NO_OP_RUNNER) ? 'no browser surface (allowlisted)' : script]);
}

const width = Math.max(...rows.map(([d]) => d.length));
for (const [dir, note] of rows) {
  console.log(`  ${dir.padEnd(width)}  ${note}`);
}
console.log(`\n${rows.length} workspaces audited.`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('Every workspace declares an e2e script.');
