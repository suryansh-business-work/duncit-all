import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerScenarioClips } from '../../../../scripts/lib/cypress-scenarios.mjs';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * The native app's account lifecycle, live on staging (E2E Batch 1), driven
 * through its Expo web export (`npm run export:web`, served as a single-page
 * app on :2022).
 *
 * Nothing is stubbed. The export is built with EXPO_PUBLIC_API_URL set to
 * staging, and the specs under `specs/` run IN FILE ORDER as one account's
 * life: signup creates the run account, the next specs sign in, recover the
 * password, edit the profile and change the password, and the last one deletes
 * and purges it. One-time codes come from the OTP testing API
 * (`e2eOneTimeCode`), never from the screen. The run's identity arrives as
 * CYPRESS_E2E_* from the workflow (Tech > E2E Tests > Settings).
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2022',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: `${here}/fixtures`,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    // Pixel 7 — the mobile viewport the native web suite has always run in.
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
