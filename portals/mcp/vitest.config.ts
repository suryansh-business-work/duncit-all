import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./__tests__/unit-tests/setup.ts'],
    // The coverage run instruments every file with v8 on a shared CI box, where a
    // form that settles in a few hundred ms locally can take seconds.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Specs live under __tests__/unit-tests (mocks under __tests__/mocks, the
    // render helper is __tests__/testkit). The one exception is the form's own
    // `<form>.form.cy.tsx`, which the form-folder structure keeps beside it.
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.form.cy.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure
      // defaults to false), so one red suite would delete this workspace's lcov
      // and SonarQube would read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'text-summary', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        // React root bootstrap — mountPortal render side-effect, no unit logic.
        'src/main.tsx',
      ],
      // The SonarQube quality gate's new-code floor (85%), on all four metrics.
      // Not yet the 100% several consoles hold: these suites were written
      // without being run locally (tests run on GitHub Actions only), so the
      // floor is the gate itself. Raise it once CI reports the real figure.
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 85,
      },
    },
  },
});
