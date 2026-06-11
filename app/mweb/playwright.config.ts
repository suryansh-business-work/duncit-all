import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E for the mWeb app. Drives the real Vite build in a mobile-sized
 * Chromium, with the GraphQL backend stubbed via request interception (see
 * e2e/support/gql.ts) so the suite is deterministic and never touches a real DB.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:2003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'mweb-chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:2003',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
