import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.ts'],
    // Sixty-odd jsdom files on a 32-core Windows box spawn a fork per core and
    // the pool dies (ERR_IPC_CHANNEL_CLOSED) before a single test runs. Four
    // is plenty for a suite this quick, and a no-op on the small CI runners.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // Pure re-export barrel, no logic — matches sonar.coverage.exclusions.
      exclude: ['src/index.ts'],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
