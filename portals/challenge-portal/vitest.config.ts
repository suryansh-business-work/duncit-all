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
    include: ['__tests__/unit-tests/**/*.{cy,test,spec}.{ts,tsx}', 'src/**/*.cy.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: path.resolve(projectRoot, 'cypress-artifacts/coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // App bootstrap: mounts the React tree + top-level providers (e2e covers it).
        'src/main.tsx',
        // Apollo client wiring (link callbacks only fire on a live round-trip).
        'src/apollo.ts',
        // Runtime URL config — branches switch on the build-time `DEV` flag.
        'src/config/url-configs.ts',
        // GraphQL documents + TypeScript interfaces only — no runtime logic.
        'src/graphql/challenges.ts',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
      ],
      // Real 100% coverage on all four metrics. The single unreachable
      // defensive guard (empty-name submit behind a disabled button) is marked
      // with `/* v8 ignore */` at its source line with a reason.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
