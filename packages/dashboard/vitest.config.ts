import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // Tests are paused repo-wide (CLAUDE.md preamble); the suite lands with the
    // first spec rather than red-flagging every CI run until then.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
        // GridStack drives real pointer drags against a real layout engine;
        // jsdom has neither, so the grid lifecycle is covered by the portals'
        // e2e runs rather than by a unit test that would only assert mocks.
        'src/useGridStack.ts',
      ],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
