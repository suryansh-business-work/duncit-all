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
    // The coverage run instruments every file with v8 and runs on a shared CI box:
    // a page that renders its grids and charts in about a second locally takes
    // several there, and 5 s (the default) is where it started to time out.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./__tests__/unit-tests/setup.ts'],
    // Vitest specs live under __tests__/unit-tests; entity mocks live under
    // __tests__/mocks and the shared render helper is __tests__/testkit.
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      // Always collect coverage on `vitest run` so CI's form-test job enforces
      // the thresholds below without needing a separate --coverage flag.
      enabled: true,
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite would delete this workspace's lcov and
      // SonarQube would read the silence as 0%.
      reportOnFailure: true,
      all: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'text-summary', 'json-summary', 'html', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      // This console's own source only: the Tech and Analytics files its pages
      // borrow are counted by their owning consoles' suites.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test/cypress specs + type-only declarations.
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        // React root bootstrap — mountPortal render side-effect, no unit logic.
        'src/main.tsx',
        // Thin Apollo client + session factory (delegates to @duncit/shell).
        'src/runtime.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
