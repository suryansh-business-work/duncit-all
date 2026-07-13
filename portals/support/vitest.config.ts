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
    // Vitest specs live under __tests__/unit-tests; Cypress e2e specs under
    // __tests__/e2e are discovered separately by Cypress.
    include: ['__tests__/unit-tests/**/*.{cy,test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'cypress-artifacts/coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // App bootstrap: mounts the React tree onto the DOM and wires the
        // top-level providers. Exercised end-to-end by the cypress flows.
        'src/main.tsx',
        // Apollo client wiring (HttpLink/RetryLink/setContext) — link
        // callbacks only fire during a live network round-trip, so they are
        // validated by the cypress e2e flows, not unit tests.
        'src/apollo.ts',
        // Runtime URL config — branches switch on the build-time `DEV` flag;
        // verified by the production build + e2e base URL.
        'src/config/url-configs.ts',
        // Type-only declarations.
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
      ],
      // 100% statements + lines are enforced. The handful of uncovered
      // branches/functions are defensive guards that cannot be hit in a unit
      // test (SSR `typeof window` checks, optional chaining on framework-
      // guaranteed values, disabled-control submit guards) — those specific
      // lines carry `/* v8 ignore */` reasons, and the real user journeys are
      // additionally covered by the Cypress e2e suite. The branch/function
      // floors guard against regression well above the repo baseline.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 95,
        branches: 95,
      },
    },
  },
});
