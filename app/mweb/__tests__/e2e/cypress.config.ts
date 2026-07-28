import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * Cypress E2E for the mWeb app. Drives the real Vite build in a mobile-sized
 * viewport (Pixel-class 412x915), with the GraphQL backend stubbed through
 * `cy.intercept` (see support/commands.ts) so the suite is deterministic and
 * never touches a real DB.
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2003',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: false,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    video: false,
    viewportWidth: 412,
    viewportHeight: 915,
    defaultCommandTimeout: 8000,
  },
});
