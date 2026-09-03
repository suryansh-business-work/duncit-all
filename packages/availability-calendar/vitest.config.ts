import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // Most suites here mount the whole recurring dialog — MUI Dialog, four
    // accordions, MUI X pickers — under MockedProvider. On the serialised Shared
    // packages runner the package takes ~60s end to end and single renders have
    // crossed vitest's 5s default twice (00ceba723, cd96a9953) while passing
    // locally and on the commits either side. The budget is for that runner, not
    // for the code: nothing in these suites waits on a real clock.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
