import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E for the Duncit mobile App, driven through its Expo **web** build
 * in a mobile-sized Chromium. The GraphQL backend is stubbed via request
 * interception (support/gql.ts) so the suite is deterministic and offline.
 *
 * Note: native (iOS/Android) flows stay on Detox (../e2e). This covers the same
 * screens via the web target, which is what `native.duncit.com` ships.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pw.ts',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:2022',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'app-web-chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:2022',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { CI: '1', BROWSER: 'none' },
  },
});
