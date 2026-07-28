import { defineConfig } from 'cypress';

/**
 * Cypress E2E for the Duncit mobile App, driven through its Expo **web** build
 * in a mobile-sized viewport. The GraphQL backend is stubbed via `cy.intercept`
 * (support/commands.ts) so the suite is deterministic and offline.
 *
 * Note: native (iOS/Android) flows stay on Detox (../../e2e). This covers the
 * same screens via the web target, which is what `native.duncit.com` ships.
 *
 * Paths are project-root relative (this app is CJS, so no `import.meta.url`);
 * Cypress resolves them against `app/mobile-app`.
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2022',
    specPattern: '__tests__/e2e/specs/**/*.cy.ts',
    supportFile: '__tests__/e2e/support/e2e.ts',
    fixturesFolder: false,
    screenshotsFolder: 'cypress-artifacts/screenshots',
    videosFolder: 'cypress-artifacts/videos',
    downloadsFolder: 'cypress-artifacts/downloads',
    screenshotOnRunFailure: true,
    video: false,
    // Pixel 7 — the mobile viewport this suite has always run in.
    viewportWidth: 412,
    viewportHeight: 915,
    // Assertion + navigation budgets carried over from the Playwright config
    // (expect 12s, test 45s); Metro's first bundle is the slow part.
    defaultCommandTimeout: 12_000,
    pageLoadTimeout: 240_000,
    retries: { runMode: 1, openMode: 0 },
  },
});
