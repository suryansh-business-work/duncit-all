import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerScenarioClips } from '../../../../scripts/lib/cypress-scenarios.mjs';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * mWeb account lifecycle, support and pod ideas, live on staging (E2E Batches 1 + 2).
 *
 * Nothing on the server is stubbed. The bundle under test is built with
 * VITE_GRAPHQL_URL set to staging, and the specs under `specs/` run IN FILE
 * ORDER as one account's life: 01 signup creates the run account, 02–05 sign
 * in, recover the password, edit the profile and change the password, 06 and
 * 07 file support requests and a pod idea for the staff-portal specs to follow,
 * 08 deletes the account, and 09 joins and signs in again with Google as a
 * second account on the same number. One-time codes come from the OTP testing
 * API (`e2eOneTimeCode`), never from the screen; Google's popup is the one
 * thing stood in for (support/google-stand-in.ts). The run's identity arrives
 * as CYPRESS_E2E_* from the workflow (Tech > E2E Tests > Settings).
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2003',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: `${here}/fixtures`,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    // The CI job runs this project three times (01–07, then 08 after the
    // Partners and staff-portal specs, then 09); keeping assets keeps every
    // run's videos and failures.
    trashAssetsBeforeRuns: false,
    viewportWidth: 412,
    viewportHeight: 915,
    // A real server answers in its own time.
    defaultCommandTimeout: 15000,
    // Never: a retried scenario would repeat a real signup or a real code
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
