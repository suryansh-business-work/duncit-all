import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      // The picker's derivations live in @duncit/utils (pod-product-picker.ts)
      // and are covered by that package's gate — every surface, native included,
      // shares them. What is left here is the MUI shell, which the portals' and
      // mWeb's Cypress flows exercise end-to-end.
      include: ['src/format.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
