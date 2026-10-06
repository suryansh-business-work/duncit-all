import { defineConfig } from 'vitest/config';

// The package is mostly Astro markup (globally coverage-excluded) and browser
// widgets. Coverage is held at 100% for the framework-free builders the
// renderer, the portal and the websites' HTML servers all share.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/cms-design.ts', 'src/site-meta.ts'],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
