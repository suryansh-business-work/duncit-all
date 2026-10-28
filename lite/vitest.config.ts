import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Duncit Lite's unit suites: the API in Node (against an in-memory MongoDB
 * where a service needs one), and the web app and console in jsdom.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
          // The MongoDB binary is fetched once, up front, so the files' own servers never race to download it.
          globalSetup: ['./server/__tests__/helpers/mongo-binary.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        // 15 s: coverage instrumentation slows the long typed form flows (the event form) past the 5 s default.
        test: { name: 'ui', environment: 'jsdom', include: ['web/**/*.test.{ts,tsx}', 'portal/**/*.test.{ts,tsx}'], setupFiles: ['./vitest.setup.ts'], testTimeout: 15_000 },
      },
    ],
    coverage: {
      provider: 'v8',
      // Vitest writes NO report when a test fails unless told to; SonarQube would read the silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['server/**/*.ts', 'shared/**/*.{ts,tsx}', 'web/**/*.{ts,tsx}', 'portal/**/*.{ts,tsx}'],
      // Entry points that only wire things together (and are exercised by the build and the deploy smoke test).
      exclude: ['**/*.test.*', '**/__tests__/**', 'server/index.ts', 'web/main.tsx', 'portal/main.tsx', 'web/entry-server.tsx', '**/*.d.ts'],
    },
  },
});
