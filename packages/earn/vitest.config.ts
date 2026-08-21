import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    // `*.form.cy.tsx` is the repo-wide name for a form-schema spec (rule 10),
    // which vitest's default include pattern does not match.
    include: ['__tests__/**/*.test.{ts,tsx}', 'src/**/*.form.cy.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      // Vitest writes NO coverage report when a test fails (reportOnFailure defaults
      // to false), so one red suite deleted this whole workspace's lcov and SonarQube
      // read the silence as 0%.
      reportOnFailure: true,
      // lcov is what SonarQube reads (sonar.javascript.lcov.reportPaths).
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      // Pure re-export barrels, the gql document strings and the specs themselves.
      exclude: [
        'src/index.ts',
        'src/queries.ts',
        'src/**/*.d.ts',
        'src/**/index.{ts,tsx}',
        'src/**/*.cy.{ts,tsx}',
      ],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
