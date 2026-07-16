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
        // App bootstrap: mounts the React tree + top-level providers (e2e covers it).
        'src/main.tsx',
        // Apollo client wiring (link callbacks only fire on a live round-trip).
        'src/apollo.ts',
        // Runtime URL config — branches switch on the build-time `DEV` flag.
        'src/config/url-configs.ts',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
      ],
      // Full 100% is enforced on every metric. The only remaining uncovered
      // lines are defensive guards that cannot be hit in a unit test (SSR
      // `typeof window`, disabled-submit early returns) and are marked inline
      // with `/* v8 ignore */` next to a one-line reason.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
});
