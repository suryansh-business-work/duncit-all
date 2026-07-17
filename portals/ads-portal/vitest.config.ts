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
    // Vitest specs live under __tests__/unit-tests; the schema/types spec keeps
    // its co-located `.cy.tsx` name (mWeb convention) and is picked up here too.
    include: ['__tests__/unit-tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.cy.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      all: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text', 'text-summary', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // App bootstrap: mounts the React tree + wires providers (mountPortal).
        'src/main.tsx',
        // Thin Apollo client factory — link wiring only runs on a live network
        // round-trip, so it's covered by the production build + e2e, not units.
        'src/apollo.ts',
        // Runtime URL config — branches switch on the build-time `DEV` flag;
        // verified by the production build + e2e base URL, not reachable in units.
        'src/config/url-configs.ts',
        // GraphQL document module: gql tags + row/detail interfaces only, no logic.
        'src/pages/ads/queries.ts',
        // GraphQL document module: gql tag + AdsDashboardStats interface only, no logic.
        'src/pages/dashboard/queries.ts',
        // Cypress-named schema spec lives beside its form; run by vitest, not measured.
        'src/**/*.cy.{ts,tsx}',
        // Type-only declarations.
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
