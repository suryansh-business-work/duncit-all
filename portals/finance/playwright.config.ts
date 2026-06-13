import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E for the Finance portal. Drives the real Vite dev build in a
 * desktop Chromium with the GraphQL backend stubbed via request interception
 * (see e2e/support/gql.ts) so the suite is deterministic and never touches a
 * real DB. The dev server is instrumented with istanbul (`VITE_COVERAGE=true`)
 * and each test's `window.__coverage__` is written to `.nyc_output` by the
 * coverage fixture, so `nyc` can enforce a 100% gate after the run.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  globalSetup: './e2e/support/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:2108',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'finance-chromium', use: { ...devices['Desktop Chrome'] } }],
  // Dedicated coverage port (2108) so this always boots a fresh istanbul-
  // instrumented dev server and never reuses a plain `npm run dev` on 2008.
  webServer: {
    command: 'npm run dev -- --port 2108 --strictPort',
    url: 'http://localhost:2108',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_COVERAGE: 'true' },
  },
});
