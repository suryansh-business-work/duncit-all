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
    // Specs live under __tests__/unit-tests; mocks under __tests__/mocks and
    // the shared render helper is __tests__/testkit.
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
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
        // Static per-portal config data.
        'src/config/app-config.ts',
        // GraphQL document modules: gql tags + type interfaces, no logic.
        'src/pages/email-templates-page/queries.ts',
        'src/pages/slack/queries.ts',
        'src/pages/whatsapp-page/**/queries.ts',
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
