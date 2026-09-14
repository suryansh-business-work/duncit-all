import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerScenarioClips } from '../../../../scripts/lib/cypress-scenarios.mjs';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * Partners portal, live on staging (E2E Batch 1).
 *
 * Nothing is stubbed. The bundle under test is built with VITE_GRAPHQL_URL set
 * to staging, and the specs sign in with the account the mWeb suite created:
 * `01-signin` and `02-profile` run while it exists (its password has reached
 * CHANGED), and `03-after-delete` runs after mWeb deleted and purged it.
 * One-time codes come from the OTP testing API (`e2eOneTimeCode`), never from
 * the screen. The run's identity arrives as CYPRESS_E2E_* from the workflow
 * (Tech > E2E Tests > Settings).
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2005',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: false,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    // The CI job runs this project twice (before and after the mWeb delete);
    // keeping assets keeps the first run's videos and failures.
    trashAssetsBeforeRuns: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    // A real server answers in its own time.
    defaultCommandTimeout: 15000,
    // Never: a retried scenario would repeat a real sign-in or a real code
    // request, and a flaky pass is worse than a red one here.
    retries: 0,
    env: {
      GRAPHQL_URL: process.env.CYPRESS_GRAPHQL_URL || 'https://staging.server.duncit.com/graphql',
    },
    setupNodeEvents(on) {
      registerScenarioClips(on);
    },
  },
});
