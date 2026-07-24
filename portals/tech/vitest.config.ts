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
    // Vitest specs live under __tests__/unit-tests; form/entity mocks live under
    // __tests__/mocks and the shared render helper is __tests__/testkit.
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      // Always collect coverage on `vitest run` so CI's form-test job enforces
      // the thresholds below without needing a separate --coverage flag.
      enabled: true,
      provider: 'v8',
      all: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'text-summary', 'json-summary', 'html', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test/cypress specs + type-only declarations.
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        // React root bootstrap — mountPortal render side-effect, no unit logic.
        'src/main.tsx',
        // Thin Apollo client factory (delegates to @duncit/shell).
        'src/apollo.ts',
        // Static URL config gated on Vite's build-time import.meta.env.DEV.
        'src/config/url-configs.ts',
        // GraphQL document modules: gql tags + generated-shape interfaces + static
        // catalogues only, no runtime logic. (server/queries.ts is NOT listed — it
        // holds host-parsing helpers, so it stays covered.)
        'src/pages/feature-flags-page/queries.ts',
        'src/pages/portal-modes/queries.ts',
        'src/pages/email-templates-page/queries.ts',
        'src/pages/environment/queries.ts',
        'src/pages/environment/portal-env-queries.ts',
        'src/pages/slack/queries.ts',
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
