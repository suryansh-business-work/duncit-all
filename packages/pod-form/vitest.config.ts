import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    // Vitest's 5s default is sized for a unit test. The suites here render the
    // WHOLE PodForm — a large MUI form — and then drive a three-level dependent
    // select through userEvent, which is ~1s on a dev machine and over five on a
    // two-core CI runner: PodCategoryFilter failed with "Test timed out in 5000ms"
    // on CI while passing locally every time. The race behind it is fixed
    // separately (findByRole); this is the honest cost of the render.
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
      // src/types.ts is exercised at runtime (option lists + blankPodFormValues),
      // so nothing here is type-only; only barrels/index files are excluded.
      exclude: ['src/index.ts', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
