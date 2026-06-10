import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2015',
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
