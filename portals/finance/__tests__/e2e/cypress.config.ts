import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerCoverageTasks } from './coverage-tasks';

const here = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.resolve(here, '../..');

export default defineConfig({
  // Paths are resolved relative to this file so the config still works when
  // Cypress is invoked from anywhere via `--config-file`. `vite.config.ts`
  // pins both `dev` and `preview` to 2008; point `CYPRESS_BASE_URL` at
  // https://finance.duncit.com to smoke-test the deployed console instead.
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2008',
    // Istanbul E2E coverage -> `.nyc_output` (see coverage-tasks.ts). Only
    // produces data when the app is served with `VITE_COVERAGE=true`.
    setupNodeEvents(on) {
      registerCoverageTasks(on, portalRoot);
    },
    specPattern: path.join(here, 'specs/**/*.cy.{ts,tsx}'),
    supportFile: path.join(here, 'support/e2e.ts'),
    fixturesFolder: false,
    screenshotsFolder: path.join(here, '../../cypress-artifacts/screenshots'),
    videosFolder: path.join(here, '../../cypress-artifacts/videos'),
    downloadsFolder: path.join(here, '../../cypress-artifacts/downloads'),
    screenshotOnRunFailure: true,
    video: false,
    viewportWidth: 1280,
    viewportHeight: 800,
  },
});
