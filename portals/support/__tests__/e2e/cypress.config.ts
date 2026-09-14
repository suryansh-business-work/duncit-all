import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerScenarioClips } from '../../../../scripts/lib/cypress-scenarios.mjs';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * The staff half of the live run (E2E Batch 2): Support, Legal and Pods, live
 * on staging, in ONE Cypress project.
 *
 * Nothing is stubbed. Each portal's bundle is built with VITE_GRAPHQL_URL set
 * to staging and served by its own preview — Support on the base URL, Legal
 * and Pods on their own origins, which a spec visits one test at a time (test
 * isolation stays on, so every test may start on a different origin). The run
 * account the mWeb suite created is given the three portal roles by the first
 * spec, and every record it follows is the one mWeb filed carrying the run's
 * marker. The run's identity arrives as CYPRESS_E2E_* from the workflow
 * (Tech > E2E Tests > Settings).
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2010',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: false,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    // A real server answers in its own time.
    defaultCommandTimeout: 15000,
    // Never: a retried scenario would repeat a real sign-in or a real status
    // change, and a flaky pass is worse than a red one here.
    retries: 0,
    env: {
      GRAPHQL_URL: process.env.CYPRESS_GRAPHQL_URL || 'https://staging.server.duncit.com/graphql',
      LEGAL_URL: process.env.CYPRESS_LEGAL_URL || 'http://localhost:2012',
      PODS_URL: process.env.CYPRESS_PODS_URL || 'http://localhost:2034',
    },
    setupNodeEvents(on) {
      registerScenarioClips(on);
    },
  },
});
