import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { resolveTestEnv } from './test.config';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = resolveTestEnv();

export default defineConfig({
  // `test.config.ts` is the single source of truth for URLs. Override the
  // active environment via `CYPRESS_ENV=production pnpm test:e2e`. Paths
  // below are resolved relative to this file so the config still works when
  // Cypress is invoked from anywhere via `--config-file`.
  e2e: {
    baseUrl: env.appUrl,
    env: {
      graphqlUrl: env.graphqlUrl,
      useMocks: env.useMocks,
    },
    specPattern: path.join(here, 'specs/**/*.cy.{ts,tsx}'),
    supportFile: path.join(here, 'support/e2e.ts'),
    fixturesFolder: path.join(here, 'fixtures'),
    screenshotsFolder: path.join(here, '../../cypress-artifacts/screenshots'),
    videosFolder: path.join(here, '../../cypress-artifacts/videos'),
    downloadsFolder: path.join(here, '../../cypress-artifacts/downloads'),
    screenshotOnRunFailure: true,
    video: false,
    viewportWidth: 1280,
    viewportHeight: 800,
  },
});
