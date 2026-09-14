import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerScenarioClips } from '../../../../scripts/lib/cypress-scenarios.mjs';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * The native app's account lifecycle, live on staging (E2E Batches 1 and 2),
 * driven through its Expo web export (`npm run export:web`, served as a
 * single-page app on :2022).
 *
 * Nothing on the server is stubbed. The export is built with
 * EXPO_PUBLIC_API_URL set to staging, and the specs under `specs/` run IN FILE
 * ORDER as one account's life: signup creates the run account, the next specs
 * sign in, recover the password, edit the profile, change the password, use
 * Help & Support and Pod Ideas, and 08 deletes and purges it; 09 then signs the
 * same number up again through Google and purges that account too. One-time
 * codes come from the OTP testing API (`e2eOneTimeCode`), never from the
 * screen; the only browser APIs stood in for are the ones no automated browser
 * can answer (Google's popup, the location prompt). The run's identity arrives
 * as CYPRESS_E2E_* from the workflow (Tech > E2E Tests > Settings).
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
