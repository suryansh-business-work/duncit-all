import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';

const here = path.dirname(fileURLToPath(import.meta.url));

// `baseUrl` is the only difference between running against the local Vite
// preview (default) and a deployed environment. Override via
// `CYPRESS_BASE_URL=https://crm.duncit.com pnpm test:e2e` to smoke-test
// production. Cypress also honours the standard `CYPRESS_baseUrl` env var
// automatically; we keep the explicit fallback for clarity.
const baseUrl = process.env.CYPRESS_BASE_URL ?? 'http://localhost:2007';

export default defineConfig({
  // All paths in this config are resolved relative to the file's location
  // (`crm/__tests__/e2e/`). Cypress itself usually treats them as relative
  // to the project root — passing them via `path.resolve` removes that
  // ambiguity when this config is run via `--config-file`.
  e2e: {
    baseUrl,
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
