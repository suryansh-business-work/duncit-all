/// <reference types="cypress" />

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

/** Istanbul coverage map, as produced in the browser by vite-plugin-istanbul. */
export type CoverageMap = Record<string, unknown>;

/**
 * Node half of the E2E coverage pipeline (previously the Playwright
 * `e2e/support/coverage.ts` fixture). `support/coverage.ts` reads the
 * instrumented `window.__coverage__` after every test and hands it to the
 * `saveCoverage` task registered here, which writes one JSON per test into
 * `<portal>/.nyc_output`. `nyc` then merges that with the istanbul vitest run
 * (`scripts/merge-coverage.mjs`) before the 100% gate, and the merged lcov is
 * what SonarQube reads.
 *
 * `before:run` replaces Playwright's `globalSetup`: it wipes stale coverage
 * ONCE per `cypress run`. A mocha `before()` hook cannot do this — it fires per
 * spec FILE and would throw away the previous spec's data. `cypress open` never
 * emits `before:run`, so an interactive session accumulates instead of resetting.
 *
 * Coverage only exists when the app under test is served with
 * `VITE_COVERAGE=true` (see `pnpm dev:coverage`); otherwise `__coverage__` is
 * absent and every task call is a no-op.
 */
export function registerCoverageTasks(on: Cypress.PluginEvents, portalRoot: string): void {
  const nycDir = path.join(portalRoot, '.nyc_output');

  on('before:run', async () => {
    await Promise.all(
      [nycDir, path.join(portalRoot, 'coverage')].map((dir) =>
        rm(dir, { recursive: true, force: true }),
      ),
    );
  });

  on('task', {
    async saveCoverage(coverage: CoverageMap | null) {
      if (!coverage || Object.keys(coverage).length === 0) return null;
      await mkdir(nycDir, { recursive: true });
      await writeFile(path.join(nycDir, `${randomUUID()}.json`), JSON.stringify(coverage));
      return null;
    },
  });
}
