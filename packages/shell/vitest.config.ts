import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    // Vitest's 5s default is sized for a unit test. This suite mounts the whole
    // portal chrome and the staff-chat surfaces — MessageThread's unseen-pill
    // test alone rerenders a full MockedProvider tree ten times to grow the
    // counter past nine, ~1.7s on a dev machine and past five on a two-core CI
    // runner ("Test timed out in 5000ms" on CI, green locally every time; the
    // pod-form suites hit the identical wall and carry the same setting).
    testTimeout: 30_000,
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
      thresholds: {
        statements: 100,
        functions: 100,
        lines: 100,
        branches: 100,
      },
    },
  },
});
